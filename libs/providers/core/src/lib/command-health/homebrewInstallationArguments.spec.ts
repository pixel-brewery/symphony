// #region Imports

import { describe, expect, it } from 'vitest';
import { homebrewInstallationArguments } from './homebrewInstallationArguments';

// #endregion

describe('homebrewInstallationArguments', () => {
  it('maps every supported command to a fixed Homebrew recipe', () => {
    // act
    const actual = {
      git: homebrewInstallationArguments('git'),
      gh: homebrewInstallationArguments('gh'),
      codex: homebrewInstallationArguments('codex'),
      claude: homebrewInstallationArguments('claude'),
      opencode: homebrewInstallationArguments('opencode'),
    };

    // assert
    expect(actual).toEqual({
      git: ['install', 'git'],
      gh: ['install', 'gh'],
      codex: ['install', '--cask', 'codex'],
      claude: ['install', '--cask', 'claude-code'],
      opencode: ['install', 'anomalyco/tap/opencode'],
    });
  });
});
