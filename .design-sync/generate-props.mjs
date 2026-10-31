#!/usr/bin/env node
// Generates clean prop contracts for the Claude Design sync.
//
// The React wrappers type their props as Partial<Omit<ElementClass,
// keyof HTMLElement>>, so the converter's extraction faithfully reports the
// entire Lit surface -- requestUpdate, renderRoot, addController, updateComplete
// -- ahead of the handful of props anyone actually sets. The design agent reads
// that file as the API contract, so it has to be the real API.
//
// Mosaik already states that contract: every element declares an
// I<Element>Props interface, composed from small behaviour interfaces
// (ILabelableProps, IIconableProps, ...). This resolves those chains and inlines
// Mosaik's string-literal enums, then writes the result to cfg.dtsPropsFor.

import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOUNDATION = join(
  REPO,
  '.ds-sync/scratch/node_modules/@pixel-brewery/mosaik-elements-foundation',
);
const REACT_PKG = join(REPO, '.ds-sync/scratch/node_modules/@pixel-brewery/mosaik-elements-react');
const CONFIG = join(REPO, '.design-sync/config.json');

// Lit and CustomElement plumbing that is technically public but is never a prop
// anyone sets from JSX.
// Types Mosaik expresses structurally but that are, in practice, a string an
// author types. Leaving the bare name in the contract tells the design agent
// nothing about what to pass.
const TYPE_ALIASES = new Map([
  ['IconSource', 'string'],
  ['CssLength', 'string | number'],
  ['CssColor', 'string'],
  ['CssNumber', 'number | string'],
]);

const NOISE = new Set([
  'connectedCallback',
  'disconnectedCallback',
  'attributeChangedCallback',
  'adoptStyle',
  'on',
  'off',
  'emit',
  'requestUpdate',
  'renderOptions',
  'renderRoot',
  'isUpdatePending',
  'hasUpdated',
  'addController',
  'removeController',
  'updateComplete',
  'connected',
  'disconnected',
  'changed',
  'is',
]);

function walk(dir, test, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, test, out);
    else if (test(entry.name)) out.push(path);
  }
  return out;
}

const FILES = walk(FOUNDATION, (n) => n.endsWith('.d.ts'));
const SOURCE = new Map(FILES.map((f) => [f, readFileSync(f, 'utf8')]));

// Mosaik spells its enums as a frozen const object plus
// `type X = ValuesOf<typeof X>`, so the literal values live in the const.
function enumUnions() {
  const unions = new Map();
  for (const [, src] of SOURCE) {
    for (const m of src.matchAll(
      /export declare const (\w+): \{([\s\S]*?)\n\};\s*\n(?:\/\*\*[\s\S]*?\*\/\s*)?export type \1 =/g,
    )) {
      const values = [...m[2].matchAll(/readonly \w+: ("[^"]*"|\d+)/g)].map((v) => v[1]);
      if (values.length) unions.set(m[1], values.join(' | '));
    }
    // Newer types (the Flow family) are plain string-literal unions instead.
    for (const m of src.matchAll(/export type (\w+) = ((?:'[^']*'(?: \| )?)+);/g)) {
      if (!unions.has(m[1])) unions.set(m[1], m[2].replace(/'([^']*)'/g, '"$1"'));
    }
  }
  return unions;
}

// interfaceName -> { body, extends, file }
function interfaces() {
  const found = new Map();
  for (const [file, src] of SOURCE) {
    // The generic parameter list must be matched explicitly: Mosaik's behaviour
    // interfaces are generic (IValueableProps<TType = unknown>,
    // IRangeableProps<number>), and skipping them silently drops real props --
    // value, min and max never reached Slider, Numberbox or the item elements.
    for (const m of src.matchAll(
      /export interface (\w+)\s*(<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/g,
    )) {
      const start = m.index + m[0].length;
      let depth = 1,
        i = start;
      while (i < src.length && depth > 0) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') depth--;
        i++;
      }
      if (!found.has(m[1])) {
        found.set(m[1], {
          body: src.slice(start, i - 1),
          params: typeParams(m[2]),
          extends: splitTypeList(m[3] ?? ''),
          file,
        });
      }
    }
  }
  return found;
}

const UNIONS = enumUnions();
const INTERFACES = interfaces();

// Splits an interface body into members, keeping each member's JSDoc.
//
// Line-based rather than one big regex: these interfaces also declare method
// signatures (registerSlot(slotName: string, node: Element): void), and a
// regex scanning for "name: type;" happily starts matching inside a parameter
// list, producing property bodies that are not valid TypeScript.
function members(body) {
  const source = ts.createSourceFile(
    'props.ts',
    `interface Props {${body}}`,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find(ts.isInterfaceDeclaration);
  return (declaration?.members ?? []).filter(ts.isPropertySignature).flatMap((member) => {
    if (!member.type || !ts.isIdentifier(member.name)) return [];
    const doc = (member.jsDoc ?? [])
      .map((comment) =>
        typeof comment.comment === 'string'
          ? comment.comment
          : (comment.comment ?? []).map((part) => part.text).join(''),
      )
      .filter(Boolean)
      .join(' ');
    return [
      {
        name: member.name.text,
        type: member.type.getText(source).replace(/\s+/g, ' ').trim(),
        doc,
      },
    ];
  });
}

// "<TType = unknown>" -> [{ name: "TType", fallback: "unknown" }]
function typeParams(text) {
  if (!text) return [];
  return text
    .slice(1, -1)
    .split(',')
    .map((part) => {
      const [name, fallback] = part.split('=').map((s) => s.trim());
      return { name, fallback: fallback || 'unknown' };
    })
    .filter((p) => p.name);
}

// Splits "IRangeableProps<number>, IValueableProps<number>" without cutting
// inside the angle brackets.
function splitTypeList(text) {
  const out = [];
  let depth = 0,
    current = '';
  for (const ch of text) {
    if (ch === '<') depth++;
    else if (ch === '>') depth--;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

// Resolves an interface and everything it extends, binding generic arguments as
// it goes. Without the binding, props inherited from Mosaik's generic behaviour
// interfaces surface as the bare type parameter -- "value?: TType" instead of
// "value?: number", which tells the design agent nothing.
function flatten(reference, seen = new Set()) {
  const name = reference.replace(/<[\s\S]*/, '').trim();
  const argText = reference.slice(name.length).trim();
  const args = argText ? splitTypeList(argText.slice(1, -1)) : [];

  if (seen.has(name) || !INTERFACES.has(name)) return [];
  seen.add(name);

  const entry = INTERFACES.get(name);
  // An unparameterised reference still binds, to the parameter's own default.
  const binding = new Map(entry.params.map((p, i) => [p.name, args[i] ?? p.fallback]));
  const bind = (type) =>
    binding.size ? type.replace(/\b(\w+)\b/g, (w) => binding.get(w) ?? w) : type;

  return [
    ...entry.extends.flatMap((parent) => flatten(bind(parent), seen)),
    ...members(entry.body).map((m) => ({ ...m, type: bind(m.type) })),
  ];
}

// Replaces Mosaik enum names with their literal values so the design agent can
// see which values are allowed without opening another file.
const inline = (type) =>
  type.replace(/\b([A-Z]\w+)\b/g, (word) => UNIONS.get(word) ?? TYPE_ALIASES.get(word) ?? word);

function propsFor(elementClass) {
  const iface = `I${elementClass}Props`;
  const all = flatten(iface);
  if (!all.length) return null;

  const seen = new Set();
  const lines = [];
  for (const { name, type, doc } of all) {
    if (NOISE.has(name) || seen.has(name)) continue;
    seen.add(name);
    if (doc) lines.push(`/** ${doc} */`);
    lines.push(`${name}?: ${inline(type)};`);
  }
  return lines.length ? lines.join('\n') : null;
}

function build() {
  const wrappers = new Map();
  for (const file of walk(REACT_PKG, (n) => n.endsWith('.js'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(
      /export const (\w+) = createComponent\(\{\s*tagName: '[a-z0-9-]+',\s*displayName: '[^']*',\s*elementClass: (\w+)/g,
    )) {
      wrappers.set(m[1], m[2]);
    }
  }

  const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
  // componentSrcMap carries a null for every component excluded from this sync;
  // writing contracts for the other 200-odd would only bloat the config.
  const excluded = new Set(
    Object.entries(config.componentSrcMap ?? {})
      .filter(([, v]) => v === null)
      .map(([k]) => k),
  );

  const dtsPropsFor = {};
  const skipped = [];
  for (const [name, elementClass] of [...wrappers].sort()) {
    if (excluded.has(name)) continue;
    const props = propsFor(elementClass);
    if (props) dtsPropsFor[name] = props;
    else skipped.push(name);
  }

  const { componentSrcMap, ...rest } = config;
  writeFileSync(CONFIG, JSON.stringify({ ...rest, dtsPropsFor, componentSrcMap }, null, 2) + '\n');

  console.error(
    `  props: ${Object.keys(dtsPropsFor).length} contracts written, ${UNIONS.size} enums inlined`,
  );
  if (skipped.length)
    console.error(
      `  ! no props interface (converter extraction kept): ${skipped.length} — ${skipped.slice(0, 8).join(', ')}${skipped.length > 8 ? ` (+${skipped.length - 8})` : ''}`,
    );
}

build();
