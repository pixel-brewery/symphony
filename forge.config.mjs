// #region Imports

import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
// ZIP packages are intentionally disabled while Symphony publishes installer-only
// ARM64 releases. Keep the maker import here so archive updates can be restored.
// import { MakerZIP } from '@electron-forge/maker-zip';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// #endregion

const repositoryRoot = dirname(fileURLToPath(import.meta.url));
const executableName = 'Symphony';
const iconRoot = resolve(repositoryRoot, 'resources/icons');
const iconBase = resolve(iconRoot, 'symphony');
const windowsIcon = resolve(iconRoot, 'symphony.ico');
const macosFirstLaunchGuide = resolve(
  repositoryRoot,
  'resources/macos/Read me first - Open Symphony.txt',
);
const speechHelperApp = resolve(
  repositoryRoot,
  'node_modules/electron-native-speech-backend-macos/bin/SpeechHelper.app',
);
const packageVersion = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
).version;
const updateBaseUrl = (process.env['SYMPHONY_UPDATE_BASE_URL'] ?? '').replace(/\/+$/u, '');
const windowsControlPanelIconUrl = updateBaseUrl
  ? `${updateBaseUrl}/releases/${packageVersion}/shared/symphony.ico`
  : undefined;

class MakerDMGWithDetachRetry extends MakerDMG {
  async make(options) {
    const maximumAttempts = 3;
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await super.make(options);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const lostMount =
          /hdiutil detach \/Volumes\/Symphony(?: \d+)?\s/u.test(message) &&
          message.includes('hdiutil: detach failed - No such file or directory');
        if (!lostMount || attempt === maximumAttempts) throw error;
        console.warn(message);
        console.warn(`Retrying Symphony DMG creation (${attempt + 1}/${maximumAttempts}).`);
      }
    }
  }
}

export default {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.ruederennes.symphony',
    executableName,
    icon: iconBase,
    extendInfo: {
      NSMicrophoneUsageDescription:
        'Symphony uses the microphone only while voice search is active.',
      NSSpeechRecognitionUsageDescription:
        'Symphony uses on-device speech recognition to enter spoken text.',
    },
    extraResource: [iconRoot, ...(process.platform === 'darwin' ? [speechHelperApp] : [])],
    ignore: [
      /^\/(?!dist|package\.json|node_modules)/,
      /^\/node_modules\/(?!(?:zod|electron-native-speech|electron-native-speech-backend-macos|electron-native-speech-preload)(?:\/|$))/,
    ],
    osxSign: {
      // Apple Silicon needs a complete bundle seal even without publisher trust.
      // Ad-hoc sealing has no stable Team ID, so Hardened Runtime would reject
      // the embedded Electron Framework before the application can start.
      identity: '-',
      identityValidation: false,
      optionsForFile: () => ({ hardenedRuntime: false }),
      continueOnError: false,
    },
  },
  makers: [
    // Archive packages are intentionally not part of the release surface.
    // new MakerZIP({}, ['darwin', 'linux', 'win32']),
    new MakerDMGWithDetachRetry((architecture) => ({
      name: `Symphony-darwin-${architecture}-${packageVersion}`,
      title: 'Symphony',
      icon: `${iconBase}.icns`,
      format: 'UDZO',
      contents: ({ appPath }) => [
        { x: 320, y: 120, type: 'file', path: macosFirstLaunchGuide },
        { x: 192, y: 344, type: 'file', path: appPath },
        { x: 448, y: 344, type: 'link', path: '/Applications' },
      ],
      additionalDMGOptions: {
        window: { size: { width: 658, height: 498 } },
      },
    })),
    new MakerDeb({
      options: {
        bin: executableName,
        icon: resolve(iconRoot, 'png/app/symphony-256.png'),
      },
    }),
    new MakerSquirrel({
      name: 'symphony',
      setupExe: 'SymphonySetup.exe',
      setupIcon: windowsIcon,
      ...(windowsControlPanelIconUrl ? { iconUrl: windowsControlPanelIconUrl } : {}),
    }),
  ],
};
