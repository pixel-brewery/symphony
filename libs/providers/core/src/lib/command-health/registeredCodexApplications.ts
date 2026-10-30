// #region Imports

import { execFileSync } from 'node:child_process';
import { isAbsolute } from 'node:path';

// #endregion

const APPLICATION_LOOKUP_SCRIPT = `
ObjC.import('AppKit');
const roots = [];
for (const identifier of ['com.openai.codex', 'com.openai.chat']) {
  const url = $.NSWorkspace.sharedWorkspace.URLForApplicationWithBundleIdentifier(identifier);
  if (!url.isNil()) roots.push(ObjC.unwrap(url.path));
}
JSON.stringify(roots);
`;

/**
 * Reads relocated OpenAI application paths from macOS Launch Services without launching them.
 *
 * @returns At most two absolute application bundle paths; unavailable metadata degrades to none.
 * @public
 */
export function registeredCodexApplications(): readonly string[] {
  try {
    const output = execFileSync(
      '/usr/bin/osascript',
      ['-l', 'JavaScript', '-e', APPLICATION_LOOKUP_SCRIPT],
      {
        encoding: 'utf8',
        timeout: 1_500,
        maxBuffer: 16 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    const roots: unknown = JSON.parse(output);
    if (!Array.isArray(roots) || roots.length > 2) return [];
    return roots.filter(
      (root): root is string =>
        typeof root === 'string' &&
        root.length <= 4096 &&
        isAbsolute(root) &&
        root.endsWith('.app') &&
        !/\p{Cc}/u.test(root),
    );
  } catch {
    return [];
  }
}
