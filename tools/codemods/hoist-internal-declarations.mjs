import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const ROOT = process.cwd();
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

/**
 * Moves file-local declarations above the exported declaration that consumes them. A split
 * module can otherwise emit a `const` after its consumer, which is a temporal-dead-zone error.
 */
export function hoistInternalDeclarations(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.ES2023,
    true,
    ts.ScriptKind.TS,
  );
  const declarations = sourceFile.statements.filter(
    (statement) => !ts.isImportDeclaration(statement),
  );
  if (declarations.length < 2) return false;

  const isExported = (statement) =>
    (ts.getModifiers(statement) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
  const exported = declarations.filter(isExported);
  const internal = declarations.filter((statement) => !isExported(statement));
  if (internal.length === 0 || exported.length === 0) return false;

  const firstExportedIndex = declarations.findIndex(isExported);
  const lastInternalIndex = declarations.map(isExported).lastIndexOf(false);
  if (lastInternalIndex < firstExportedIndex) return false;

  const head = text.slice(0, declarations[0].getFullStart());
  const chunk = (statement) =>
    text.slice(statement.getFullStart(), statement.getEnd()).replace(/^[\r\n]+/, '');
  const body = [...internal.map(chunk), ...exported.map(chunk)].join('\n\n');
  writeFileSync(filePath, `${head}${body}\n`, 'utf8');
  return true;
}

const targets = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
if (isEntryPoint && targets.length > 0) {
  let fixed = 0;
  for (const target of targets) if (hoistInternalDeclarations(target)) fixed += 1;
  process.stdout.write(`reordered ${fixed} file(s)\n`);
}
