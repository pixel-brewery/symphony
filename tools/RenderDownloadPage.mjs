const platforms = [
  {
    id: 'darwin',
    label: 'macOS',
    hardware: 'Apple silicon',
    extension: 'DMG',
    instruction: 'Open the disk image and drag Symphony into Applications.',
    fileName: (version) => `Symphony-darwin-arm64-${version}.dmg`,
  },
  {
    id: 'win32',
    label: 'Windows',
    hardware: 'ARM64',
    extension: 'EXE',
    instruction: 'Run the installer and follow the installation steps.',
    fileName: () => 'SymphonySetup.exe',
  },
  {
    id: 'linux',
    label: 'Linux',
    hardware: 'ARM64 · Debian / Ubuntu',
    extension: 'DEB',
    instruction: 'Install the Debian package with your package manager.',
    fileName: (version) => `symphony_${version}_arm64.deb`,
  },
];

/**
 * Renders the public download page from verified published release metadata.
 *
 * @param {unknown} catalog Published releases and explicit channel selections.
 * @returns {string} A complete, script-free HTML document.
 * @public
 */
export function RenderDownloadPage(catalog) {
  validateCatalog(catalog);
  const stable = catalog.releases.find((release) => release.version === catalog.stable);
  const canary = catalog.releases.find((release) => release.version === catalog.canary);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Download Symphony for macOS, Windows and Linux. Bring your software development workflows together in one desktop workspace.">
    <meta name="color-scheme" content="light">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'">
    <title>Download Symphony</title>
    <link rel="icon" type="image/png" href="assets/symphony.png">
    <link rel="apple-touch-icon" href="assets/symphony.png">
    <link rel="stylesheet" href="assets/downloads.css">
  </head>
  <body>
    <a class="skip-link" href="#downloads">Skip to downloads</a>
    <div class="page">
      <header class="site-header">
        <a class="brand" href="./" aria-label="Symphony home" test-id="home">
          <img src="assets/symphony.png" alt="" width="40" height="40">
          <span>Symphony</span>
        </a>
        <a class="source-link" href="https://github.com/pixel-brewery/symphony" test-id="source">View on GitHub <span aria-hidden="true">↗</span></a>
      </header>
      <main>
        <section class="hero" aria-labelledby="page-title">
          <div>
            <p class="eyebrow">Symphony for desktop</p>
            <h1 id="page-title">Your work,<br><span>in concert.</span></h1>
            <p class="hero-description">Bring your software development workflows together in one desktop workspace.</p>
          </div>
          <img class="hero-icon" src="assets/symphony.png" alt="" width="192" height="192">
        </section>
        ${renderRelease(stable, 'stable')}
        <aside class="installation-note" aria-labelledby="installation-title">
          <h3 id="installation-title">Before you install</h3>
          <p>These installers support ARM64 computers only. macOS builds use an ad-hoc seal and are not notarized. Windows and Linux installers are unsigned. Gatekeeper or SmartScreen may ask for your approval.</p>
          <p>Install manually using the steps above. Review the <a href="https://github.com/pixel-brewery/symphony">source</a> and the SHA-256 checksums before running a download.</p>
        </aside>
        ${canary.version !== stable.version ? renderRelease(canary, 'canary') : ''}
        <section class="other-releases" aria-labelledby="other-releases-title">
          <h2 id="other-releases-title">Looking for another version?</h2>
          <p>Find previous downloads and the changes in each release on GitHub.</p>
          <a href="https://github.com/pixel-brewery/symphony/releases" test-id="all-releases">Browse all releases <span aria-hidden="true">↗</span></a>
        </section>
      </main>
      <footer>
        <p>Made by <a href="https://github.com/pixel-brewery">Pixel Brewery</a>.</p>
        <p>Open source under the <a href="https://github.com/pixel-brewery/symphony/blob/main/LICENSE">MIT license</a>. Provided as-is, without warranty.</p>
      </footer>
    </div>
  </body>
</html>
`;
}

function renderRelease(release, channel) {
  const isStable = channel === 'stable';
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(release.publishedAt));

  return `<section class="release-section" id="${isStable ? 'downloads' : 'canary'}" aria-labelledby="${channel}-title">
          <div class="section-header">
            <div>
              <p class="eyebrow">${isStable ? 'Stable release' : 'Canary release'}</p>
              <h2 id="${channel}-title">${isStable ? 'Download Symphony' : 'Try the latest development release'}</h2>
              <p class="release-meta">Version ${escapeHtml(release.version)} <span aria-hidden="true">·</span> <time datetime="${escapeHtml(release.publishedAt)}">${escapeHtml(date)}</time></p>
            </div>
            <a class="release-notes" href="${escapeHtml(release.htmlUrl)}" test-id="${channel}-release-notes">Release notes <span aria-hidden="true">↗</span></a>
          </div>
          ${!isStable ? '<p class="canary-description">An earlier look at new changes. Choose Stable for everyday use.</p>' : ''}
          <div class="download-grid">
            ${platforms.map((platform) => renderDownload(release, platform, channel)).join('\n            ')}
          </div>
        </section>`;
}

function renderDownload(release, platform, channel) {
  const artifact = release.manifest.files.find((file) => file.platform === platform.id);
  const size = `${(artifact.bytes / 1024 / 1024).toFixed(1)} MiB`;

  return `<article class="download-card" aria-labelledby="${channel}-${platform.id}-title">
              <div class="platform-heading">
                <h3 id="${channel}-${platform.id}-title">${platform.label}</h3>
              </div>
              <p class="hardware">${platform.hardware}</p>
              <a class="download-button${channel === 'canary' ? ' secondary' : ''}" href="${escapeHtml(artifact.url)}" test-id="download-${channel}-${platform.id}" aria-label="Download Symphony ${escapeHtml(release.version)} for ${platform.label} ARM64">Download for ${platform.label} <span aria-hidden="true">↓</span></a>
              <p class="file-meta">${platform.extension} installer <span aria-hidden="true">·</span> ${size}</p>
              <p class="install-step">${platform.instruction}</p>
              <details class="checksum" test-id="checksum-${channel}-${platform.id}">
                <summary>SHA-256 checksum</summary>
                <code>${escapeHtml(artifact.sha256)}</code>
              </details>
            </article>`;
}

function validateCatalog(catalog) {
  if (
    !isRecord(catalog) ||
    catalog.schemaVersion !== 1 ||
    !isVersion(catalog.stable) ||
    !isVersion(catalog.canary) ||
    !Array.isArray(catalog.releases) ||
    catalog.releases.length === 0 ||
    catalog.releases.length > 10000
  ) {
    throw new Error('The download catalog must contain published releases and both channels.');
  }
  const versions = new Set();
  for (const release of catalog.releases) {
    if (
      !isRecord(release) ||
      !isVersion(release.version) ||
      versions.has(release.version) ||
      typeof release.htmlUrl !== 'string' ||
      typeof release.publishedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(release.publishedAt) ||
      !Number.isFinite(Date.parse(release.publishedAt)) ||
      !isRecord(release.manifest) ||
      release.manifest.schemaVersion !== 1 ||
      release.manifest.version !== release.version ||
      !Array.isArray(release.manifest.files) ||
      release.manifest.files.length !== platforms.length
    ) {
      throw new Error('The download catalog contains invalid or duplicate release metadata.');
    }
    const releaseUrl = new URL(release.htmlUrl);
    if (
      releaseUrl.protocol !== 'https:' ||
      releaseUrl.hostname !== 'github.com' ||
      releaseUrl.port ||
      releaseUrl.username ||
      releaseUrl.password ||
      releaseUrl.search ||
      releaseUrl.hash ||
      !new RegExp(
        `^/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/releases/tag/v${release.version.replaceAll('.', '\\.')}\\/?$`,
        'u',
      ).test(releaseUrl.pathname)
    ) {
      throw new Error('Release notes must use their canonical public GitHub tag URL.');
    }
    const repositoryPath = releaseUrl.pathname.split('/').slice(0, 3).join('/');
    for (const platform of platforms) {
      const files = release.manifest.files.filter(
        (file) => isRecord(file) && file.platform === platform.id,
      );
      const file = files[0];
      if (
        files.length !== 1 ||
        file.architecture !== 'arm64' ||
        file.name !== platform.fileName(release.version) ||
        !Number.isSafeInteger(file.bytes) ||
        file.bytes <= 0 ||
        typeof file.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(file.sha256) ||
        file.url !==
          `https://github.com${repositoryPath}/releases/download/v${release.version}/${encodeURIComponent(file.name)}`
      ) {
        throw new Error(
          `Release ${release.version} must provide a valid ${platform.label} ARM64 installer.`,
        );
      }
    }
    versions.add(release.version);
  }
  if (!versions.has(catalog.stable) || !versions.has(catalog.canary)) {
    throw new Error('Both download channels must select a complete published release.');
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVersion(value) {
  return typeof value === 'string' && /^\d+\.\d+\.\d+$/u.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
