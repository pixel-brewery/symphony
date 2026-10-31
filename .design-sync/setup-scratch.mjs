#!/usr/bin/env node
// Prepares the isolated scratch install the Claude Design converter builds from.
//
// Run this before package-build.mjs. It is idempotent and rebuilds everything
// the converter needs that does not come straight out of npm:
//
//   1. installs Mosaik at exactly the version Symphony pins, plus React
//   2. marks the Mosaik foundation package side-effect-free
//   3. compiles Symphony's real stylesheet (Soho theme + overrides) into the package
//   4. generates a slim bundle entry limited to the components Symphony uses
//
// Steps 2 and 4 exist for one reason: the React package barrel re-exports all
// 326 wrappers and each wrapper imports the foundation barrel, which npm does
// not mark side-effect-free. Bundling that pulls in every element Symphony
// never touches -- apexcharts alone is 22 MB on disk -- and the bundle came out
// at 12.5 MB against a 12 MB upload limit. Together these two steps take it to
// roughly 5.5 MB without dropping anything Symphony renders.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = join(REPO, '.ds-sync/scratch');
const PKG_DIR = join(SCRATCH, 'node_modules/@pixel-brewery/mosaik-elements-react');
const MOSAIK_VERSION = readPinnedMosaikVersion();

const run = (cmd, args, cwd, env = process.env) =>
  execFileSync(cmd, args, { cwd, env, stdio: 'inherit', encoding: 'utf8' });

// Symphony's own package.json is the single source of truth for the Mosaik
// version, so the previews can never drift from what the app actually ships.
function readPinnedMosaikVersion() {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const version = pkg.dependencies?.['@pixel-brewery/mosaik-elements-foundation'];
  if (!version)
    throw new Error('Symphony does not depend on @pixel-brewery/mosaik-elements-foundation');
  return version.replace(/^[^0-9]*/, '');
}

function install() {
  mkdirSync(SCRATCH, { recursive: true });
  writeFileSync(
    join(SCRATCH, 'package.json'),
    JSON.stringify({ name: 'ds-scratch', private: true, version: '1.0.0' }, null, 2) + '\n',
  );

  // Keep credentials out of the scratch file. Only npm receives the value,
  // and a fully cached Mosaik install needs no GitHub Packages credential.
  writeFileSync(
    join(SCRATCH, '.npmrc'),
    '@pixel-brewery:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${SYMPHONY_MOSAIK_PACKAGES_TOKEN}\n',
    { mode: 0o600 },
  );

  const names = [
    'mosaik-elements-react',
    'mosaik-elements-foundation',
    'mosaik-elements',
    'mosaik-icons',
    'mosaik-themes',
  ];
  const installed = names.map((name) => {
    // A companion build can retain a published version while containing newer
    // source. Reuse only installed packages; fetch missing published artifacts.
    const source = join(REPO, 'node_modules/@pixel-brewery', name);
    if (
      !existsSync(join(source, 'package.json')) ||
      JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).version !== MOSAIK_VERSION
    )
      return undefined;
    return { name, source };
  });
  const cached = installed.every(Boolean);
  const mosaik = cached ? [] : names.map((name) => `@pixel-brewery/${name}@${MOSAIK_VERSION}`);
  let token = '';
  if (!cached) {
    token = process.env.MOSAIK_PACKAGES_TOKEN || process.env.GITHUB_TOKEN || '';
    if (!token) {
      try {
        token = execFileSync('gh', ['auth', 'token'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
      } catch {
        throw new Error('Mosaik packages require an existing GitHub Packages read token.');
      }
    }
  }
  // Other presets retain their optional preview fonts; Soho uses the same locally
  // bundled Inter files as Symphony (see generateFontStylesheet).
  run(
    'npm',
    [
      'i',
      '--no-audit',
      '--no-fund',
      ...mosaik,
      'react@19',
      'react-dom@19',
      '@types/react',
      '@fontsource/archivo',
      '@fontsource/inter',
      '@fontsource/nunito',
      '@fontsource/space-grotesk',
    ],
    SCRATCH,
    { ...process.env, SYMPHONY_MOSAIK_PACKAGES_TOKEN: token },
  );
  if (cached)
    for (const entry of installed) {
      const target = join(SCRATCH, 'node_modules/@pixel-brewery', entry.name);
      rmSync(target, { recursive: true, force: true });
      cpSync(entry.source, target, { recursive: true });
    }
}

// The Design System artifact and Design canvases run React 18 UMD builds, and
// build-artifact.mjs probes the bundle against the same ones. They get their
// own install because React 18 and 19 cannot share one dependency tree.
function installReact18() {
  const dir = join(REPO, '.ds-sync/react18');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'ds-react18', private: true, version: '1.0.0' }, null, 2) + '\n',
  );
  run('npm', ['i', '--no-audit', '--no-fund', 'react@18.3.1', 'react-dom@18.3.1'], dir);
}

// esbuild only tree-shakes across a barrel when the package declares itself
// side-effect-free. Mosaik registers its custom elements through decorators in
// each element's own module, so the modules the slim entry reaches are still
// evaluated (and still register); only untouched elements drop out.
function markFoundationTreeShakeable() {
  const file = join(SCRATCH, 'node_modules/@pixel-brewery/mosaik-elements-foundation/package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  pkg.sideEffects = false;
  writeFileSync(file, JSON.stringify(pkg, null, 4) + '\n');
}

// cfg.cssEntry has to resolve inside the package directory, so Symphony's
// compiled stylesheet is written there rather than kept in .design-sync/.
//
// The entry is the renderer's top-level styles.scss, not styles/mosaik.scss:
// mosaik.scss carries the theme and the 34 ::part overrides, but the :root rule
// that sets the page font lives one level up. Components whose font tokens the
// Soho theme leaves unset (Disclosure's native <summary>, for one) then inherit
// the browser default and render in serif. styles.scss @use's mosaik.scss, so
// compiling it gets both.
function compileSymphonyStylesheet() {
  const shim = join(REPO, '.design-sync/styles/shim');
  const nodeModules = join(REPO, 'node_modules');

  // dart-sass does not read package "exports", so the @pixel-brewery/
  // mosaik-themes/scss subpath Symphony's stylesheet imports is forwarded
  // through a shim. Compiling Symphony's real file (rather than a copy of its
  // import list) keeps the 34 override imports in one place.
  mkdirSync(join(shim, '@pixel-brewery/mosaik-themes'), { recursive: true });
  writeFileSync(
    join(shim, '@pixel-brewery/mosaik-themes/scss.scss'),
    `// Generated by .design-sync/setup-scratch.mjs -- see compileSymphonyStylesheet().\n@forward '${join(nodeModules, '@pixel-brewery/mosaik-themes/_index.scss')}';\n`,
  );

  run(
    join(nodeModules, '.bin/sass'),
    [
      `--load-path=${shim}`,
      `--load-path=${nodeModules}`,
      '--no-source-map',
      '--style=compressed',
      join(REPO, 'apps/renderer/src/styles.scss'),
      join(PKG_DIR, '_symphony.css'),
    ],
    REPO,
  );
}

// Preview frames ship the theme's OFL fonts rather than depending on host fonts.
// Keep legacy preview families while Soho uses Inter for new surfaces.
function generateFontStylesheet() {
  const families = [
    ['Space Grotesk', 'space-grotesk'],
    ['Archivo', 'archivo'],
    ['Inter', 'inter'],
    ['Nunito', 'nunito'],
  ];
  const weights = [300, 400, 500, 600, 700];

  const rules = families.flatMap(([family, pkg]) =>
    weights.map((weight) =>
      [
        '@font-face {',
        `  font-family: '${family}';`,
        '  font-style: normal;',
        `  font-weight: ${weight};`,
        '  font-display: swap;',
        `  src: url('../../@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff2') format('woff2');`,
        '}',
      ].join('\n'),
    ),
  );

  writeFileSync(
    join(PKG_DIR, '_symphony-fonts.css'),
    '/* Generated by .design-sync/setup-scratch.mjs -- see generateFontStylesheet(). */\n\n' +
      rules.join('\n\n') +
      '\n',
  );
}

// Symphony maps ~50 semantic icon names (add, board, branch, ...) onto icons
// drawn from four Mosaik icon packs, and registers them at renderer startup.
// Component previews that use Material-style names render nothing at all, so
// the map is lifted out of the renderer's real ShellConfig rather than
// reinvented -- and it stays correct as Symphony adds icons.
function generateIconMap() {
  const shellConfig = readFileSync(
    join(REPO, 'apps/renderer/src/configuration/ShellConfig.ts'),
    'utf8',
  );

  const call = shellConfig.indexOf('provideIcons({');
  if (call === -1) throw new Error('provideIcons({ ... }) not found in ShellConfig.ts');
  const start = shellConfig.indexOf('{', call);
  let depth = 0,
    end = start;
  for (let i = start; i < shellConfig.length; i++) {
    if (shellConfig[i] === '{') depth++;
    else if (shellConfig[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = shellConfig.slice(start + 1, end);

  const entries = [...body.matchAll(/(\w+):\s*(\w+)/g)].map((m) => [m[1], m[2]]);

  // Which module each icon identifier comes from.
  const origin = new Map();
  for (const m of shellConfig.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)'/g)) {
    for (const spec of m[1].split(',')) {
      const name = spec
        .trim()
        .split(/\s+as\s+/)
        .pop()
        .trim();
      if (name) origin.set(name, m[2]);
    }
  }

  const byModule = new Map();
  const unresolved = [];
  for (const [, identifier] of entries) {
    const module = origin.get(identifier);
    if (!module) {
      unresolved.push(identifier);
      continue;
    }
    if (!byModule.has(module)) byModule.set(module, new Set());
    byModule.get(module).add(identifier);
  }
  if (unresolved.length) console.error(`  ! icon import not found for: ${unresolved.join(', ')}`);

  const imports = [...byModule].map(
    ([module, names]) => `import { ${[...names].sort().join(', ')} } from '${module}';`,
  );

  writeFileSync(
    join(REPO, '.design-sync/provider/SymphonyIcons.ts'),
    [
      '// Generated by .design-sync/setup-scratch.mjs -- do not edit.',
      '//',
      "// Symphony's icon vocabulary, lifted from the renderer's provideIcons() call",
      '// in apps/renderer/src/configuration/ShellConfig.ts so previews resolve the',
      '// same names the product uses.',
      '',
      ...imports,
      '',
      'export const SYMPHONY_ICONS = {',
      ...entries.filter(([, id]) => origin.has(id)).map(([name, id]) => `  ${name}: ${id},`),
      '};',
      '',
    ].join('\n'),
  );

  console.error(`  icons: ${entries.length} name(s) from ${byModule.size} pack(s)`);
}

// Every <mosaik-*> tag Symphony renders, across the desktop renderer, the
// mobile app and the shared frontend libraries.
function symphonyTags() {
  const roots = ['apps/renderer/src', 'apps/mobile/src', 'libs/frontend'].map((r) => join(REPO, r));
  const tags = new Set();
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      if (!/\.(html|ts)$/.test(entry.name)) continue;
      for (const m of readFileSync(path, 'utf8').matchAll(/<(mosaik-[a-z0-9-]+)/g)) tags.add(m[1]);
    }
  };
  for (const root of roots) if (existsSync(root)) visit(root);
  return tags;
}

// Maps each React wrapper export to the custom element tag it renders and the
// module that declares it. Not every wrapper is re-exported from Index.js
// (0.1.183 ships Flow and Tile only under their components/ subpaths), so the
// entry imports each one from its own module.
function reactExports() {
  const found = new Map();
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      if (!entry.name.endsWith('.js')) continue;
      const src = readFileSync(path, 'utf8');
      for (const m of src.matchAll(
        /export const (\w+) = createComponent\(\{\s*tagName: '([a-z0-9-]+)'/g,
      ))
        found.set(m[1], { tag: m[2], file: path });
      // Overlay services (DialogProvider, ToastProvider, ...) are React-only
      // helpers with no custom element behind them, so they carry no tagName.
      for (const m of src.matchAll(/export (?:const|function) (\w+Provider)\b/g))
        found.set(m[1], { tag: null, file: path });
    }
  };
  visit(PKG_DIR);
  return found;
}

// The provider modules are committed under .design-sync/provider/, but they
// cannot be bundled from there: esbuild resolves a file's bare imports from the
// file's own location, so '@pixel-brewery/mosaik-elements-foundation' would
// resolve against Symphony's node_modules instead of this scratch install. That
// pulls a second copy of Mosaik into the bundle -- every custom element defined
// twice, and an icon registry singleton that the elements never read, so icons
// silently resolve to nothing. Copying them next to the package makes every
// import resolve to the one install.
function stageProviderModules() {
  const target = join(SCRATCH, '_symphony-provider');
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  const source = join(REPO, '.design-sync/provider');
  for (const name of readdirSync(source)) {
    if (!name.endsWith('.ts')) continue;
    const code = readFileSync(join(source, name), 'utf8').replace(
      /'\.\.\/\.\.\/(libs\/[^']+)'/g,
      (_, path) => JSON.stringify(join(REPO, path)),
    );
    writeFileSync(join(target, name), code);
  }
}

function generateSlimEntry() {
  const tags = symphonyTags();
  const exports = reactExports();

  const selected = [...exports]
    .filter(([, { tag }]) => (tag === null ? true : tags.has(tag)))
    .map(([name]) => name);

  // Theme2 is what cfg.provider wraps every preview in; Symphony itself themes
  // through the Angular provider, so no template mentions the tag.
  const all = [...new Set([...selected, 'Theme2'])].sort();

  const wrapped = new Set([...exports.values()].map(({ tag }) => tag));
  const unmatched = [...tags].filter((tag) => !wrapped.has(tag));
  if (unmatched.length) console.error(`  ! no React wrapper for: ${unmatched.join(', ')}`);

  // cfg.componentSrcMap excludes (null) every wrapper outside this scope, so a
  // Mosaik upgrade neither adds cards nor contracts for components Symphony
  // never renders. Theme2 and MosaikProvider are bundled plumbing, not cards.
  const configFile = join(REPO, '.design-sync/config.json');
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  const plumbing = new Set(['Theme2', 'MosaikProvider']);
  config.componentSrcMap = Object.fromEntries(
    [...exports.keys()]
      .filter((name) => !selected.includes(name) || plumbing.has(name))
      .sort()
      .map((name) => [name, null]),
  );
  writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');

  writeFileSync(
    join(PKG_DIR, '_symphony-entry.ts'),
    [
      '// Generated by .design-sync/setup-scratch.mjs -- do not edit.',
      '//',
      '// Slim bundle entry: only the components Symphony actually renders, so',
      '// esbuild can drop the rest of the Mosaik barrel. Lives inside the package',
      '// because the converter derives the package root from the entry path.',
      '//',
      '// The documentTheme import must come first: Mosaik elements cache their',
      '// themed stylesheet when their class is finalized, which happens while the',
      "// barrel below evaluates, and that lookup reads the document's theme",
      '// attribute.',
      '',
      "import '../../../_symphony-provider/documentTheme';",
      '',
      ...all.map(
        (name) =>
          `export { ${name} } from './${relative(PKG_DIR, exports.get(name).file).split(sep).join('/')}';`,
      ),
      '',
      "export { SYMPHONY_THEME, SymphonyThemeProvider } from '../../../_symphony-provider/SymphonyTheme';",
      '',
    ].join('\n'),
  );

  console.error(`  slim entry: ${all.length} components (${tags.size} tags used by Symphony)`);
}

install();
installReact18();
markFoundationTreeShakeable();
compileSymphonyStylesheet();
generateFontStylesheet();
generateIconMap();
stageProviderModules();
generateSlimEntry();
console.error('✓ scratch ready');
