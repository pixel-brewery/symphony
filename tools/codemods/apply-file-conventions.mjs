import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { collectTypeScriptFiles } from './rewrite-imports.mjs';

const ts = createRequire(import.meta.url)('typescript');
const ROOT = process.cwd();
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

const parse = (filePath, text) =>
  ts.createSourceFile(filePath, text, ts.ScriptTarget.ES2023, true, ts.ScriptKind.TS);

/** Wraps the leading import block in `// #region Imports` and drops blank lines inside it. */
export function applyImportRegion(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = parse(filePath, text);
  const imports = sourceFile.statements.filter((statement) => ts.isImportDeclaration(statement));
  if (imports.length === 0) return false;
  if (text.includes('// #region Imports')) {
    // Region already present: only collapse blank lines inside the block.
    const start = imports[0].getStart(sourceFile);
    const end = imports.at(-1).getEnd();
    const block = text.slice(start, end).replace(/\n{2,}/g, '\n');
    if (block === text.slice(start, end)) return false;
    writeFileSync(filePath, text.slice(0, start) + block + text.slice(end), 'utf8');
    return true;
  }

  const start = imports[0].getStart(sourceFile);
  const end = imports.at(-1).getEnd();
  const block = text.slice(start, end).replace(/\n{2,}/g, '\n');
  const head = text.slice(0, start).replace(/\s*$/, '');
  const tail = text.slice(end).replace(/^\s*/, '');
  const updated = `${head}\n\n// #region Imports\n\n${block}\n\n// #endregion\n\n${tail}`;
  writeFileSync(filePath, updated, 'utf8');
  return true;
}

// Only `private` members take the `_` prefix. `protected` members stay unprefixed because
// Angular templates bind to them, and the instruction names private fields specifically.
const hasModifier = (node, kind) =>
  (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);
const isPrivate = (node) => hasModifier(node, ts.SyntaxKind.PrivateKeyword);
const isStatic = (node) => hasModifier(node, ts.SyntaxKind.StaticKeyword);

/** Prefixes private and protected fields with `_`, rewriting `this.x` references with them. */
export function applyPrivateFieldPrefix(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = parse(filePath, text);
  const edits = [];

  const visitClass = (classNode) => {
    const className = classNode.name?.text;
    const renames = new Map();
    const staticNames = new Set();
    const parameterProperties = new Set();

    for (const member of classNode.members) {
      if (!ts.isPropertyDeclaration(member) || !ts.isIdentifier(member.name)) continue;
      if (!isPrivate(member) || member.name.text.startsWith('_')) continue;
      renames.set(member.name.text, `_${member.name.text}`);
      if (isStatic(member)) staticNames.add(member.name.text);
    }
    for (const member of classNode.members)
      if (ts.isConstructorDeclaration(member))
        for (const parameter of member.parameters)
          if (
            isPrivate(parameter) &&
            ts.isIdentifier(parameter.name) &&
            !parameter.name.text.startsWith('_')
          ) {
            renames.set(parameter.name.text, `_${parameter.name.text}`);
            parameterProperties.add(parameter.name.text);
          }
    if (renames.size === 0) return;

    const rename = (node) =>
      edits.push({
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        replacement: renames.get(node.text),
      });

    const visit = (node) => {
      if (
        ts.isPropertyDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        renames.has(node.name.text) &&
        node.parent === classNode
      )
        rename(node.name);
      else if (
        ts.isParameter(node) &&
        ts.isIdentifier(node.name) &&
        isPrivate(node) &&
        renames.has(node.name.text)
      )
        rename(node.name);
      else if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.name) &&
        renames.has(node.name.text)
      ) {
        const target = node.expression;
        const viaThis = target.kind === ts.SyntaxKind.ThisKeyword;
        const viaClass = className && ts.isIdentifier(target) && target.text === className;
        if (viaThis || viaClass) rename(node.name);
      } else if (
        // A constructor parameter property is also addressable as a bare name inside the body.
        ts.isIdentifier(node) &&
        parameterProperties.has(node.text) &&
        !ts.isPropertyAccessExpression(node.parent) &&
        !ts.isPropertyAssignment(node.parent) &&
        !ts.isPropertySignature(node.parent) &&
        !(ts.isParameter(node.parent) && node.parent.name === node)
      )
        rename(node);
      ts.forEachChild(node, visit);
    };
    visit(classNode);
  };

  const walk = (node) => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) visitClass(node);
    ts.forEachChild(node, walk);
  };
  walk(sourceFile);

  if (edits.length === 0) return false;
  let updated = text;
  for (const edit of edits.sort((left, right) => right.start - left.start))
    updated = updated.slice(0, edit.start) + edit.replacement + updated.slice(edit.end);
  writeFileSync(filePath, updated, 'utf8');
  return true;
}

const VISIBILITY_ORDER = { public: 0, protected: 1, private: 2 };

function visibilityRank(member) {
  for (const modifier of ts.getModifiers(member) ?? [])
    if (modifier.kind === ts.SyntaxKind.PublicKeyword) return VISIBILITY_ORDER.public;
    else if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return VISIBILITY_ORDER.protected;
    else if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return VISIBILITY_ORDER.private;
  return VISIBILITY_ORDER.public;
}

const staticRank = (member) => (isStatic(member) ? 0 : 1);

/** Orders members public -> protected -> private, statics first, keeping source order as tiebreak. */
function orderByVisibility(members) {
  return members
    .map((member, position) => ({ member, position }))
    .sort(
      (left, right) =>
        staticRank(left.member) - staticRank(right.member) ||
        visibilityRank(left.member) - visibilityRank(right.member) ||
        left.position - right.position,
    )
    .map((entry) => entry.member);
}

/**
 * Groups class members into the mandated `Fields -> Ctor -> Properties -> Methods` regions.
 *
 * Field declaration order is only changed when no field initialiser reads another member:
 * initialisers run in declaration order, so reordering them can change behaviour.
 */
export function applyClassRegions(filePath) {
  const text = readFileSync(filePath, 'utf8');
  if (text.includes('// #region Fields') || text.includes('// #region Methods')) return false;
  const sourceFile = parse(filePath, text);
  const edits = [];

  const visitClass = (classNode) => {
    const members = classNode.members;
    if (members.length === 0) return;

    const fields = members.filter(
      (member) => ts.isPropertyDeclaration(member) || ts.isIndexSignatureDeclaration(member),
    );
    const constructors = members.filter((member) => ts.isConstructorDeclaration(member));
    const accessors = members.filter(
      (member) => ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member),
    );
    const methods = members.filter((member) => ts.isMethodDeclaration(member));
    const other = members.filter(
      (member) =>
        !fields.includes(member) &&
        !constructors.includes(member) &&
        !accessors.includes(member) &&
        !methods.includes(member),
    );
    if (fields.length + constructors.length + accessors.length + methods.length === 0) return;

    const fieldsReferenceMembers = fields.some(
      (field) => field.initializer && /\bthis\./.test(field.initializer.getText(sourceFile)),
    );
    const orderedFields = fieldsReferenceMembers ? fields : orderByVisibility(fields);

    const chunk = (member) =>
      text
        .slice(member.getFullStart(), member.getEnd())
        .replace(/^[\r\n]+/, '')
        .trimEnd();
    // Plain single-line fields sit contiguously; anything documented or multi-line keeps a
    // blank line so the block stays readable.
    const joinMembers = (list) =>
      list.map(chunk).reduce((accumulator, piece, position) => {
        if (position === 0) return piece;
        const separator = piece.includes('\n') || piece.trimStart().startsWith('/') ? '\n\n' : '\n';
        return `${accumulator}${separator}${piece}`;
      }, '');
    const region = (title, list) =>
      list.length === 0 ? null : `  // #region ${title}\n\n${joinMembers(list)}\n\n  // #endregion`;
    const regionSpaced = (title, list) =>
      list.length === 0
        ? null
        : `  // #region ${title}\n\n${list.map(chunk).join('\n\n')}\n\n  // #endregion`;

    const body = [
      region('Fields', [...orderedFields, ...other]),
      region('Ctor', constructors),
      regionSpaced('Properties', orderByVisibility(accessors)),
      regionSpaced('Methods', orderByVisibility(methods)),
    ]
      .filter(Boolean)
      .join('\n\n');

    edits.push({
      start: members[0].getFullStart(),
      end: members.at(-1).getEnd(),
      replacement: `\n${body}\n`,
    });
  };

  const walk = (node) => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) visitClass(node);
    ts.forEachChild(node, walk);
  };
  walk(sourceFile);

  if (edits.length === 0) return false;
  let updated = text;
  for (const edit of edits.sort((left, right) => right.start - left.start))
    updated = updated.slice(0, edit.start) + edit.replacement + updated.slice(edit.end);
  writeFileSync(filePath, updated, 'utf8');
  return true;
}

if (isEntryPoint) {
  const steps = {
    imports: applyImportRegion,
    fields: applyPrivateFieldPrefix,
    regions: applyClassRegions,
  };
  const selected = process.argv.slice(2).filter((argument) => steps[argument]);
  for (const step of selected.length > 0 ? selected : Object.keys(steps)) {
    let changed = 0;
    for (const file of collectTypeScriptFiles()) if (steps[step](file)) changed += 1;
    process.stdout.write(`${step}: updated ${changed} file(s)\n`);
  }
}
