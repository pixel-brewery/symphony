// #region Imports

import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { RenderDownloadPage } from './RenderDownloadPage.mjs';

// #endregion

function release(version: string) {
  return {
    version,
    htmlUrl: `https://github.com/pixel-brewery/symphony/releases/tag/v${version}`,
    publishedAt: '2026-11-03T04:53:44Z',
    manifest: {
      schemaVersion: 1,
      version,
      sourceCommit: 'a'.repeat(40),
      createdAt: '2026-11-03T04:53:29.240Z',
      files: [
        { platform: 'darwin', name: `Symphony-darwin-arm64-${version}.dmg` },
        { platform: 'win32', name: 'SymphonySetup.exe' },
        { platform: 'linux', name: `symphony_${version}_arm64.deb` },
      ].map((file) => ({
        ...file,
        architecture: 'arm64',
        bytes: 1024 * 1024 * 42,
        sha256: 'b'.repeat(64),
        url: `https://github.com/pixel-brewery/symphony/releases/download/v${version}/${file.name}`,
      })),
    },
  };
}

function catalog() {
  return {
    schemaVersion: 1,
    stable: '0.1.26',
    canary: '0.1.26',
    releases: [release('0.1.26'), release('0.1.27')],
  };
}

describe('public download page', () => {
  it('links each platform to the exact selected Stable installer and checksum', () => {
    // arrange
    const data = catalog();

    // act
    const document = new JSDOM(RenderDownloadPage(data)).window.document;

    // assert
    for (const file of data.releases[0].manifest.files) {
      const download = document.querySelector(`[test-id="download-stable-${file.platform}"]`);
      expect(download?.getAttribute('href')).toBe(file.url);
      expect(download?.getAttribute('aria-label')).toContain('0.1.26');
      expect(
        document.querySelector(`[test-id="checksum-stable-${file.platform}"] code`)?.textContent,
      ).toBe(file.sha256);
    }
    expect(document.querySelector('[test-id="stable-release-notes"]')?.getAttribute('href')).toBe(
      data.releases[0].htmlUrl,
    );
    expect(document.querySelector('#canary')).toBeNull();
  });

  it('keeps a separately selected Canary version visible with its own downloads', () => {
    // arrange
    const data = { ...catalog(), canary: '0.1.27' };

    // act
    const document = new JSDOM(RenderDownloadPage(data)).window.document;

    // assert
    expect(
      document.querySelector('[test-id="download-stable-darwin"]')?.getAttribute('href'),
    ).toContain('/v0.1.26/');
    expect(
      document.querySelector('[test-id="download-canary-darwin"]')?.getAttribute('href'),
    ).toContain('/v0.1.27/');
    expect(document.querySelectorAll('a[test-id^="download-"]')).toHaveLength(6);
    expect(document.querySelector('[test-id="canary-release-notes"]')?.getAttribute('href')).toBe(
      data.releases[1].htmlUrl,
    );
  });

  it('rejects injected names and executable download destinations', () => {
    // arrange
    const injectedName = catalog();
    injectedName.releases[0].manifest.files[0].name = '"><img src=x onerror=alert(1)>';
    const injectedUrl = catalog();
    injectedUrl.releases[0].manifest.files[0].url = 'javascript:alert(1)';

    // act
    const renderInjectedName = () => RenderDownloadPage(injectedName);
    const renderInjectedUrl = () => RenderDownloadPage(injectedUrl);

    // assert
    expect(renderInjectedName).toThrow(/valid macOS ARM64 installer/u);
    expect(renderInjectedUrl).toThrow(/valid macOS ARM64 installer/u);
  });

  it('rejects links to release notes outside the canonical GitHub tag', () => {
    // arrange
    const data = catalog();
    data.releases[0].htmlUrl = 'https://github.com.evil.example/releases/tag/v0.1.26';

    // act
    const render = () => RenderDownloadPage(data);

    // assert
    expect(render).toThrow(/canonical public GitHub tag URL/u);
  });

  it('does not interpolate untrusted annotations from release metadata', () => {
    // arrange
    const data = catalog();
    data.releases[0].manifest.sourceCommit = '<script>alert("metadata")</script>';

    // act
    const document = new JSDOM(RenderDownloadPage(data)).window.document;

    // assert
    expect(document.querySelector('script')).toBeNull();
    expect(document.documentElement.textContent).not.toContain('alert("metadata")');
  });

  it('refuses missing channel releases or incomplete platform downloads', () => {
    // arrange
    const missingChannel = { ...catalog(), stable: '0.1.25' };
    const incomplete = catalog();
    incomplete.releases[0].manifest.files.pop();

    // act
    const renderMissing = () => RenderDownloadPage(missingChannel);
    const renderIncomplete = () => RenderDownloadPage(incomplete);

    // assert
    expect(renderMissing).toThrow(/complete published release/u);
    expect(renderIncomplete).toThrow(/invalid or duplicate release metadata/u);
  });
});
