#!/usr/bin/env node
// Generates per-component documentation for the Claude Design sync.
//
// Mosaik documents its components on the Lit element classes, not on the thin
// React wrappers the converter binds to, so without this step every card would
// land in one undifferentiated "general" group with a prompt synthesised from
// an empty wrapper type. This walks the foundation .d.ts tree, lifts the class
// JSDoc (description, category, slots, css parts and custom properties) and
// writes it as the doc the converter binds per component.
//
// Components are matched by element class rather than by the @element tag,
// because 42 of Mosaik's element files carry no @element tag at all.
//
// Once previews exist under .design-sync/previews/, re-running embeds each
// component's authored React example -- code that has actually been rendered
// and graded -- so the design agent reads verified usage instead of the
// element-level HTML snippets.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOUNDATION = join(
  REPO,
  '.ds-sync/scratch/node_modules/@pixel-brewery/mosaik-elements-foundation',
);
const REACT_PKG = join(REPO, '.ds-sync/scratch/node_modules/@pixel-brewery/mosaik-elements-react');
const PREVIEWS = join(REPO, '.design-sync/previews');
const OUT = join(REPO, '.design-sync/docs');

// Mosaik's own categories vary in number and casing; these are the group names
// the Design System pane will show.
const CATEGORY_ALIASES = new Map([
  ['Layout', 'Layouts'],
  ['Selector', 'Selectors'],
  ['Input', 'Inputs'],
  ['Primitive', 'Primitives'],
  ['UI Components', 'Primitives'],
  ['Misc', 'Primitives'],
  ['Display', 'Primitives'],
  ['Text', 'Primitives'],
  ['Abstract Elements', 'Primitives'],
  ['User Interface', 'Primitives'],
  ['Visual Effects', 'Effects'],
  ['Adorners', 'Effects'],
  ['Links', 'Buttons'],
  ['Cells', 'Grouping'],
  ['Interaction', 'Primitives'],
]);

const stripStars = (block) =>
  block
    .split('\n')
    .map((l) => l.replace(/^\s*\* ?/, ''))
    .join('\n');

function walk(dir, test, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, test, out);
    else if (test(entry.name)) out.push(path);
  }
  return out;
}

// React export name -> { tag, elementClass } for every wrapper, plus the
// React-only overlay providers, which document themselves.
function reactExports() {
  const found = new Map();
  for (const file of walk(REACT_PKG, (n) => n.endsWith('.js'))) {
    const src = readFileSync(file, 'utf8');

    for (const m of src.matchAll(
      /export const (\w+) = createComponent\(\{\s*tagName: '([a-z0-9-]+)',\s*displayName: '[^']*',\s*elementClass: (\w+)/g,
    )) {
      found.set(m[1], { tag: m[2], elementClass: m[3] });
    }

    for (const m of src.matchAll(/\/\*\*([\s\S]*?)\*\/\s*export function (\w+Provider)\b/g)) {
      found.set(m[2], { tag: null, elementClass: null, jsdoc: stripStars(m[1]) });
    }
  }
  return found;
}

// Element class name -> its JSDoc and source path.
function elementDocs() {
  const byClass = new Map();
  for (const file of walk(FOUNDATION, (n) => n.endsWith('.d.ts'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(
      /\/\*\*([\s\S]*?)\*\/\s*(?:export )?declare (?:abstract )?class (\w+)/g,
    )) {
      if (!byClass.has(m[2])) byClass.set(m[2], { doc: stripStars(m[1]), path: file });
    }
  }
  return byClass;
}

// Mosaik lays its sources out as Controls/Components/<Group>/..., which is the
// fallback when a component carries no @category.
const categoryFromPath = (path) => path.match(/Controls\/Components\/([^/]+)\//)?.[1] ?? null;

// Collects a JSDoc tag that may repeat, e.g. "@slot icon - The icon".
const collect = (doc, tag) =>
  [...doc.matchAll(new RegExp(`@${tag}\\s+(?:\\{[^}]*\\}\\s+)?([^\\n]+)`, 'g'))].map((m) =>
    m[1].trim(),
  );

function description(doc) {
  const explicit = doc.match(/@description\s+([\s\S]*?)(?=\n\s*@\w|$)/)?.[1];
  const lead = doc.split(/\n\s*@/)[0];
  return (explicit ?? lead).trim().replace(/\n{2,}/g, '\n\n');
}

function summary(doc) {
  const lead =
    doc
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? '';
  return lead.replace(/^[\w\s]+ - /, '');
}

const bullets = (items) => items.map((i) => `- ${i.replace(/\s+-\s+/, ' — ')}`).join('\n');

function build() {
  const exports = reactExports();
  const docs = elementDocs();
  mkdirSync(OUT, { recursive: true });

  let written = 0,
    withPreview = 0;
  const missing = [];
  const groups = new Map();

  for (const [name, info] of exports) {
    const element = info.elementClass ? docs.get(info.elementClass) : null;
    const doc = element?.doc ?? info.jsdoc;
    if (!doc) {
      missing.push(name);
      continue;
    }

    const rawCategory =
      doc.match(/@category\s+([^\n]+)/)?.[1]?.trim() ??
      (element ? categoryFromPath(element.path) : null) ??
      (info.tag === null ? 'Overlays' : 'Primitives');
    const category = CATEGORY_ALIASES.get(rawCategory) ?? rawCategory;
    groups.set(category, (groups.get(category) ?? 0) + 1);

    const usage = info.tag
      ? `Renders the \`<${info.tag}>\` Mosaik element. Import it from \`@pixel-brewery/mosaik-elements-react\` and use it as \`<${name} …/>\`; props are the element's own properties in camelCase, listed in \`${name}.d.ts\`.`
      : `A React-only helper from \`@pixel-brewery/mosaik-elements-react\` — it renders no markup of its own, it provides context to the components below it.`;

    const sections = [
      `---\ncategory: ${category}\n---`,
      `# ${name}`,
      summary(doc),
      usage,
      `## What it is\n\n${description(doc)}`,
    ];

    // Order matters: the converter truncates a doc at ~8 KB, and components with
    // a rich preview plus a long custom-property list overrun it. The verified
    // example and the slot list are what the design agent actually needs, so
    // they go first and the exhaustive property list absorbs any cut.
    const preview = join(PREVIEWS, `${name}.tsx`);
    if (existsSync(preview)) {
      sections.push(
        `## Example\n\nVerified usage from this design system's own preview:\n\n\`\`\`tsx\n${readFileSync(preview, 'utf8').trim()}\n\`\`\``,
      );
      withPreview++;
    }

    const slots = collect(doc, 'slot');
    const parts = collect(doc, 'csspart');
    const props = collect(doc, 'cssprop');

    if (slots.length)
      sections.push(
        `## Slots\n\nChildren go into the default slot unless a slot name is given.\n\n${bullets(slots)}`,
      );
    if (parts.length)
      sections.push(
        `## Styleable parts\n\nTarget with \`${info.tag}::part(name)\`.\n\n${bullets(parts)}`,
      );
    if (props.length) {
      const shown = props.slice(0, 40);
      const more = props.length - shown.length;
      sections.push(
        `## CSS custom properties\n\n${bullets(shown)}${more > 0 ? `\n- …and ${more} more, listed on the element in the Mosaik sources.` : ''}`,
      );
    }

    writeFileSync(join(OUT, `${name}.md`), sections.join('\n\n') + '\n');
    written++;
  }

  console.error(`  docs: ${written} written (${withPreview} with an authored example)`);
  if (missing.length) console.error(`  ! no doc source for: ${missing.join(', ')}`);
  console.error(
    `  groups: ${[...groups]
      .sort((a, b) => b[1] - a[1])
      .map(([g, n]) => `${g} (${n})`)
      .join(', ')}`,
  );
}

build();
