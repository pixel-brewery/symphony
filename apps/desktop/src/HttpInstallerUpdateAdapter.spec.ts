// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { HttpInstallerUpdateAdapter } from './HttpInstallerUpdateAdapter';

// #endregion

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    version: '0.1.11',
    platform: 'darwin',
    architecture: 'arm64',
    artifact: {
      name: 'Symphony-darwin-arm64-0.1.11.dmg',
      bytes: 123,
      sha256: 'a'.repeat(64),
      url: 'https://github.com/owner/symphony/releases/download/v0.1.11/Symphony-darwin-arm64-0.1.11.dmg',
    },
    ...overrides,
  };
}

describe('HttpInstallerUpdateAdapter', () => {
  it('returns a validated installer for the requested runtime target', async () => {
    // arrange
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Promise.resolve(Response.json(manifest())),
    );
    const adapter = new HttpInstallerUpdateAdapter(fetchImplementation);

    // act
    const result = await adapter.check({
      url: 'https://updates.example.com/channels/stable/darwin/arm64/installer.json',
      platform: 'darwin',
      architecture: 'arm64',
    });

    // assert
    expect(result).toEqual({
      version: '0.1.11',
      downloadUrl:
        'https://github.com/owner/symphony/releases/download/v0.1.11/Symphony-darwin-arm64-0.1.11.dmg',
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://updates.example.com/channels/stable/darwin/arm64/installer.json',
      expect.objectContaining({ redirect: 'follow' }),
    );
  });

  it('returns no installer when the channel manifest has not been published yet', async () => {
    // arrange
    const adapter = new HttpInstallerUpdateAdapter(
      vi.fn<typeof fetch>(async () => Promise.resolve(new Response('', { status: 404 }))),
    );

    // act
    const result = await adapter.check({
      url: 'https://updates.example.com/channels/stable/darwin/arm64/installer.json',
      platform: 'darwin',
      architecture: 'arm64',
    });

    // assert
    expect(result).toBeUndefined();
  });

  it('rejects a manifest for another target or an untrusted download URL', async () => {
    // arrange
    const wrongTarget = new HttpInstallerUpdateAdapter(
      vi.fn<typeof fetch>(async () => Promise.resolve(Response.json(manifest()))),
    );
    const credentialUrl = new HttpInstallerUpdateAdapter(
      vi.fn<typeof fetch>(async () =>
        Promise.resolve(
          Response.json(
            manifest({
              artifact: {
                name: 'Symphony.dmg',
                bytes: 123,
                sha256: 'a'.repeat(64),
                url: 'https://user:secret@example.com/Symphony.dmg',
              },
            }),
          ),
        ),
      ),
    );
    const feed = {
      url: 'https://updates.example.com/channels/stable/darwin/arm64/installer.json',
      platform: 'darwin' as const,
      architecture: 'arm64',
    };

    // act
    const targetCheck = wrongTarget.check({ ...feed, architecture: 'x64' });
    const urlCheck = credentialUrl.check(feed);

    // assert
    await expect(targetCheck).rejects.toThrow(/does not match/u);
    await expect(urlCheck).rejects.toThrow(/untrusted download URL/u);
  });
});
