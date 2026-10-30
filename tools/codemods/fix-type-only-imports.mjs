import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

/**
 * Moves names that are used as values out of a type-only import statement. Splitting a module
 * that imported the same specifier both ways can otherwise collapse both into `import type`.
 */
export function fixTypeOnlyImports(filePath, valueNames) {
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
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    if (!clause?.isTypeOnly || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings))
      continue;

    const elements = clause.namedBindings.elements;
    const moving = elements.filter((element) => valueNames.has(element.name.text));
    if (moving.length === 0) continue;

    const specifier = statement.moduleSpecifier.getText(sourceFile);
    const remaining = elements.filter((element) => !valueNames.has(element.name.text));
    const render = (list) => list.map((element) => element.getText(sourceFile)).join(', ');
    const lines = [];
    if (remaining.length > 0) lines.push(`import type { ${render(remaining)} } from ${specifier};`);
    lines.push(`import { ${render(moving)} } from ${specifier};`);
    edits.push({
      start: statement.getStart(sourceFile),
      end: statement.getEnd(),
      replacement: lines.join('\n'),
    });
  }

  if (edits.length === 0) return false;
  let updated = text;
  for (const edit of edits.sort((left, right) => right.start - left.start))
    updated = updated.slice(0, edit.start) + edit.replacement + updated.slice(edit.end);
  writeFileSync(filePath, updated, 'utf8');
  return true;
}

// --- CLI: driven by the compiler's own TS1361 diagnostics ------------------
if (isEntryPoint && process.argv.length > 2) {
  const diagnosticsText = readFileSync(process.argv[2], 'utf8');
  const byFile = new Map();
  const pattern = /((?:apps|libs|tools)\/[^\s:()]+\.ts):\d+:\d+ - error TS1361: '([^']+)'/g;
  let match;
  while ((match = pattern.exec(diagnosticsText)) !== null) {
    if (!byFile.has(match[1])) byFile.set(match[1], new Set());
    byFile.get(match[1]).add(match[2]);
  }
  let fixed = 0;
  for (const [file, names] of byFile) if (fixTypeOnlyImports(file, names)) fixed += 1;
  process.stdout.write(`fixed type-only imports in ${fixed} file(s) (${byFile.size} reported)\n`);
}
