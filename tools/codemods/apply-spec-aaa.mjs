import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { collectTypeScriptFiles } from './rewrite-imports.mjs';

const ts = createRequire(import.meta.url)('typescript');
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

const TEST_NAMES = new Set(['it', 'test']);

/** `it`, `test`, `it.only`, `it.each(...)` - anything that ultimately runs one test body. */
function isTestCall(node) {
  if (!ts.isCallExpression(node)) return false;
  let target = node.expression;
  while (ts.isPropertyAccessExpression(target) || ts.isCallExpression(target))
    target = ts.isCallExpression(target) ? target.expression : target.expression;
  return ts.isIdentifier(target) && TEST_NAMES.has(target.text);
}

function testBody(node) {
  const last = node.arguments.at(-1);
  if (!last) return null;
  if (
    (ts.isArrowFunction(last) || ts.isFunctionExpression(last)) &&
    last.body &&
    ts.isBlock(last.body)
  )
    return last.body;
  return null;
}

/** The value an `expect(...)` is asserting on, when it can safely become the Act statement. */
function hoistableSubject(statement, sourceFile) {
  const text = statement.getText(sourceFile);
  if (/\.(rejects|resolves)\b/.test(text)) return null;
  let expression = statement;
  if (ts.isExpressionStatement(expression)) expression = expression.expression;
  while (ts.isAwaitExpression(expression)) expression = expression.expression;
  // Walk down the assertion chain to the `expect(...)` call itself.
  let cursor = expression;
  while (ts.isCallExpression(cursor) || ts.isPropertyAccessExpression(cursor)) {
    if (
      ts.isCallExpression(cursor) &&
      ts.isIdentifier(cursor.expression) &&
      cursor.expression.text === 'expect' &&
      cursor.arguments.length === 1
    ) {
      const subject = cursor.arguments[0];
      if (
        ts.isCallExpression(subject) ||
        (ts.isAwaitExpression(subject) && ts.isCallExpression(subject.expression))
      )
        return { subject, expectCall: cursor };
      return null;
    }
    cursor = cursor.expression;
  }
  return null;
}

export function applySpecAaa(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.ES2023,
    true,
    ts.ScriptKind.TS,
  );
  const edits = [];

  const visit = (node) => {
    if (isTestCall(node)) {
      const block = testBody(node);
      if (block) annotate(block);
    }
    ts.forEachChild(node, visit);
  };

  const annotate = (block) => {
    const statements = block.statements;
    if (statements.length === 0) return;
    const blockText = block.getText(sourceFile);
    if (blockText.includes('// assert')) return;

    const indent = ' '.repeat(
      statements[0].getStart(sourceFile) -
        text.lastIndexOf('\n', statements[0].getStart(sourceFile)) -
        1,
    );
    const marker = (label, statement) =>
      edits.push({
        start: statement.getStart(sourceFile),
        end: statement.getStart(sourceFile),
        replacement: `// ${label}\n${indent}`,
      });

    const assertIndex = statements.findIndex((statement) =>
      statement.getText(sourceFile).includes('expect('),
    );
    if (assertIndex < 0) return;

    const hoistable = hoistableSubject(statements[assertIndex], sourceFile);
    const previous = assertIndex > 0 ? statements[assertIndex - 1] : null;
    // A bare call statement before the assertions is the Act. A declaration is still Arrange,
    // so the Act is then named out of the assertion itself.
    const previousIsAct = Boolean(previous && ts.isExpressionStatement(previous));

    if (assertIndex > 0) marker('arrange', statements[0]);

    if (previousIsAct) {
      marker('act', previous);
      marker('assert', statements[assertIndex]);
      return;
    }

    if (hoistable) {
      const subjectText = hoistable.subject.getText(sourceFile);
      const name = blockText.includes('const actual') ? 'actualValue' : 'actual';
      edits.push({
        start: statements[assertIndex].getStart(sourceFile),
        end: statements[assertIndex].getStart(sourceFile),
        replacement: `// act\n${indent}const ${name} = ${subjectText};\n\n${indent}// assert\n${indent}`,
      });
      edits.push({
        start: hoistable.subject.getStart(sourceFile),
        end: hoistable.subject.getEnd(),
        replacement: name,
      });
      return;
    }

    if (previous) marker('act', previous);
    marker('assert', statements[assertIndex]);
    return;
  };

  ts.forEachChild(sourceFile, visit);
  if (edits.length === 0) return false;
  let updated = text;
  for (const edit of edits.sort((left, right) => right.start - left.start || right.end - left.end))
    updated = updated.slice(0, edit.start) + edit.replacement + updated.slice(edit.end);
  writeFileSync(filePath, updated, 'utf8');
  return true;
}

if (isEntryPoint) {
  const targets = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
  const files =
    targets.length > 0
      ? targets
      : collectTypeScriptFiles().filter((file) => file.endsWith('.spec.ts'));
  let changed = 0;
  for (const file of files) if (applySpecAaa(file)) changed += 1;
  process.stdout.write(`annotated ${changed} spec file(s)\n`);
}
