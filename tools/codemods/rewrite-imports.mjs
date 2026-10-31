import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  renameSync,
} from 'node:fs';
import { relative, resolve, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const ROOT = process.cwd();
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
const SCAN_ROOTS = ['apps', 'libs', 'tools'];
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', 'out', '.nx', '.git', 'coverage']);

export function collectTypeScriptFiles() {
  const accumulator = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory)) {
      if (IGNORED_DIRECTORIES.has(entry)) continue;
      const absolute = join(directory, entry);
      if (statSync(absolute).isDirectory()) walk(absolute);
      else if (absolute.endsWith('.ts')) accumulator.push(absolute);
    }
  };
  for (const root of SCAN_ROOTS) if (existsSync(resolve(ROOT, root))) walk(resolve(ROOT, root));
  return accumulator;
}

/** Repository-relative module a relative specifier resolves to, or null for package specifiers. */
function resolveSpecifier(specifier, fromFile) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, join(base, 'index.ts'), `${base}.tsx`])
    if (existsSync(candidate)) return relative(ROOT, candidate);
  return relative(ROOT, `${base}.ts`);
}

function relativeSpecifier(fromFile, targetRepoPath) {
  const target = resolve(ROOT, targetRepoPath)
    .replace(/\.ts$/, '')
    .replace(/\/index$/, '');
  let specifier = relative(dirname(fromFile), target).split('\\').join('/');
  if (!specifier.startsWith('.')) specifier = `./${specifier}`;
  return specifier;
}

/**
 * Rewrites relative import and re-export specifiers after modules move or split.
 *
 * @param manifest - Old repository-relative module path -> { symbol: new path, '*': new path }.
 */
export function rewriteFile(filePath, manifest) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.ES2023,
    true,
    ts.ScriptKind.TS,
  );
  const edits = [];

  for (const statement of sourceFile.statements) {
    const isImport = ts.isImportDeclaration(statement);
    const isExportFrom = ts.isExportDeclaration(statement) && statement.moduleSpecifier;
    if (!isImport && !isExportFrom) continue;
    const specifierNode = statement.moduleSpecifier;
    if (!specifierNode || !ts.isStringLiteral(specifierNode)) continue;

    const resolved = resolveSpecifier(specifierNode.text, filePath);
    const entry = resolved ? manifest[resolved] : undefined;
    if (!entry) continue;

    const keyword = isImport ? 'import' : 'export';
    const typeOnly = isImport ? statement.importClause?.isTypeOnly : statement.isTypeOnly;
    const bindings = isImport ? statement.importClause?.namedBindings : statement.exportClause;

    const namedElements =
      bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))
        ? bindings.elements
        : null;

    if (!namedElements || Object.keys(entry).length === 1 || entry['*']) {
      // `export * from` / `import * as` carries the whole module: a split module needs one
      // statement per emitted file, not an arbitrary single target.
      const targets = entry['*'] ? [entry['*']] : [...new Set(Object.values(entry))];
      if (targets.length === 1) {
        edits.push({
          start: specifierNode.getStart(sourceFile),
          end: specifierNode.getEnd(),
          replacement: `'${relativeSpecifier(filePath, targets[0])}'`,
        });
        continue;
      }
      const statementText = text.slice(statement.getStart(sourceFile), statement.getEnd());
      edits.push({
        start: statement.getStart(sourceFile),
        end: statement.getEnd(),
        replacement: targets
          .map((target) =>
            statementText.replace(/'[^']+'/, `'${relativeSpecifier(filePath, target)}'`),
          )
          .join('\n'),
      });
      continue;
    }

    const byTarget = new Map();
    let unresolved = false;
    for (const element of namedElements) {
      const imported = element.propertyName?.text ?? element.name.text;
      const target = entry[imported];
      if (!target) {
        unresolved = true;
        break;
      }
      if (!byTarget.has(target)) byTarget.set(target, []);
      byTarget.get(target).push(element.getText(sourceFile));
    }
    if (unresolved) continue;

    const prefix = `${keyword}${typeOnly ? ' type' : ''}`;
    const replacement = [...byTarget]
      .map(
        ([target, names]) =>
          `${prefix} { ${names.join(', ')} } from '${relativeSpecifier(filePath, target)}';`,
      )
      .join('\n');
    edits.push({ start: statement.getStart(sourceFile), end: statement.getEnd(), replacement });
  }

  if (edits.length === 0) return false;
  let updated = text;
  for (const edit of edits.sort((left, right) => right.start - left.start))
    updated = updated.slice(0, edit.start) + edit.replacement + updated.slice(edit.end);
  writeFileSync(filePath, updated, 'utf8');
  return true;
}

/** Case-insensitive filesystems need a two-step move for case-only renames. */
export function moveFile(fromRepoPath, toRepoPath) {
  const from = resolve(ROOT, fromRepoPath);
  const to = resolve(ROOT, toRepoPath);
  if (from === to) return;
  if (from.toLowerCase() === to.toLowerCase()) {
    const staging = `${from}.__rename__`;
    renameSync(from, staging);
    renameSync(staging, to);
    return;
  }
  renameSync(from, to);
}

// --- CLI -------------------------------------------------------------------
const cliArguments = process.argv.slice(2);
if (isEntryPoint && cliArguments.length > 0) {
  const manifestPath = cliArguments.find((argument) => !argument.startsWith('--'));
  const manifest = JSON.parse(readFileSync(resolve(ROOT, manifestPath), 'utf8'));
  let touched = 0;
  for (const file of collectTypeScriptFiles()) if (rewriteFile(file, manifest)) touched += 1;
  process.stdout.write(`rewrote imports in ${touched} file(s)\n`);
}
