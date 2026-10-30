// #region Imports

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// #endregion

// Render the actual Orbit world, including its Sun shader and Saturn geometry.
// This build-time tool starts no server and adds no WebGL work to the editor.
const resourceRoot = resolve('resources/orbit');
const outputRoot = resolve(resourceRoot, 'previews');
const design = await readFile('DESIGN.md', 'utf8');
const token = (name) => {
  const value = design.match(new RegExp(`^  ${name}: '([^']+)'$`, 'm'))?.[1];
  if (!value) throw new Error(`Missing preview palette token: ${name}`);
  return value;
};
const palette = Object.fromEntries(
  [
    'background',
    'foreground',
    'neutral',
    'primary',
    'secondary',
    'info',
    'warning',
    'danger',
    'success',
    'highlight',
  ].map((key) => [
    key,
    token(
      key === 'background' || key === 'foreground'
        ? `mosaik-scheme-${key}`
        : `mosaik-color-${key}-400`,
    ),
  ]),
);
const bundle = await build({
  entryPoints: ['libs/frontend/ui/src/lib/components/landscape/OrbitCanvasRenderer.ts'],
  tsconfig: 'tsconfig.base.json',
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'SymphonyOrbitPreview',
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 384, height: 256 },
    deviceScaleFactor: 1,
  });
  await page.route('https://symphony-orbit-preview.invalid/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') {
      await route.fulfill({ contentType: 'text/html', body: '<canvas></canvas>' });
    } else if (/^\/orbit\/2k_[a-z_]+\.(jpg|png)$/.test(path)) {
      await route.fulfill({ path: resolve(resourceRoot, path.slice('/orbit/'.length)) });
    } else {
      await route.abort();
    }
  });
  await page.goto('https://symphony-orbit-preview.invalid/');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await mkdir(outputRoot, { recursive: true });
  for (const body of [
    'sun',
    'mercury',
    'venus',
    'earth',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
  ]) {
    const png = await page.evaluate(
      ({ body, palette }) =>
        new Promise((accept, reject) => {
          const canvas = document.createElement('canvas');
          document.body.replaceChildren(canvas);
          const renderer = new window.SymphonyOrbitPreview.OrbitCanvasRenderer(canvas, {
            palette,
            reducedMotion: true,
            showStars: false,
            selected: () => {},
            cameraChanged: () => {},
            failed: () => reject(new Error(`Could not render ${body}`)),
            frame: (frame) => {
              if (frame.assetState === 'unavailable')
                reject(new Error(`Missing texture for ${body}`));
              if (frame.assetState !== 'ready' || frame.state !== 'ready') return;
              accept(canvas.toDataURL('image/png').split(',')[1]);
              renderer.dispose();
            },
          });
          renderer.resize(384, 256);
          renderer.setScene({
            nodes: [
              {
                id: 'production',
                kind: 'production',
                celestialBody: body,
                label: '',
                position: { x: 0, y: 0, z: 0 },
              },
            ],
            rings: [],
            edges: [],
            ticketCount: 0,
          });
          const distance = body === 'saturn' ? 20 : 11.5;
          const direction = { x: 0.52, y: 0.43, z: 0.73 };
          const length = Math.hypot(direction.x, direction.y, direction.z);
          renderer.restoreCamera({
            target: { x: 0, y: 0, z: 0 },
            position: {
              x: (direction.x / length) * distance,
              y: (direction.y / length) * distance,
              z: (direction.z / length) * distance,
            },
          });
        }),
      { body, palette },
    );
    await writeFile(resolve(outputRoot, `${body}.png`), Buffer.from(png, 'base64'));
    console.log(`Rendered ${body}`);
  }
} finally {
  await browser.close();
}
