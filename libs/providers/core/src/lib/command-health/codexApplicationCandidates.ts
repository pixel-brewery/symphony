// #region Imports

import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

// #endregion

const MAX_MANIFEST_BYTES = 16 * 1024;

/**
 * Lists known CLI entrypoints within explicitly selected OpenAI application bundles.
 *
 * @param applicationRoots - Known installation roots or native registered application paths.
 * @returns Manifest entrypoints followed by current and legacy CLI layouts.
 * @public
 */
export function codexApplicationCandidates(applicationRoots: readonly string[]): readonly string[] {
  return [
    ...new Set(
      applicationRoots.flatMap((applicationRoot) => {
        const resources = join(applicationRoot, 'Contents', 'Resources');
        const cliRoot = join(resources, 'codex-cli');
        const entrypoint = manifestEntrypoint(cliRoot);
        return [
          ...(entrypoint ? [entrypoint] : []),
          join(cliRoot, 'bin', 'codex'),
          join(cliRoot, 'CodexCLI.app', 'Contents', 'MacOS', 'codex'),
          join(resources, 'codex'),
        ];
      }),
    ),
  ];
}

function manifestEntrypoint(cliRoot: string): string | undefined {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(
      join(cliRoot, 'codex-package.json'),
      constants.O_RDONLY | constants.O_NONBLOCK,
    );
    const stats = fstatSync(descriptor);
    if (!stats.isFile() || stats.size > MAX_MANIFEST_BYTES) return undefined;
    const bytes = Buffer.alloc(MAX_MANIFEST_BYTES + 1);
    const length = readSync(descriptor, bytes, 0, bytes.length, 0);
    if (length > MAX_MANIFEST_BYTES) return undefined;
    const manifest: unknown = JSON.parse(bytes.subarray(0, length).toString('utf8'));
    if (typeof manifest !== 'object' || manifest === null) return undefined;
    const entrypoint = 'entrypoint' in manifest ? manifest.entrypoint : undefined;
    if (
      !('layoutVersion' in manifest) ||
      manifest.layoutVersion !== 1 ||
      typeof entrypoint !== 'string' ||
      !entrypoint ||
      isAbsolute(entrypoint) ||
      entrypoint.includes('\\') ||
      /\p{Cc}/u.test(entrypoint)
    )
      return undefined;
    const candidate = resolve(cliRoot, entrypoint);
    const suffix = relative(cliRoot, candidate);
    if (!suffix || suffix === '..' || suffix.startsWith(`..${sep}`)) return undefined;
    return candidate;
  } catch {
    return undefined;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Optional metadata must not prevent the known-layout fallback.
      }
    }
  }
}
