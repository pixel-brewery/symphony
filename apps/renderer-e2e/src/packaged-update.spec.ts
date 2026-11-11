// #region Imports

import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import type { IDesktopApi } from '@symphony/ipc-contracts-desktop';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

test('a Forge package discovers and hands off an update from its ordinary channel URL', async () => {
  // arrange
  const testInfo = test.info();
  const executablePath = process.env['SYMPHONY_E2E_PACKAGED_EXECUTABLE'];
  const updateOrigin = process.env['SYMPHONY_UPDATE_BASE_URL']?.replace(/\/+$/u, '');
  const platform = process.platform;
  const architecture = process.arch;
  if (!executablePath || !updateOrigin || (platform !== 'darwin' && platform !== 'win32')) {
    throw new Error(
      'Packaged update acceptance requires a macOS or Windows Forge package and its update origin.',
    );
  }

  const { version: installedVersion } = JSON.parse(
    await readFile(resolve('package.json'), 'utf8'),
  ) as {
    version: string;
  };
  const [major, minor, patch = 0] = installedVersion.split('.').map(Number);
  const targetVersion = `${major}.${minor}.${patch + 1}`;
  const installerName =
    platform === 'darwin'
      ? `Symphony-darwin-${architecture}-${targetVersion}.dmg`
      : 'SymphonySetup.exe';
  const installerUrl = `https://updates.example.invalid/releases/${targetVersion}/${installerName}`;
  const installerContents = 'Packaged update acceptance fixture';
  const manifest = {
    schemaVersion: 1,
    version: targetVersion,
    platform,
    architecture,
    artifact: {
      name: installerName,
      url: installerUrl,
      bytes: Buffer.byteLength(installerContents),
      sha256: createHash('sha256').update(installerContents).digest('hex'),
    },
  };
  const configurationRoot = testInfo.outputPath('configuration');
  const temporaryRoot = testInfo.outputPath('tmp');
  const checkLog = testInfo.outputPath('update-check.json');
  const handoffLog = testInfo.outputPath('installer-handoff.json');
  await mkdir(temporaryRoot, { recursive: true });

  const app = await electron.launch({
    executablePath,
    cwd: resolve('.'),
    env: {
      ...process.env,
      TMPDIR: temporaryRoot,
      TMP: temporaryRoot,
      TEMP: temporaryRoot,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(configurationRoot, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(configurationRoot, 'legacy-skills'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });
  const childProcess = app.process();

  try {
    // Only the remote response and OS opener are fixtures. Main still schedules the check,
    // validates the manifest and the streamed bytes, and coordinates its actual shutdown.
    const installedApp = await app.evaluate(
      ({ app: electronApp, shell }, fixture) => {
        const fs = process.getBuiltinModule('node:fs/promises');
        if (!fs) throw new Error('Node filesystem promises are unavailable.');
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (input, options) => {
          const request = new Request(input, options);
          if (new URL(request.url).pathname.endsWith('/installer.json')) {
            await fs.writeFile(
              fixture.checkLog,
              JSON.stringify({
                url: request.url,
                cache: request.cache,
                accept: request.headers.get('accept'),
              }),
            );
            return Response.json(fixture.manifest);
          }
          if (request.url === fixture.manifest.artifact.url) {
            return new Response(fixture.installerContents);
          }
          return originalFetch(input, options);
        };
        shell.openPath = async (path) => {
          const contents = await fs.readFile(path, 'utf8');
          await fs.writeFile(fixture.handoffLog, JSON.stringify({ path, contents }));
          return '';
        };
        return { packaged: electronApp.isPackaged, version: electronApp.getVersion() };
      },
      { manifest, installerContents, checkLog, handoffLog },
    );

    // act: wait for the startup timer without requesting an update check from the renderer.
    const page = await prepareMainWindow(app);
    const download = page.getByTestId('download-available-update');
    await expect(download).toBeVisible({ timeout: 30_000 });

    // assert the real Main-to-renderer state and the ordinary manifest request before downloading.
    expect(installedApp).toEqual({ packaged: true, version: installedVersion });
    expect(JSON.parse(await readFile(checkLog, 'utf8'))).toEqual({
      url: `${updateOrigin}/channels/stable/${platform}/${architecture}/installer.json`,
      cache: 'no-cache',
      accept: 'application/json',
    });
    expect(
      await page.evaluate(() =>
        (window as unknown as { desktop: IDesktopApi }).desktop.request('updates.get', {}),
      ),
    ).toMatchObject({
      kind: 'available',
      currentVersion: installedVersion,
      targetVersion,
    });

    await download.click();
    const install = page.getByTestId('install-ready-update');
    await expect(install).toBeVisible();
    await install.click();

    await expect.poll(() => childProcess.exitCode).toBe(0);
    const handoff = JSON.parse(await readFile(handoffLog, 'utf8')) as {
      path: string;
      contents: string;
    };
    expect(dirname(dirname(handoff.path))).toBe(resolve(temporaryRoot, 'symphony-updates'));
    expect(basename(handoff.path)).toBe(installerName);
    expect(handoff.contents).toBe(installerContents);
  } finally {
    if (childProcess.exitCode === null) await app.close();
  }
});
