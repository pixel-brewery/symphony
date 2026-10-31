// #region Imports

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractFile, listPackage } from '@electron/asar';

// #endregion

const outputRoot = resolve('out');
const packageRoot = resolve(outputRoot, `Symphony-${process.platform}-${process.arch}`);
const entries = readdirSync(packageRoot, { recursive: true, encoding: 'utf8' });
const asarCandidates = entries
  .filter((entry) => /resources\/app\.asar$/i.test(entry))
  .map((entry) => ({ entry, modifiedAt: statSync(resolve(packageRoot, entry)).mtimeMs }))
  .sort((left, right) => right.modifiedAt - left.modifiedAt);
const asarRelativePath = asarCandidates[0]?.entry;
if (!asarRelativePath) {
  throw new Error(
    `The Symphony Forge package for ${process.platform}/${process.arch} does not contain Resources/app.asar.`,
  );
}

const asarPath = resolve(packageRoot, asarRelativePath);
if (statSync(asarPath).size < 1_000) {
  throw new Error(`Packaged ASAR is unexpectedly small: ${asarPath}`);
}

const packagedFiles = new Set(listPackage(asarPath));
const figureFiles = ['blue', 'mint', 'orange', 'purple', 'gold', 'rose']
  .flatMap((identity) => [identity + '.png', identity + '-48.png', identity + '-v2.png'])
  .concat('LICENSE');
const surfaceResources = ['renderer', 'mobile'].flatMap((surface) => [
  ...figureFiles.map((name) => `/dist/apps/${surface}/browser/figures/${name}`),
  ...[300, 400, 500, 600, 700].map(
    (weight) => `/dist/apps/${surface}/browser/fonts/inter-latin-${weight}-normal.woff2`,
  ),
]);
const orbitResources = [
  '2k_mercury.jpg',
  '2k_venus_atmosphere.jpg',
  '2k_earth_daymap.jpg',
  '2k_mars.jpg',
  '2k_jupiter.jpg',
  '2k_saturn.jpg',
  '2k_saturn_ring_alpha.png',
  '2k_uranus.jpg',
  '2k_neptune.jpg',
  'ATTRIBUTION.md',
  ...['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map(
    (body) => `previews/${body}.png`,
  ),
];
for (const requiredPath of [
  '/dist/apps/desktop/main.mjs',
  '/dist/apps/desktop/preload.cjs',
  '/dist/apps/orchestrator/main.mjs',
  '/dist/apps/renderer/browser/index.html',
  '/dist/apps/mobile/browser/index.html',
  ...surfaceResources,
  ...orbitResources.map((name) => `/dist/apps/renderer/browser/orbit/${name}`),
]) {
  if (!packagedFiles.has(requiredPath)) {
    throw new Error(`Packaged ASAR is missing ${requiredPath}.`);
  }
}

for (const name of orbitResources) {
  const packaged = extractFile(asarPath, `dist/apps/renderer/browser/orbit/${name}`);
  if (!packaged.equals(readFileSync(resolve('resources/orbit', name)))) {
    throw new Error(`Packaged planet asset ${name} differs from its source asset.`);
  }
}

for (const surface of ['renderer', 'mobile']) {
  for (const name of figureFiles) {
    const packaged = extractFile(asarPath, `dist/apps/${surface}/browser/figures/${name}`);
    if (!packaged.equals(readFileSync(resolve('resources/figures', name)))) {
      throw new Error(`Packaged ${surface} figure ${name} differs from its source asset.`);
    }
    if (
      name.endsWith('-48.png') &&
      (packaged.readUInt32BE(16) !== 48 || packaged.readUInt32BE(20) !== 48 || packaged[25] !== 6)
    ) {
      throw new Error(`Packaged ${surface} employee ${name} is not a 48 × 48 RGBA avatar.`);
    }
    if (
      name.endsWith('-v2.png') &&
      (packaged.readUInt32BE(16) !== 1536 ||
        packaged.readUInt32BE(20) !== 2288 ||
        packaged[25] !== 6)
    ) {
      throw new Error(`Packaged ${surface} employee ${name} is not a complete RGBA v2 atlas.`);
    }
  }
}

process.stdout.write(
  `${JSON.stringify({ event: 'package.smoke.passed', asarPath, bytes: statSync(asarPath).size })}\n`,
);
