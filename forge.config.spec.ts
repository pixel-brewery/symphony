// #region Imports

import { execFile } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

// #endregion

interface IDiskImageEntry {
  readonly x: number;
  readonly y: number;
  readonly type: 'link' | 'file' | 'position';
  readonly path: string;
}

interface IDiskImageConfiguration {
  readonly appPath: string;
  readonly iconSize: number;
  readonly contents: readonly IDiskImageEntry[];
  readonly window: { readonly size: { readonly width: number; readonly height: number } };
}

const run = promisify(execFile);

describe('macOS installer creation', () => {
  it('retries only a lost Symphony mount and preserves a permanent maker failure', async () => {
    // arrange
    const script = `
      const { MakerDMG } = await import('@electron-forge/maker-dmg');
      const { default: config } = await import('./forge.config.mjs');
      const maker = config.makers.find((candidate) => candidate.name === 'dmg').clone();
      const lostMount = new Error('Command failed: hdiutil detach /Volumes/Symphony\\nhdiutil: detach failed - No such file or directory');
      const otherFailure = new Error('Cannot copy application');
      const outcomes = [];
      for (const failures of [[lostMount, lostMount], [lostMount, lostMount, lostMount], [otherFailure]]) {
        let calls = 0;
        MakerDMG.prototype.make = async () => {
          const failure = failures[calls++];
          if (failure) throw failure;
          return ['installer.dmg'];
        };
        try {
          outcomes.push({ result: await maker.make({}), calls });
        } catch (error) {
          outcomes.push({ original: error === failures.at(-1), calls });
        }
      }
      process.stdout.write(JSON.stringify(outcomes));
    `;

    // act
    const result = await run(process.execPath, ['--input-type=module', '-e', script], {
      cwd: resolve('.'),
      timeout: 5_000,
    });

    // assert
    expect(JSON.parse(result.stdout)).toEqual([
      { result: ['installer.dmg'], calls: 3 },
      { original: true, calls: 3 },
      { original: true, calls: 1 },
    ]);
  });
});

describe('macOS installer contents', () => {
  it('retains the installable app and Applications link with a readable first-launch guide inside the visible window', async () => {
    // arrange
    const appPath = resolve('output/fixture application/Symphony.app');
    const script = `
      const { default: config } = await import('./forge.config.mjs');
      const maker = config.makers.find((candidate) => candidate.name === 'dmg');
      if (!maker) throw new Error('The macOS disk-image maker is required.');
      await maker.prepareConfig('arm64');
      const appPath = ${JSON.stringify(appPath)};
      const contents = typeof maker.config.contents === 'function'
        ? maker.config.contents({ appPath, name: 'Symphony' })
        : maker.config.contents;
      process.stdout.write(JSON.stringify({
        appPath,
        contents,
        iconSize: maker.config.iconSize ?? 80,
        window: maker.config.additionalDMGOptions?.window,
      }));
    `;

    // act
    const result = await run(process.execPath, ['--input-type=module', '-e', script], {
      cwd: resolve('.'),
      timeout: 5_000,
    });
    const image: IDiskImageConfiguration = JSON.parse(result.stdout);
    const application = image.contents.find(
      (entry) => entry.type === 'file' && entry.path === appPath,
    );
    const destination = image.contents.find(
      (entry) => entry.type === 'link' && entry.path === '/Applications',
    );
    const guides = image.contents.filter(
      (entry) => entry.type === 'file' && entry.path !== appPath,
    );

    // assert
    expect(application).toBeDefined();
    expect(destination).toBeDefined();
    expect(guides).toHaveLength(1);
    const guide = guides[0];
    if (!application || !destination || !guide) {
      throw new Error(
        'The disk image must contain its app, Applications link and first-launch guide.',
      );
    }
    expect(extname(guide.path)).toBe('.txt');
    expect(statSync(guide.path).isFile()).toBe(true);
    expect(statSync(guide.path).mode & 0o111).toBe(0);
    expect(readFileSync(guide.path, 'utf8').trim().length).toBeGreaterThan(0);
    expect(application.x).toBeLessThan(destination.x);
    expect(application.y).toBe(destination.y);
    expect(guide.y + image.iconSize).toBeLessThan(application.y);
    for (const entry of image.contents) {
      expect(entry.x - image.iconSize / 2).toBeGreaterThanOrEqual(0);
      expect(entry.y - image.iconSize / 2).toBeGreaterThanOrEqual(0);
      expect(entry.x + image.iconSize / 2).toBeLessThan(image.window.size.width);
      expect(entry.y + image.iconSize / 2).toBeLessThan(image.window.size.height);
    }
  });
});
