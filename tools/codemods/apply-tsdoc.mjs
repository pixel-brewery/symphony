import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { collectTypeScriptFiles } from './rewrite-imports.mjs';

const ts = createRequire(import.meta.url)('typescript');
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

const ACRONYMS = new Map(
  Object.entries({
    ai: 'AI',
    ci: 'CI',
    cli: 'CLI',
    cpu: 'CPU',
    e2e: 'E2E',
    http: 'HTTP',
    id: 'ID',
    ids: 'IDs',
    ipc: 'IPC',
    json: 'JSON',
    os: 'OS',
    pr: 'PR',
    sse: 'SSE',
    sql: 'SQL',
    ui: 'UI',
    url: 'URL',
    urls: 'URLs',
    uuid: 'UUID',
    vm: 'VM',
    vms: 'VMs',
  }),
);

/** Verbs the codebase actually uses to open a method name. */
const VERBS = new Set([
  'acknowledge',
  'add',
  'append',
  'apply',
  'approve',
  'archive',
  'assign',
  'attach',
  'bind',
  'build',
  'cancel',
  'choose',
  'clear',
  'clone',
  'close',
  'collapse',
  'commit',
  'complete',
  'compute',
  'confirm',
  'connect',
  'copy',
  'count',
  'create',
  'delete',
  'derive',
  'describe',
  'detach',
  'disable',
  'disconnect',
  'discard',
  'dispatch',
  'dispose',
  'draft',
  'drop',
  'emit',
  'enable',
  'ensure',
  'escalate',
  'execute',
  'expand',
  'export',
  'fetch',
  'filter',
  'find',
  'focus',
  'format',
  'handle',
  'hide',
  'hydrate',
  'import',
  'insert',
  'inspect',
  'install',
  'initialize',
  'list',
  'load',
  'log',
  'mark',
  'match',
  'merge',
  'migrate',
  'move',
  'navigate',
  'normalize',
  'notify',
  'open',
  'parse',
  'pause',
  'pin',
  'prepare',
  'process',
  'promote',
  'provision',
  'publish',
  'pull',
  'push',
  'queue',
  'record',
  'refresh',
  'register',
  'reject',
  'release',
  'remove',
  'rename',
  'render',
  'replace',
  'report',
  'request',
  'reset',
  'resolve',
  'restore',
  'resume',
  'retry',
  'revoke',
  'run',
  'save',
  'schedule',
  'scroll',
  'seed',
  'select',
  'send',
  'serialize',
  'set',
  'show',
  'snapshot',
  'sort',
  'split',
  'start',
  'stop',
  'submit',
  'subscribe',
  'sync',
  'take',
  'teardown',
  'toggle',
  'track',
  'transform',
  'trigger',
  'unassign',
  'unpin',
  'unsubscribe',
  'update',
  'upgrade',
  'validate',
  'wrap',
]);

const MODALS = new Map([
  ['is', 'is'],
  ['has', 'has'],
  ['can', 'can'],
  ['should', 'should'],
]);

/** `workItemId` -> `work item id`; `HTTPStatus` -> `http status`. */
export function humanise(identifier) {
  return identifier
    .replace(/^_+/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
}

/** Restores acronym casing so generated prose reads like the domain language. */
export function prettify(words) {
  return words
    .split(' ')
    .map((word) => ACRONYMS.get(word) ?? word)
    .join(' ');
}

function conjugate(verb) {
  const capitalised = verb.charAt(0).toUpperCase() + verb.slice(1);
  if (/(s|x|z|ch|sh)$/.test(verb)) return `${capitalised}es`;
  if (/[^aeiou]y$/.test(verb)) return `${capitalised.slice(0, -1)}ies`;
  return `${capitalised}s`;
}

const sentence = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`.replace(/\.*$/, '.');

/** A readable one-line description derived from the member's own name. */
export function describeMember(name, kind) {
  const words = humanise(name).split(' ');
  const [first, ...rest] = words;
  const remainder = prettify(rest.join(' '));

  if (name.startsWith('ng') && /^ng[A-Z]/.test(name))
    return sentence(`angular lifecycle hook invoked ${prettify(humanise(name.slice(2)))}`);
  if (MODALS.has(first)) return sentence(`whether it ${MODALS.get(first)} ${remainder}`);
  if (first === 'on') return sentence(`handles ${remainder || 'the event'}`);

  if (kind === 'method') {
    if (name === 'transform') return 'Transforms the input value for display.';
    if (VERBS.has(first))
      return sentence(
        remainder
          ? `${conjugate(first).toLowerCase()} the ${remainder}`
          : conjugate(first).toLowerCase(),
      );
    return sentence(`returns the ${prettify(humanise(name))}`);
  }

  if (name.endsWith('Command')) return sentence(prettify(humanise(name)));
  return sentence(`the ${prettify(humanise(name))}`);
}

const modifierKinds = (node) => (ts.getModifiers(node) ?? []).map((modifier) => modifier.kind);
const isPublic = (node) =>
  !modifierKinds(node).includes(ts.SyntaxKind.PrivateKeyword) &&
  !modifierKinds(node).includes(ts.SyntaxKind.ProtectedKeyword) &&
  modifierKinds(node).includes(ts.SyntaxKind.PublicKeyword);
const isReadonly = (node) => modifierKinds(node).includes(ts.SyntaxKind.ReadonlyKeyword);

/** Existing description lines, so author prose is never replaced by a generated sentence. */
function existingDescription(node, sourceFile, text) {
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  const doc = ranges.filter((range) => text.slice(range.pos, range.pos + 3) === '/**').at(-1);
  if (!doc) return null;
  const body = text.slice(doc.pos, doc.end);
  const lines = body
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*\*ic?\s?/, '')
        .replace(/^\s*\*\s?/, '')
        .trimEnd(),
    )
    .filter((line) => !/^@/.test(line.trim()));
  const description = lines.join('\n').trim();
  return { range: doc, description: description.length > 0 ? description : null };
}

export function applyTsDoc(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.ES2023,
    true,
    ts.ScriptKind.TS,
  );
  const edits = [];

  const document = (node, kind, name) => {
    const existing = existingDescription(node, sourceFile, text);
    const indent = ' '.repeat(
      node.getStart(sourceFile) - text.lastIndexOf('\n', node.getStart(sourceFile)) - 1,
    );
    const description = existing?.description ?? describeMember(name, kind);
    const body = [
      ...description.split('\n').map((line) => (line ? `${indent} * ${line}` : `${indent} *`)),
    ];
    const tags = [];
    for (const parameter of node.parameters ?? [])
      if (ts.isIdentifier(parameter.name))
        tags.push(
          `${indent} * @param ${parameter.name.text} - ${sentence(humanise(parameter.name.text))}`,
        );
    for (const typeParameter of node.typeParameters ?? [])
      tags.push(
        `${indent} * @typeParam ${typeParameter.name.text} - ${sentence(`the ${humanise(typeParameter.name.text)} type`)}`,
      );
    tags.push(`${indent} * @public`);
    if (kind === 'accessor' || isReadonly(node)) tags.push(`${indent} * @readonly`);

    const block = [`${indent}/**`, ...body, `${indent} *`, ...tags, `${indent} */`].join('\n');
    if (existing) {
      edits.push({
        start: existing.range.pos,
        end: existing.range.end,
        replacement: block.trimStart(),
      });
      return;
    }
    // A documented member needs breathing room from the declaration above it.
    const lineStart = text.lastIndexOf('\n', node.getStart(sourceFile) - 1);
    const previousLine = text.slice(text.lastIndexOf('\n', lineStart - 1) + 1, lineStart);
    const lead =
      previousLine.trim() === '' || previousLine.trim().startsWith('// #region') ? '' : '\n';
    edits.push({
      start: node.getStart(sourceFile),
      end: node.getStart(sourceFile),
      replacement: `${lead}${lead ? indent : ''}${block.trimStart()}\n${indent}`,
    });
  };

  const visitClass = (classNode) => {
    for (const member of classNode.members) {
      if (!member.name || !ts.isIdentifier(member.name) || !isPublic(member)) continue;
      if (ts.isMethodDeclaration(member)) document(member, 'method', member.name.text);
      else if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member))
        document(member, 'accessor', member.name.text);
      else if (ts.isPropertyDeclaration(member)) document(member, 'property', member.name.text);
    }
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
  const targets = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
  const files =
    targets.length > 0
      ? targets
      : collectTypeScriptFiles().filter((file) => !file.endsWith('.spec.ts'));
  let changed = 0;
  for (const file of files) if (applyTsDoc(file)) changed += 1;
  process.stdout.write(`documented members in ${changed} file(s)\n`);
}
