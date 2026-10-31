import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { relative, resolve, dirname, join, basename } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const ROOT = process.cwd();
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
const IGNORED = new Set(['node_modules', 'dist', 'out', '.nx', '.git', 'coverage']);
const EXPORT_PATTERN =
  /^export (?:declare )?(?:abstract )?(?:async )?(?:const|let|var|class|interface|type|enum|function) ([A-Za-z0-9_$]+)/gm;

function walk(directory, accumulator = []) {
  for (const entry of readdirSync(directory)) {
    if (IGNORED.has(entry)) continue;
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) walk(absolute, accumulator);
    else if (absolute.endsWith('.ts')) accumulator.push(absolute);
  }
  return accumulator;
}

/** symbol -> repository-relative files that declare it. */
export function buildSymbolIndex() {
  const index = new Map();
  for (const root of ['apps', 'libs']) {
    if (!existsSync(resolve(ROOT, root))) continue;
    for (const file of walk(resolve(ROOT, root))) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(EXPORT_PATTERN)) {
        if (!index.has(match[1])) index.set(match[1], []);
        index.get(match[1]).push(relative(ROOT, file));
      }
    }
  }
  return index;
}

function tsconfigPaths() {
  const configPath = resolve(ROOT, 'tsconfig.base.json');
  const parsed = ts.readConfigFile(configPath, ts.sys.readFile);
  const mapping = new Map();
  for (const [alias, targets] of Object.entries(parsed.config?.compilerOptions?.paths ?? {}))
    mapping.set(alias, targets[0]);
  return mapping;
}

function relativeSpecifier(fromFile, targetRepoPath) {
  const target = resolve(ROOT, targetRepoPath)
    .replace(/\.ts$/, '')
    .replace(/\/index$/, '');
  let specifier = relative(dirname(fromFile), target).split('\\').join('/');
  if (!specifier.startsWith('.')) specifier = `./${specifier}`;
  return specifier;
}

/** Closest owner of a symbol, preferring files near the module the import already names. */
function pickOwner(candidates, preferredDirectory) {
  if (candidates.length === 1) return candidates[0];
  const scored = candidates.map((candidate) => {
    const candidateParts = dirname(resolve(ROOT, candidate)).split('/');
    const preferredParts = preferredDirectory.split('/');
    let shared = 0;
    while (shared < candidateParts.length && candidateParts[shared] === preferredParts[shared])
      shared += 1;
    return { candidate, shared };
  });
  scored.sort(
    (left, right) => right.shared - left.shared || left.candidate.length - right.candidate.length,
  );
  return scored[0].candidate;
}

function parseDiagnostics(text) {
  const results = [];
  const patterns = [
    /((?:apps|libs|tools)\/[^\s:()]+\.ts):\d+:\d+ - error TS2305: Module '"([^"]+)"' has no exported member '([^']+)'/g,
    /((?:apps|libs|tools)\/[^\s:()]+\.ts):\d+:\d+ - error TS2724: '"([^"]+)"' has no exported member named '([^']+)'/g,
    /((?:apps|libs|tools)\/[^\s:()]+\.ts):\d+:\d+ - error TS2459: Module '"([^"]+)"' declares '([^']+)' locally, but it is not exported/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null)
      results.push({ file: match[1], specifier: match[2], symbol: match[3] });
  }
  return results;
}

/** Repoints one named import at the module that actually declares the symbol. */
function repointImport(filePath, specifier, symbol, ownerRepoPath) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.ES2023,
    true,
    ts.ScriptKind.TS,
  );
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    if (statement.moduleSpecifier.text !== specifier) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const moving = bindings.elements.filter(
      (element) => (element.propertyName?.text ?? element.name.text) === symbol,
    );
    if (moving.length === 0) continue;
    const remaining = bindings.elements.filter((element) => !moving.includes(element));
    const typeOnly = statement.importClause?.isTypeOnly ? ' type' : '';
    const render = (list) => list.map((element) => element.getText(sourceFile)).join(', ');
    const lines = [];
    if (remaining.length > 0)
      lines.push(`import${typeOnly} { ${render(remaining)} } from '${specifier}';`);
    lines.push(
      `import${typeOnly} { ${render(moving)} } from '${relativeSpecifier(filePath, ownerRepoPath)}';`,
    );
    const updated =
      text.slice(0, statement.getStart(sourceFile)) +
      lines.join('\n') +
      text.slice(statement.getEnd());
    writeFileSync(filePath, updated, 'utf8');
    return true;
  }
  return false;
}

/** Adds a missing re-export so a barrel keeps exposing a symbol that moved into a new file. */
function addBarrelReexport(barrelRepoPath, ownerRepoPath) {
  const barrel = resolve(ROOT, barrelRepoPath);
  if (!existsSync(barrel)) return false;
  const text = readFileSync(barrel, 'utf8');
  const specifier = relativeSpecifier(barrel, ownerRepoPath);
  if (text.includes(`from '${specifier}'`)) return false;
  writeFileSync(barrel, `${text.trimEnd()}\nexport * from '${specifier}';\n`, 'utf8');
  return true;
}

export function repairRound(diagnosticsText) {
  const index = buildSymbolIndex();
  const aliases = tsconfigPaths();
  let repaired = 0;
  const unresolved = [];

  for (const { file, specifier, symbol } of parseDiagnostics(diagnosticsText)) {
    const candidates = index.get(symbol);
    if (!candidates || candidates.length === 0) {
      unresolved.push(`${file}: ${symbol} (nowhere)`);
      continue;
    }

    if (specifier.startsWith('.')) {
      const preferred = dirname(resolve(dirname(resolve(ROOT, file)), specifier));
      const owner = pickOwner(candidates, preferred);
      if (repointImport(resolve(ROOT, file), specifier, symbol, owner)) repaired += 1;
      else unresolved.push(`${file}: ${symbol} (import not found)`);
      continue;
    }

    const aliasTarget = aliases.get(specifier);
    if (!aliasTarget) {
      unresolved.push(`${file}: ${symbol} (unknown alias ${specifier})`);
      continue;
    }
    const owner = pickOwner(candidates, dirname(resolve(ROOT, aliasTarget)));
    if (addBarrelReexport(aliasTarget, owner)) repaired += 1;
    else unresolved.push(`${file}: ${symbol} (barrel ${aliasTarget} unchanged)`);
  }
  return { repaired, unresolved };
}

// --- CLI -------------------------------------------------------------------
if (isEntryPoint && process.argv.length > 2) {
  const result = repairRound(readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(`repaired ${result.repaired} reference(s)\n`);
  for (const entry of [...new Set(result.unresolved)].slice(0, 20))
    process.stdout.write(`  unresolved: ${entry}\n`);
}
