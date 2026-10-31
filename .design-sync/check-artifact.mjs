#!/usr/bin/env node
// Renders every preview build-artifact.mjs wrote the way the Design System page
// frames it -- tokens.css, bundle.css, React 18, bundle.js preloaded -- and
// reports page errors, cells that render nothing and Mosaik elements that never
// adopted their Soho stylesheet. Screenshots land in .ds-sync/artifact-check/.
//
//   node .design-sync/check-artifact.mjs [Name ...]

import { chromium } from 'playwright';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = join(REPO, '.ds-sync/artifact/project');
const REACT18 = join(REPO, '.ds-sync/react18/node_modules');
const OUT = join(REPO, '.ds-sync/artifact-check');

const only = process.argv.slice(2);
const names = readdirSync(join(PROJECT, 'components'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && (!only.length || only.includes(entry.name)))
  .map((entry) => entry.name)
  .filter((name) => {
    try {
      readFileSync(join(PROJECT, 'components', name, 'preview.html'));
      return true;
    } catch {
      return false;
    }
  });

// mosaik-portal declares no theme stylesheet by design: it hands its adopted
// styles on to the projection it renders elsewhere.
const THEMELESS = new Set(['mosaik-portal']);

// Image's FailedState story points at a file that does not exist on purpose.
const EXPECTED_ERRORS = [/Failed to load resource: net::ERR_FILE_NOT_FOUND/];

const href = (path) => pathToFileURL(path).href;
const preload = [
  `<link rel="stylesheet" href="${href(join(PROJECT, 'tokens.css'))}">`,
  `<link rel="stylesheet" href="${href(join(PROJECT, 'components/bundle.css'))}">`,
  `<script src="${href(join(REACT18, 'react/umd/react.production.min.js'))}"></script>`,
  `<script src="${href(join(REACT18, 'react-dom/umd/react-dom.production.min.js'))}"></script>`,
  `<script src="${href(join(PROJECT, 'components/bundle.js'))}"></script>`,
].join('\n');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];
try {
  for (const name of names) {
    const source = readFileSync(join(PROJECT, 'components', name, 'preview.html'), 'utf8');
    const framed = source
      .replace(/<html( lang="[^"]*")?>/, '<html$1 data-theme="light">')
      .replace('</head>', `${preload}\n</head>`);
    const file = join(OUT, `${name}.html`);
    writeFileSync(file, framed);

    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !EXPECTED_ERRORS.some((re) => re.test(message.text())))
        errors.push(message.text());
    });
    await page.goto(href(file));
    await page.waitForTimeout(900);
    const report = await page.evaluate(
      (themeless) => {
        const cells = [...document.querySelectorAll('[id^="r"]')].map((cell) => ({
          id: cell.id,
          text: cell.textContent.trim().slice(0, 80),
          height: cell.getBoundingClientRect().height,
        }));
        const unthemed = new Set();
        const visit = (root) => {
          for (const el of root.querySelectorAll('*')) {
            const tag = el.tagName.toLowerCase();
            if (tag.startsWith('mosaik-') && el.shadowRoot) {
              const sheets = el.shadowRoot.adoptedStyleSheets;
              if (!themeless.includes(tag) && !sheets.some((sheet) => sheet.cssRules.length))
                unthemed.add(tag);
              visit(el.shadowRoot);
            }
          }
        };
        visit(document);
        return {
          theme: document.documentElement.getAttribute('theme'),
          cells,
          unthemed: [...unthemed],
          warnings: cells.filter((c) => c.text.startsWith('⚠')).map((c) => c.text),
        };
      },
      [...THEMELESS],
    );
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    await page.close();

    const empty = report.cells.filter((cell) => cell.height < 4).map((cell) => cell.id);
    const issues = [
      ...errors.map((e) => `error: ${e}`),
      ...report.warnings.map((w) => `cell: ${w}`),
      ...(report.theme !== 'soho' ? [`document theme is ${report.theme}`] : []),
      ...(empty.length ? [`empty cells: ${empty.join(', ')}`] : []),
      ...(report.unthemed.length ? [`no Soho stylesheet: ${report.unthemed.join(', ')}`] : []),
    ];
    if (issues.length) problems.push({ name, issues });
    console.error(
      `${issues.length ? '✗' : '✓'} ${name}${issues.length ? ' — ' + issues.join(' | ') : ''}`,
    );
  }
} finally {
  await browser.close();
}

console.error(
  `\n${names.length - problems.length}/${names.length} previews clean; screenshots in ${OUT}`,
);
process.exitCode = problems.length ? 1 : 0;
