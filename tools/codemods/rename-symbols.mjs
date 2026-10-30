import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { relative, resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const ROOT = process.cwd();
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
const SCAN_ROOTS = ['apps', 'libs', 'tools'];
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', 'out', '.nx', '.git', 'coverage']);

function collectFiles(directory, accumulator) {
  for (const entry of readdirSync(directory)) {
    if (IGNORED_DIRECTORIES.has(entry)) continue;
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) collectFiles(absolute, accumulator);
    else if (entry.endsWith('.ts')) accumulator.push(absolute);
  }
  return accumulator;
}

/** Identifier occurrences that name a symbol rather than a property. */
function isRenameableOccurrence(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isQualifiedName(parent) && parent.right === node) return false;
  if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent))
    return parent.propertyName ? parent.propertyName === node : parent.name === node;
  if (
    (ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isEnumMember(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isShorthandPropertyAssignment(parent) ||
      ts.isParameter(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent)) &&
    parent.name === node
  )
    return false;
  return true;
}

function commentRanges(text) {
  const ranges = [];
  const scanner = ts.createScanner(
    ts.ScriptTarget.ES2023,
    false,
    ts.LanguageVariant.Standard,
    text,
  );
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    )
      ranges.push([scanner.getTokenPos(), scanner.getTextPos()]);
    token = scanner.scan();
  }
  return ranges;
}

/** Names the file imports, and names it declares as an interface (the real declaration site). */
function fileSymbolContext(sourceFile) {
  const imported = new Set();
  const declaredInterfaces = new Set();
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.name) imported.add(clause.name.text);
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings))
        for (const element of clause.namedBindings.elements)
          imported.add(element.propertyName?.text ?? element.name.text);
      continue;
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    )
      for (const element of statement.exportClause.elements)
        imported.add(element.propertyName?.text ?? element.name.text);
    if (ts.isInterfaceDeclaration(statement)) declaredInterfaces.add(statement.name.text);
  }
  return { imported, declaredInterfaces };
}

export function renameInFile(filePath, renameMap, { includeComments = true } = {}) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.ES2023,
    true,
    ts.ScriptKind.TS,
  );
  const { imported, declaredInterfaces } = fileSymbolContext(sourceFile);
  const applicable = new Set(
    [...renameMap.keys()].filter((name) => imported.has(name) || declaredInterfaces.has(name)),
  );
  if (applicable.size === 0) return { changed: false, count: 0 };

  const edits = [];
  const visit = (node) => {
    if (ts.isIdentifier(node) && applicable.has(node.text) && isRenameableOccurrence(node))
      edits.push({
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        replacement: renameMap.get(node.text),
      });
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);

  if (includeComments) {
    for (const [start, end] of commentRanges(text)) {
      const slice = text.slice(start, end);
      for (const name of applicable) {
        const pattern = new RegExp(`\\b${name}\\b`, 'g');
        let match;
        while ((match = pattern.exec(slice)) !== null)
          edits.push({
            start: start + match.index,
            end: start + match.index + name.length,
            replacement: renameMap.get(name),
          });
      }
    }
  }

  if (edits.length === 0) return { changed: false, count: 0 };
  edits.sort((left, right) => right.start - left.start);
  let updated = text;
  let previousStart = Number.POSITIVE_INFINITY;
  for (const edit of edits) {
    if (edit.end > previousStart) continue; // overlapping edit guard
    updated = updated.slice(0, edit.start) + edit.replacement + updated.slice(edit.end);
    previousStart = edit.start;
  }
  return { changed: updated !== text, count: edits.length, text: updated };
}

// --- CLI -------------------------------------------------------------------
const cliArguments = process.argv.slice(2);
if (isEntryPoint && cliArguments.length > 0) {
  const apply = cliArguments.includes('--apply');
  const localInterfaceMode = cliArguments.includes('--local-interfaces');
  const mapPath = cliArguments.find((argument) => !argument.startsWith('--'));
  const renameMap = localInterfaceMode
    ? new Map()
    : new Map(Object.entries(JSON.parse(readFileSync(resolve(ROOT, mapPath), 'utf8'))));
  const files = SCAN_ROOTS.filter((root) => existsSync(resolve(ROOT, root))).flatMap((root) =>
    collectFiles(resolve(ROOT, root), []),
  );
  let touchedFiles = 0;
  let totalEdits = 0;
  for (const file of files) {
    let effectiveMap = renameMap;
    if (localInterfaceMode) {
      // A file-local interface is renamed only inside its own file; a shared map would
      // corrupt an unrelated import that happens to use the same name elsewhere.
      const text = readFileSync(file, 'utf8');
      const localNames = [...text.matchAll(/^interface ([A-Za-z0-9_]+)/gm)]
        .map((match) => match[1])
        .filter((name) => !/^I[A-Z]/.test(name));
      if (localNames.length === 0) continue;
      effectiveMap = new Map(localNames.map((name) => [name, `I${name}`]));
    }
    const result = renameInFile(file, effectiveMap);
    if (!result.changed) continue;
    touchedFiles += 1;
    totalEdits += result.count;
    if (apply) writeFileSync(file, result.text, 'utf8');
    else process.stdout.write(`${relative(ROOT, file)}  ${result.count} occurrence(s)\n`);
  }
  process.stdout.write(
    `${apply ? 'renamed' : 'would rename'} ${totalEdits} occurrence(s) in ${touchedFiles} file(s)\n`,
  );
}
