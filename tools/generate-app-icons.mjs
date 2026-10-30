// #region Imports

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// #endregion

const iconRoot = resolve('resources/icons');
const markSourcePath = resolve(iconRoot, 'symphony-mark.svg');
const appSvgPath = resolve(iconRoot, 'symphony.svg');
const appPngRoot = resolve(iconRoot, 'png/app');
const markPngRoot = resolve(iconRoot, 'png/mark');
const trayPngRoot = resolve(iconRoot, 'png/tray');
const appSizes = [16, 20, 24, 32, 40, 48, 64, 128, 180, 192, 256, 512, 1024];
const markSizes = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512];
const traySize = 24;

const markSource = await readFile(markSourcePath, 'utf8');
const mark = markSource.match(/<g\s+id="symphony-mark"[\s\S]*?<\/g>/u)?.[0];
if (!mark) throw new Error('The canonical Symphony mark group is missing.');

const appSvg = `<!-- resources/icons/symphony.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" style="color: #c43c35">
  <rect x="48" y="48" width="928" height="928" rx="224" fill="#fafaf9" />
  <g transform="translate(128 128) scale(24)">
    ${mark}
  </g>
</svg>
`;
const trayMark = `<g transform="translate(0 -1)">${mark}</g>`;
const traySvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style="color: #000000">
  ${trayMark}
</svg>
`;
const trayStatusSvg = (badge) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style="color: #000000">
  ${trayMark}
  ${badge}
</svg>
`;
const runningTraySvg = trayStatusSvg('<circle cx="27.5" cy="4" r="2.75" fill="currentColor" />');
const failedTraySvg = trayStatusSvg(`
  <defs>
    <mask id="failed-badge">
      <circle cx="27.5" cy="4" r="3.5" fill="#ffffff" />
      <path d="M27.5 2.1v2.6" stroke="#000000" stroke-linecap="round" stroke-width="1.4" />
      <circle cx="27.5" cy="6" r="0.55" fill="#000000" />
    </mask>
  </defs>
  <rect width="32" height="32" fill="currentColor" mask="url(#failed-badge)" />
`);

await mkdir(appPngRoot, { recursive: true });
await mkdir(markPngRoot, { recursive: true });
await mkdir(trayPngRoot, { recursive: true });
await writeFile(appSvgPath, appSvg, 'utf8');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const size of appSizes) {
    await renderSvg(page, appSvg, size, resolve(appPngRoot, `symphony-${size}.png`));
  }
  for (const size of markSizes) {
    await renderSvg(page, markSource, size, resolve(markPngRoot, `symphony-mark-${size}.png`));
  }
  await renderSvg(page, traySvg, traySize, resolve(trayPngRoot, 'symphonyTemplate.png'));
  await renderSvg(page, traySvg, traySize * 2, resolve(trayPngRoot, 'symphonyTemplate@2x.png'));
  await renderSvg(
    page,
    runningTraySvg,
    traySize,
    resolve(trayPngRoot, 'symphonyRunningTemplate.png'),
  );
  await renderSvg(
    page,
    runningTraySvg,
    traySize * 2,
    resolve(trayPngRoot, 'symphonyRunningTemplate@2x.png'),
  );
  await renderSvg(
    page,
    failedTraySvg,
    traySize,
    resolve(trayPngRoot, 'symphonyFailedTemplate.png'),
  );
  await renderSvg(
    page,
    failedTraySvg,
    traySize * 2,
    resolve(trayPngRoot, 'symphonyFailedTemplate@2x.png'),
  );
} finally {
  await browser.close();
}

await writeFile(
  resolve(iconRoot, 'symphony.ico'),
  createIconContainer(
    await Promise.all(
      [16, 24, 32, 48, 64, 128, 256].map(async (size) => ({
        size,
        data: await readFile(resolve(appPngRoot, `symphony-${size}.png`)),
      })),
    ),
  ),
);

await writeFile(
  resolve(iconRoot, 'symphony.icns'),
  createIcnsContainer(
    await Promise.all(
      [
        ['icp4', 16],
        ['icp5', 32],
        ['icp6', 64],
        ['ic07', 128],
        ['ic08', 256],
        ['ic09', 512],
        ['ic10', 1024],
      ].map(async ([type, size]) => ({
        type,
        data: await readFile(resolve(appPngRoot, `symphony-${size}.png`)),
      })),
    ),
  ),
);

async function renderSvg(page, svg, size, outputPath) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{width:100%;height:100%;margin:0;background:transparent}svg{display:block;width:100%;height:100%}</style>${svg}`,
  );
  await page.screenshot({ path: outputPath, omitBackground: true });
}

function createIconContainer(images) {
  const headerLength = 6 + images.length * 16;
  const header = Buffer.alloc(headerLength);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = headerLength;
  images.forEach(({ size, data }, index) => {
    const entryOffset = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(data.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

function createIcnsContainer(images) {
  const entries = images.map(({ type, data }) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, 'ascii');
    header.writeUInt32BE(data.length + header.length, 4);
    return Buffer.concat([header, data]);
  });
  const totalLength = 8 + entries.reduce((sum, entry) => sum + entry.length, 0);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);
  return Buffer.concat([header, ...entries]);
}
