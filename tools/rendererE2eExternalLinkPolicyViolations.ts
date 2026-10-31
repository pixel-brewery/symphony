// #region Imports

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// #endregion

/**
 * Reports renderer E2E launch environments that could reach the operating-system browser.
 *
 * @param specDirectory - Directory containing the renderer E2E specs.
 * @returns Human-readable policy violations.
 * @public
 */
export function rendererE2eExternalLinkPolicyViolations(
  specDirectory: string = resolve('apps/renderer-e2e/src'),
): readonly string[] {
  const specFiles = readdirSync(specDirectory).filter((name) => name.endsWith('.spec.ts'));
  if (specFiles.length === 0) return ['The renderer E2E suite contains no specs.'];

  const violations: string[] = [];
  for (const specFile of specFiles) {
    const source = readFileSync(resolve(specDirectory, specFile), 'utf8');
    if (!source.includes('electron.launch(')) continue;
    const launchEnvironments = source.match(/SYMPHONY_CONFIG_ROOT:/gu)?.length ?? 0;
    const blockedSwitches = source.match(/SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked'/gu)?.length ?? 0;
    if (blockedSwitches === 0 || blockedSwitches !== launchEnvironments) {
      violations.push(
        `${specFile} defines ${launchEnvironments} launch environment(s) but ${blockedSwitches} external-link block(s).`,
      );
    }
  }
  return violations;
}
