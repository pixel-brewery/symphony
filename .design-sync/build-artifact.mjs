#!/usr/bin/env node
// Builds the files of the "Symphony Design System" artifact -- the claude.ai
// Design System artifact that Design canvases copy -- from the scratch install.
//
// Run it after the setup and generators, from the repository root:
//
//   node .design-sync/setup-scratch.mjs
//   node .design-sync/generate-docs.mjs
//   node .design-sync/generate-props.mjs
//   node .design-sync/build-artifact.mjs [--index <design-system.json read from the artifact>]
//   node .design-sync/check-artifact.mjs
//
// Everything lands in .ds-sync/artifact/project/ at the path the artifact
// serves it under (project/<path>), so the folder is published as it is:
//
//   components/bundle.js        one classic script assigning window.Mosaik
//   components/bundle.css       Symphony's compiled Soho stylesheet
//   components/index.d.ts       every card's props, plus the provider
//   components/<Name>/…         README.md, <Name>.d.ts and preview.html per card
//   components/Cover/           the Overview cover
//   tokens.json, tokens.css     read from the rendered Soho theme, light and dark
//   fonts/, assets/Licenses/    the Inter files Symphony ships, with their licence
//   README.md                   conventions.md plus the generated index
//   design-system.json          only with --index, merged into the artifact's own
//
// The tokens are measured, not transcribed: a headless Chromium renders the
// bundle inside SymphonyThemeProvider and reads back every --mosaik-* custom
// property ThemeService wrote, so they can never drift from what the
// components actually paint.

import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = join(REPO, '.ds-sync/scratch');
const PKG_DIR = join(SCRATCH, 'node_modules/@pixel-brewery/mosaik-elements-react');
const REACT18 = join(REPO, '.ds-sync/react18/node_modules');
const PREVIEWS = join(REPO, '.design-sync/previews');
const DOCS = join(REPO, '.design-sync/docs');
const FONTS = join(REPO, 'resources/fonts');
const OUT = join(REPO, '.ds-sync/artifact');
const PROJECT = join(OUT, 'project');

const TITLE = 'Symphony Design System';
const NAMESPACE = 'Mosaik';
const PACKAGE = '@pixel-brewery/mosaik-elements-react';
const BUNDLE_LIMIT = 6 * 1024 * 1024;
const INTER_WEIGHTS = [300, 400, 500, 600, 700];

const cfg = JSON.parse(readFileSync(join(REPO, '.design-sync/config.json'), 'utf8'));
const git = (...args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
const REF = `${git('rev-parse', '--abbrev-ref', 'HEAD')}@${git('rev-parse', '--short', 'HEAD')}`;
const VERSION = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8')).version;

const write = (path, content) => {
  const file = join(PROJECT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

// #region Inventory

// A card is a component with an authored preview. The bundle exports more than
// that (Theme2, MosaikProvider, the provider itself), but only cards are listed
// in the bundle header, which is what the Design System page catalogues.
const CARDS = readdirSync(PREVIEWS)
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => name.slice(0, -4))
  .sort();

function readDoc(name) {
  const file = join(DOCS, `${name}.md`);
  if (!existsSync(file)) throw new Error(`no generated doc for ${name}; run generate-docs.mjs`);
  const text = readFileSync(file, 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const category = match ? /category:\s*(.+)/.exec(match[1])?.[1].trim() : undefined;
  return { category: category ?? 'Components', body: match ? text.slice(match[0].length) : text };
}

const DOCS_BY_CARD = new Map(CARDS.map((name) => [name, readDoc(name)]));

// #endregion

// #region Bundle

// React is not bundled: the artifact's preview frames and every Design canvas
// load React 18 as window.React / window.ReactDOM, and a second copy could not
// share hooks with theirs. The jsx runtime is shimmed over createElement.
const JSX_SHIM = `
var R = window.React;
function np(p, k) { var o = {}; for (var x in p) if (x !== 'children') o[x] = p[x]; if (k !== void 0) o.key = k; return o; }
function jsx(t, p, k) { var c = p && p.children; return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c); }
function jsxs(t, p, k) { return R.createElement.apply(R, [t, np(p, k)].concat(p.children)); }
module.exports = { jsx: jsx, jsxs: jsxs, jsxDEV: function (t, p, k, s) { return (s ? jsxs : jsx)(t, p, k); }, Fragment: R.Fragment };
`;

const browserGlobals = (extra = {}) => ({
  name: 'browser-globals',
  setup(b) {
    const modules = {
      react: 'module.exports = window.React;',
      'react-dom': 'module.exports = window.ReactDOM;',
      'react-dom/client': 'module.exports = window.ReactDOM;',
      'react/jsx-runtime': JSX_SHIM,
      'react/jsx-dev-runtime': JSX_SHIM,
      ...extra,
    };
    const filter = new RegExp(
      `^(${Object.keys(modules)
        .map((m) => m.replace(/[/\\^$*+?.()|[\]{}-]/g, '\\$&'))
        .join('|')})$`,
    );
    b.onResolve({ filter }, (args) => ({ path: args.path, namespace: 'browser-global' }));
    b.onLoad({ filter: /.*/, namespace: 'browser-global' }, (args) => ({
      contents: modules[args.path],
      loader: 'js',
    }));
  },
});

// Every Mosaik element imports one stylesheet per theme (Joy, Memphis,
// Cosmopolitan, Soho) and picks one at runtime. Symphony renders Soho only, and
// the other three are roughly three quarters of the element code: with them the
// bundle is 7.9 MB against the artifact's 6 MB limit. Each unused theme module
// exports a single style function, so it is replaced by one returning no CSS.
const UNUSED_THEME = /[\\/]themes[\\/][^\\/]+\.(Joy|Memphis|Cosmopolitan|Fluent)\.js$/;

const sohoOnly = (stats) => ({
  name: 'soho-only',
  setup(b) {
    b.onLoad({ filter: UNUSED_THEME }, (args) => {
      const source = readFileSync(args.path, 'utf8');
      const exported = [...source.matchAll(/^export (\w+) (\w+)/gm)];
      const cssImport = /^import \{ css \} from '[^']+';$/m.exec(source)?.[0];
      if (!cssImport || exported.some(([, kind]) => kind !== 'function')) return undefined;
      stats.stubbed++;
      return {
        contents: [
          cssImport,
          ...exported.map(([, , name]) => `export function ${name}() { return css\`\`; }`),
        ].join('\n'),
        loader: 'js',
        resolveDir: dirname(args.path),
      };
    });
  },
});

// A literal "</script" or "<!--" would end or escape the inline <script> a
// consumer may put the bundle in. Mosaik's only occurrences are HTML comments
// inside Lit templates, where \x3C is the same "<" once the literal is cooked.
const escapeInline = (code) => code.replace(/<(!--|\/script)/gi, '\\x3C$1');

function assertInlineSafe(label, code) {
  for (const needle of ['</script', '<!--'])
    if (code.toLowerCase().includes(needle))
      throw new Error(`${label} contains a literal ${needle}`);
}

async function buildBundle() {
  const header = {
    format: 4,
    namespace: NAMESPACE,
    components: CARDS.map((name) => ({ name })),
  };
  const stats = { stubbed: 0 };
  const result = await build({
    entryPoints: [join(PKG_DIR, '_symphony-entry.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: '__mosaik',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
    plugins: [browserGlobals(), sohoOnly(stats)],
    banner: { js: `/* @ds-bundle: ${JSON.stringify(header)} */` },
    footer: { js: `window.${NAMESPACE}=__mosaik;` },
    logLevel: 'warning',
  });
  const code = escapeInline(result.outputFiles[0].text);
  assertInlineSafe('bundle.js', code);
  if (code.length > BUNDLE_LIMIT)
    throw new Error(`bundle.js is ${(code.length / 1048576).toFixed(2)} MB, over the 6 MB limit`);
  write('components/bundle.js', code);
  console.error(
    `  bundle.js: ${(code.length / 1048576).toFixed(2)} MB, ${CARDS.length} cards, ${stats.stubbed} non-Soho stylesheets left out`,
  );
}

// #endregion

// #region Stylesheet and fonts

// The compiled stylesheet declares Inter against Symphony's resources/ path.
// In the artifact the faces come from tokens.json (tokens.css writes their
// @font-face), so they are declared once, there.
function buildStylesheet() {
  const css = readFileSync(join(PKG_DIR, '_symphony.css'), 'utf8').replace(
    /@font-face\{[^}]*font-weight:(\d+)[^}]*\}/g,
    (_, weight) =>
      `/* @font-face Inter ${weight} normal: declared by tokens.json (fonts/inter-latin-${weight}-normal.woff2) */\n`,
  );
  if (/url\(/.test(css))
    throw new Error('bundle.css still references a url(); check the stylesheet');
  if (/<\/style/i.test(css)) throw new Error('bundle.css contains a literal </style');
  write(
    'components/bundle.css',
    `/* Symphony's renderer stylesheet (Soho, Mosaik ${VERSION}), compiled from apps/renderer/src/styles.scss. */\n${css}`,
  );
}

function copyFonts() {
  for (const weight of INTER_WEIGHTS) {
    const name = `inter-latin-${weight}-normal.woff2`;
    mkdirSync(join(PROJECT, 'fonts'), { recursive: true });
    copyFileSync(join(FONTS, name), join(PROJECT, 'fonts', name));
  }
  mkdirSync(join(PROJECT, 'assets/Licenses'), { recursive: true });
  copyFileSync(
    join(FONTS, 'Inter-LICENSE.txt'),
    join(PROJECT, 'assets/Licenses/Inter-LICENSE.txt'),
  );
}

// #endregion

// #region Measured theme

// Renders the bundle inside SymphonyThemeProvider in each mode and reads back
// every --mosaik-* custom property ThemeService wrote onto the document.
async function measureTheme() {
  const probe = join(OUT, 'probe.html');
  const rel = (path) => pathToFileURL(path).href;
  writeFileSync(
    probe,
    `<!doctype html><html><head><meta charset="utf-8">
<script src="${rel(join(REACT18, 'react/umd/react.production.min.js'))}"></script>
<script src="${rel(join(REACT18, 'react-dom/umd/react-dom.production.min.js'))}"></script>
<script src="${rel(join(PROJECT, 'components/bundle.js'))}"></script>
</head><body><div id="root"></div><script>
var root = ReactDOM.createRoot(document.getElementById('root'));
window.measure = function (mode) {
  return new Promise(function (resolve) {
    root.render(React.createElement(Mosaik.SymphonyThemeProvider, { mode: mode, key: mode },
      React.createElement(Mosaik.Button, { label: 'Probe' })));
    setTimeout(function () {
      var cs = getComputedStyle(document.documentElement), vars = {};
      for (var i = 0; i < cs.length; i++)
        if (cs[i].indexOf('--mosaik-') === 0) vars[cs[i].slice(2)] = cs.getPropertyValue(cs[i]).trim();
      resolve(vars);
    }, 500);
  });
};
</script></body></html>`,
  );

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(probe).href);
    // An export that resolves to undefined bundles silently (a TypeScript
    // re-export may be type-only), so every card must exist on the global.
    const missing = await page.evaluate(
      (names) => names.filter((name) => typeof window.Mosaik[name] === 'undefined'),
      [...CARDS, 'SymphonyThemeProvider'],
    );
    if (missing.length) throw new Error(`window.${NAMESPACE} lacks ${missing.join(', ')}`);
    const light = await page.evaluate(() => window.measure('light'));
    const dark = await page.evaluate(() => window.measure('dark'));
    if (errors.length) throw new Error(`bundle failed in the browser: ${errors.join('; ')}`);
    if (Object.keys(light).length < 100) throw new Error('the provider wrote no theme variables');
    return { light, dark };
  } finally {
    await browser.close();
    rmSync(probe, { force: true });
  }
}

// #endregion

// #region Tokens

// Role descriptions follow DESIGN.md, which documents Symphony's use of Soho.
const SCHEME_NOTES = {
  surface: 'Elevated surfaces: cards, dialogs, panels.',
  background: 'Page canvas and the default component fill.',
  foreground:
    'Default text and icon color, on `mosaik-scheme-background` and `mosaik-scheme-surface`.',
  highlight: 'Borders, dividers and hover fills.',
  middlelight:
    'Medium contrast: strokes, dividers, inactive marks and quiet fills. Soho keeps it at least 3:1 on the background; it is not a body-text colour.',
  lowlight:
    'The stronger secondary grey: secondary text, placeholders, captions and hints, on `mosaik-scheme-background` and `mosaik-scheme-surface`.',
  transparent: 'Fully transparent fill.',
  'semi-transparent':
    'The black-at-50 % scrim behind modal overlays (dialogs, sheets, drawers); never a chrome or surface fill.',
  disabled: 'Disabled text and controls; exempt from text-contrast minimums.',
  contrast: 'Content on strongly coloured fills, such as the label of a solid primary button.',
  selection: 'Text selection background.',
};

const FAMILY_NOTES = {
  primary: 'the action colour: near-black in light mode, near-white in dark',
  secondary: 'Soho teal, a derived accent; not a neutral chrome colour',
  tertiary: 'Soho orange, a derived accent; not a neutral chrome colour',
  highlight: 'Soho violet, a derived accent',
  info: 'informational status',
  warning: 'warning status',
  danger: 'destructive actions and errors',
  success: 'success status',
  neutral: 'greys for chrome, quiet fills and borders',
};

const TYPE_NOTES = {
  headline1: 'Largest display heading; rare in product UI.',
  headline2: 'Display heading.',
  headline3: 'Page title on marketing-like surfaces.',
  headline4: 'Page title.',
  headline5: 'Section and dialog titles.',
  headline6: 'Card and panel titles.',
  subtitle1: 'Emphasised 16px labels and list titles.',
  subtitle2: 'Emphasised 14px labels: row titles, field labels, navigation items.',
  body1: 'Long-form reading text.',
  body2: 'Default UI copy: the 14px text every control and most screens use.',
  supporting: 'Supporting copy beside a primary line.',
  caption: 'Metadata, timestamps and hints.',
  overline: 'Section labels above groups.',
  button: 'Button labels.',
};

const ELEVATION_NOTES = {
  none: 'No shadow: chrome bands such as the title bar.',
  light: 'shadow-xs: controls and cards.',
  semilight: 'shadow-sm.',
  regular: 'shadow-md: popovers and menus.',
  semibold: 'shadow-lg: dialogs and sheets.',
  bold: 'shadow-xl.',
  extrabold: 'shadow-2xl.',
};

const DURATION_NOTES = {
  short: 'Hover, focus and colour transitions; the default transition-duration of components.',
  medium: 'Expand, collapse and reveal.',
  long: 'Page-level and staged motion.',
};

function parseColor(value) {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const [r, g, b, a = 1] = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return [r, g, b, a];
  }
  return undefined;
}

function contrast(fg, bg) {
  const lum = ([r, g, b]) =>
    [r, g, b]
      .map((c) => c / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const normalizeColor = (value) => (/^#/.test(value) ? value.toLowerCase() : value);

function buildTokens({ light, dark }) {
  const modes = { light, dark };
  const pick = (name) => ({ light: normalizeColor(light[name]), dark: normalizeColor(dark[name]) });

  const ratio = (role, ground, mode) => {
    const fg = parseColor(modes[mode][`mosaik-scheme-${role}`]);
    const bg = parseColor(modes[mode][`mosaik-scheme-${ground}`]);
    return fg && bg && fg[3] === 1 && bg[3] === 1 ? contrast(fg, bg) : undefined;
  };
  const contrastNote = (role) => {
    const parts = ['light', 'dark'].map((mode) => {
      const values = ['background', 'surface'].map((ground) => ratio(role, ground, mode));
      return `${mode} ${Math.min(...values).toFixed(1)}:1`;
    });
    return ` Measured contrast on background and surface: ${parts.join(', ')}.`;
  };

  const color = [];
  for (const role of Object.keys(SCHEME_NOTES)) {
    const name = `mosaik-scheme-${role}`;
    if (!(name in light)) throw new Error(`theme wrote no --${name}`);
    const textRole = ['foreground', 'lowlight', 'middlelight'].includes(role);
    color.push({
      name,
      value: pick(name),
      usage: SCHEME_NOTES[role] + (textRole ? contrastNote(role) : ''),
    });
  }
  for (const family of Object.keys(FAMILY_NOTES)) {
    const stops = Object.keys(light)
      .map((name) => new RegExp(`^mosaik-color-${family}-(\\d+)$`).exec(name)?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);
    for (const stop of stops) {
      const name = `mosaik-color-${family}-${stop}`;
      const base = stop === 500 ? ' The family base.' : '';
      color.push({
        name,
        value: pick(name),
        usage: `The ${family} ramp at stop ${stop}: ${FAMILY_NOTES[family]}.${base} Components choose the stop per appearance and state; reach for a variant before a raw stop.`,
      });
    }
  }

  const levels = Object.keys(ELEVATION_NOTES);
  const shadow = levels.map((level) => ({
    name: `mosaik-elevation-${level}`,
    value: pick(`mosaik-elevation-${level}`),
    usage: ELEVATION_NOTES[level],
  }));

  const fontFamily = light['mosaik-font-family'];
  const roles = Object.keys(TYPE_NOTES);
  const styles = roles.map((role) => {
    const v = (prop) => light[`mosaik-typography-${role}-${prop}`];
    const style = {
      name: `mosaik-typography-${role}`,
      fontSize: v('font-size'),
      lineHeight: v('line-height'),
      fontWeight: Number(v('font-weight')),
      usage: TYPE_NOTES[role],
    };
    if (v('letter-spacing') && v('letter-spacing') !== 'normal')
      style.letterSpacing = v('letter-spacing');
    return style;
  });

  return {
    name: TITLE,
    version: 1,
    color: {
      themes: [
        { id: 'light', name: 'Light' },
        { id: 'dark', name: 'Dark' },
      ],
      tokens: color,
    },
    type: {
      fonts: INTER_WEIGHTS.map((weight) => ({
        family: 'Inter',
        file: `fonts/inter-latin-${weight}-normal.woff2`,
        weight: String(weight),
        style: 'normal',
      })),
      families: {
        sans: fontFamily,
        mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      },
      groups: [{ name: 'Soho', family: 'sans', styles }],
    },
    spacing: {
      tokens: [
        {
          name: 'mosaik-layout-space',
          value: light['mosaik-layout-space'],
          usage: 'Base unit of every padding, gap and margin; components scale it with calc().',
        },
      ],
    },
    radius: {
      tokens: [
        {
          name: 'mosaik-layout-radius',
          value: light['mosaik-layout-radius'],
          usage: 'Corner radius of every rectangular surface: cards, inputs, menus.',
        },
      ],
    },
    shadow: { tokens: shadow },
    thickness: {
      tokens: [
        {
          name: 'mosaik-layout-thickness',
          value: light['mosaik-layout-thickness'],
          usage: 'Border width of controls, dividers and indicators.',
        },
      ],
    },
    duration: {
      tokens: Object.keys(DURATION_NOTES).map((step) => ({
        name: `mosaik-duration-${step}`,
        value: light[`mosaik-duration-${step}`],
        usage: DURATION_NOTES[step],
      })),
    },
    meta: {
      source: 'github',
      repo: 'RueDeRennes/symphony',
      ref: REF,
      package: `${PACKAGE}@${VERSION}`,
      theme: `@pixel-brewery/mosaik-themes@${VERSION} (Soho)`,
      paths: {
        tokens: [
          'apps/renderer/src/configuration/ShellConfig.ts',
          'libs/frontend/ui/src/lib/theme/ApplicationThemeOverrides.ts',
        ],
        fonts: ['resources/fonts'],
        docs: ['.design-sync/conventions.md', 'DESIGN.md'],
      },
      measured: 'Values are read from the rendered SymphonyThemeProvider in light and dark mode.',
      synced: new Date().toISOString().slice(0, 10),
    },
  };
}

// tokens.css as the Design System type compiles it (format.md, "tokens.css as
// compiled"); the page only takes over a file whose first comment ends with
// "generated from tokens.json".
function tokensCss(tokens) {
  const decl = (name, value) => `  --${name}: ${value};`;
  const themed = [...tokens.color.tokens, ...tokens.shadow.tokens];
  const lines = [`/* ${TITLE} — generated from tokens.json */`];
  for (const [index, theme] of tokens.color.themes.entries()) {
    lines.push(
      index === 0 ? `:root, [data-theme="${theme.id}"] {` : `[data-theme="${theme.id}"] {`,
    );
    for (const token of themed) lines.push(decl(token.name, token.value[theme.id]));
    lines.push('}');
  }
  lines.push(':root {');
  for (const family of ['spacing', 'radius', 'thickness', 'duration'])
    for (const token of tokens[family].tokens) lines.push(decl(token.name, token.value));
  for (const [key, stack] of Object.entries(tokens.type.families))
    lines.push(decl(`font-${key}`, stack));
  lines.push('}');
  for (const group of tokens.type.groups)
    for (const style of group.styles) {
      lines.push(`.${style.name} {`);
      lines.push(`  font-family: var(--font-${style.family ?? group.family});`);
      lines.push(`  font-size: ${style.fontSize};`);
      lines.push(`  line-height: ${style.lineHeight};`);
      lines.push(`  font-weight: ${style.fontWeight};`);
      if (style.letterSpacing) lines.push(`  letter-spacing: ${style.letterSpacing};`);
      lines.push('}');
    }
  for (const font of tokens.type.fonts)
    lines.push(
      '@font-face {',
      `  font-family: "${font.family}";`,
      `  src: url("${font.file}") format("woff2");`,
      `  font-weight: ${font.weight};`,
      `  font-style: ${font.style};`,
      '  font-display: swap;',
      '}',
    );
  return lines.join('\n') + '\n';
}

// #endregion

// #region Component cards

const PREVIEW_STYLE = `body{margin:0;padding:24px;background:var(--mosaik-scheme-background,#fff)}
    .ds-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;align-items:start}
    .ds-grid.ds-col{grid-template-columns:1fr}
    .ds-cell{border:1px solid var(--mosaik-scheme-highlight,#e5e5e5);border-radius:10px;padding:12px;min-width:0;overflow:hidden;transform:translateZ(0)}
    .ds-cell>h4{margin:0 0 8px;font:500 12px/16px Inter,ui-sans-serif,system-ui,sans-serif;color:var(--mosaik-scheme-lowlight,#525252);text-transform:uppercase;letter-spacing:.04em}
    .ds-single{transform:translateZ(0)}`;

// Mounts every PascalCase export of the compiled preview in its own cell, each
// inside the provider; ?story=<Name> renders one. cardMode "column" stacks the
// cells, "single" shows only the primary story (for full-frame overlays).
const previewRunner = (name, mode, primary) => `
    var h=React.createElement, g=document.getElementById('g');
    var E=[]; for (var k in (window.__dsPreview||{})) {
      if (typeof window.__dsPreview[k]==='function' && /^[A-Z]/.test(k)) E.push(k);
    }
    window.__dsCells=E.slice();
    var q=null; try{q=new URLSearchParams(location.search).get('story')}catch(e){}
    var MODE=${JSON.stringify(mode)}, PRIMARY=${JSON.stringify(primary)};
    window.__dsMode=MODE;
    if(MODE==='column'){
      g.className+=' ds-col';
      var cpi=PRIMARY?E.indexOf(PRIMARY):-1;
      if(cpi>0){E.splice(cpi,1);E.unshift(PRIMARY)}
    }
    function mount(id,key){try{ReactDOM.createRoot(document.getElementById(id)).render(h(window.Mosaik.SymphonyThemeProvider,{},h(window.__dsPreview[key])))}catch(e){document.getElementById(id).textContent='⚠ '+(e&&e.message||e)}}
    var pick=null;
    if(q){for(var j=0;j<E.length;j++){if(E[j]===q||E[j].toLowerCase()===q.toLowerCase()){pick=E[j];break}}}
    else if(MODE==='single'&&E.length){pick=E.indexOf(PRIMARY)>=0?PRIMARY:E[0]}
    if(q&&!pick){g.textContent='⚠ no export named '+q}
    else if(pick){
      var s=document.createElement('div'); s.className='ds-single'; s.id='r0';
      if(!q)document.body.style.padding='0';
      g.parentNode.replaceChild(s,g); mount('r0',pick);
    } else {
      for(var i=0;i<E.length;i++){
        var cell=document.createElement('section'); cell.className='ds-cell';
        cell.innerHTML='<h4>'+E[i]+'</h4><div id="r'+i+'"></div>'; g.appendChild(cell);
        mount('r'+i,E[i]);
      }
      if(E.length===0){g.textContent='⚠ no PascalCase exports in ${name}'}
    }
  `;

async function buildPreview(name) {
  const result = await build({
    entryPoints: [join(PREVIEWS, `${name}.tsx`)],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: '__dsPreview',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    plugins: [browserGlobals({ [PACKAGE]: `module.exports = window.${NAMESPACE};` })],
    logLevel: 'warning',
  });
  const script = escapeInline(result.outputFiles[0].text);
  assertInlineSafe(`${name} preview`, script);
  const { cardMode = 'grid', primaryStory = '' } = cfg.overrides?.[name] ?? {};
  const { category } = DOCS_BY_CARD.get(name);
  write(
    `components/${name}/preview.html`,
    `<!-- @dsCard group="${category}" -->
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
  <style>
    ${PREVIEW_STYLE}
  </style>
</head><body>
  <div class="ds-grid" id="g"></div>
<script>${script}</script>
<script>${previewRunner(name, cardMode, primaryStory)}</script>
</body></html>
`,
  );
}

// The React wrappers type their props as the whole Lit element; the clean
// contract generate-props.mjs wrote to cfg.dtsPropsFor is the real API.
function propsInterface(name) {
  const contract = cfg.dtsPropsFor?.[name]?.trim();
  const body = contract ? contract : '';
  const children = /(^|\n)children\?:/.test(body) ? '' : '\nchildren?: React.ReactNode;';
  return `export interface ${name}Props {\n${body}${children}\n}`;
}

function componentTypes(name) {
  return [
    `/**`,
    ` * ${name} — from ${PACKAGE}@${VERSION}.`,
    ` */`,
    propsInterface(name),
    '',
    `export declare const ${name}: React.ComponentType<${name}Props>;`,
  ].join('\n');
}

function componentReadme(name) {
  const { body } = DOCS_BY_CARD.get(name);
  const text = body.replace(/^# .+\n+/, '');
  const [summary, ...rest] = text.split(/\n\n/);
  return [
    `# ${name}`,
    '',
    summary.trim(),
    '',
    `Use it as \`window.${NAMESPACE}.${name}\`, on a Design canvas as \`<x-import component-from-global-scope="${NAMESPACE}.${name}">\`, always inside \`${NAMESPACE}.SymphonyThemeProvider\`.`,
    '',
    rest.join('\n\n').trim(),
    '',
    '## Props',
    '',
    '```ts',
    propsInterface(name).replace(/^export /, ''),
    '```',
    '',
  ].join('\n');
}

async function buildCards() {
  for (const name of CARDS) {
    await buildPreview(name);
    write(`components/${name}/README.md`, componentReadme(name));
    write(
      `components/${name}/${name}.d.ts`,
      `import * as React from 'react';\n\n${componentTypes(name)}\n`,
    );
  }

  const providerTypes = [
    `/**`,
    ` * Wraps every Symphony screen: installs the Soho theme under its own scope,`,
    ` * registers Symphony's icons and sets the document's light or dark mode.`,
    ` */`,
    `export interface SymphonyThemeProviderProps {`,
    `children?: React.ReactNode;`,
    `/** Symphony's colour mode; defaults to the page's data-theme (light or dark). */`,
    `mode?: 'light' | 'dark';`,
    `}`,
    '',
    `export declare const SymphonyThemeProvider: React.ComponentType<SymphonyThemeProviderProps>;`,
    '',
    `/** The Soho theme object the provider applies. */`,
    `export declare const SYMPHONY_THEME: Record<string, unknown>;`,
  ].join('\n');
  write(
    'components/index.d.ts',
    [
      `// ${TITLE}: window.${NAMESPACE}, built from ${PACKAGE}@${VERSION}.`,
      `import * as React from 'react';`,
      '',
      providerTypes,
      '',
      ...CARDS.map((name) => componentTypes(name) + '\n'),
    ].join('\n'),
  );
}

// #endregion

// #region README

function symphonyIconNames() {
  const source = readFileSync(join(REPO, '.design-sync/provider/SymphonyIcons.ts'), 'utf8');
  const body = source.slice(source.indexOf('SYMPHONY_ICONS = {'));
  return [...body.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]).sort((a, b) => a.localeCompare(b));
}

// conventions.md lists the icon vocabulary by hand for readers of the
// repository; fail rather than publish a list that has drifted from ShellConfig.
function assertIconList(conventions, icons) {
  const block = /### Icons are a fixed vocabulary[\s\S]*?\n`([^`]*,[^`]*)`/.exec(conventions)?.[1];
  const listed = (block ?? '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  if (listed.join() !== icons.join())
    throw new Error(
      `conventions.md icon list drifted from ShellConfig.ts: expected ${icons.join(', ')}`,
    );
}

function buildReadme() {
  const conventions = readFileSync(join(REPO, cfg.readmeHeader), 'utf8').trim();
  assertIconList(conventions, symphonyIconNames());

  const groups = new Map();
  for (const name of CARDS) {
    const { category } = DOCS_BY_CARD.get(name);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(name);
  }
  const index = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, names]) => `- **${group}** — ${names.map((n) => `\`${n}\``).join(', ')}`)
    .join('\n');

  write(
    'README.md',
    `${conventions}

## Components

${CARDS.length} Mosaik components from \`${PACKAGE}@${VERSION}\`, exactly the set Symphony renders. Each has
\`components/<Name>/README.md\` (what it is, slots, parts, a verified example, props) and a live
\`preview.html\`; \`components/index.d.ts\` holds every props contract.

${index}
`,
  );
}

// #endregion

// #region Cover

// The Overview cover (cover.md in the Design System type): Soho's palette as
// tiles across a top band -- the name is too wide for the side zone at 64px --
// and the name beneath. Every fill and radius is a token from tokens.css.
function buildCover() {
  // Tiles on the 8px space grid, two 52px rows; [x, y, width, class].
  const tiles = [
    [0, 0, 176, 'ink'],
    [184, 0, 112, 'tint'],
    [304, 0, 52, 'teal'],
    [364, 0, 172, 'tint2'],
    [544, 0, 52, 'line'],
    [604, 0, 112, 'ink'],
    [724, 0, 52, 'orange'],
    [784, 0, 96, 'tint'],
    [0, 60, 52, 'line'],
    [60, 60, 112, 'tint2'],
    [180, 60, 236, 'ink'],
    [424, 60, 52, 'violet'],
    [484, 60, 172, 'tint'],
    [664, 60, 52, 'line'],
    [724, 60, 156, 'tint2'],
  ];
  const rects = tiles
    .map(([x, y, w, cls]) => `<rect class="t ${cls}" x="${x}" y="${y}" width="${w}" height="52"/>`)
    .join('\n      ');
  write(
    'components/Cover/preview.html',
    `<!-- @dsCard height=288 -->
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
  body{margin:0;background:var(--mosaik-scheme-background);color:var(--mosaik-scheme-foreground)}
  .cover{position:relative;width:960px;height:288px;box-sizing:border-box;padding:32px 40px 0;overflow:hidden}
  svg{display:block}
  .t{rx:var(--mosaik-layout-radius);ry:var(--mosaik-layout-radius)}
  .ink{fill:var(--mosaik-color-primary-500)}
  .tint{fill:var(--mosaik-color-neutral-100)}
  .tint2{fill:var(--mosaik-color-neutral-200)}
  .teal{fill:var(--mosaik-color-secondary-500)}
  .orange{fill:var(--mosaik-color-tertiary-500)}
  .violet{fill:var(--mosaik-color-highlight-500)}
  .line{fill:var(--mosaik-scheme-background);stroke:var(--mosaik-scheme-highlight);stroke-width:var(--mosaik-layout-thickness)}
  h1{margin:28px 0 0;font:600 64px/0.95 var(--font-sans);letter-spacing:-1.6px;white-space:nowrap}
  p{margin:12px 0 0;max-width:440px;font:400 14px/20px var(--font-sans);color:var(--mosaik-scheme-lowlight)}
</style>
</head><body>
<div class="cover">
  <svg width="880" height="112" viewBox="0 0 880 112" aria-hidden="true">
    <!--
      blocks: mosaik-color-primary-500 (near-black action colour) leads, neutral-100/200 relieve it,
        secondary-500, tertiary-500 and highlight-500 stay single small tiles.
      arrangement: a top band, two unequal rows like Symphony's board lanes; the name is too wide
        for the side zone at 64px.
      pattern: tiles cut by the radius token -- Soho is geometric, modular, dense UI -- with
        outlined tiles in mosaik-scheme-highlight at mosaik-layout-thickness.
      scales: 8px mosaik-layout-space gaps and pitch, 52px rows, 10px mosaik-layout-radius corners.
    -->
      ${rects}
  </svg>
  <h1>${TITLE}</h1>
  <p>Mosaik ${VERSION} in Soho, as the Symphony desktop app renders it.</p>
</div>
</body></html>
`,
  );
}

// #endregion

// #region Index

// project/design-system.json belongs to the artifact: people rename the system
// or add assets on its page. Given the copy read from the artifact right before
// publishing (--index <file>), only the keys this build owns change: the
// licence group and lastChange.
function buildIndex(file) {
  const index = JSON.parse(readFileSync(file, 'utf8'));
  if (index.v !== 3 || index.layout !== 'files' || !(index.createdOnFiles || index.convertedFrom))
    throw new Error(`${file} is not a Design System index kept in files`);
  index.namespace = NAMESPACE;
  index.assetGroups = { ...index.assetGroups };
  index.assetGroups.Licenses ??= { name: 'Licenses', order: [], files: {} };
  index.groups = [...new Set([...(index.groups ?? []), 'Licenses'])];
  index.lastChange = {
    by: 'Claude',
    at: new Date().toISOString(),
    via: `Claude Code · RueDeRennes/symphony@${git('rev-parse', '--short', 'HEAD')}`,
    note: `Rebuilt on Mosaik ${VERSION} in Soho: ${CARDS.length} components, light and dark tokens`,
  };
  write('design-system.json', JSON.stringify(index, null, 2) + '\n');
}

// #endregion

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(PROJECT, { recursive: true });
  await buildBundle();
  buildStylesheet();
  copyFonts();
  const tokens = buildTokens(await measureTheme());
  write('tokens.json', JSON.stringify(tokens, null, 2) + '\n');
  write('tokens.css', tokensCss(tokens));
  console.error(
    `  tokens: ${tokens.color.tokens.length} colours × 2 themes, ${tokens.type.groups[0].styles.length} text styles`,
  );
  await buildCards();
  buildReadme();
  buildCover();
  const indexArg = process.argv.indexOf('--index');
  if (indexArg !== -1) buildIndex(process.argv[indexArg + 1]);
  console.error(`✓ artifact files in ${PROJECT}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
