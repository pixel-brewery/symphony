// #region Imports

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// #endregion

const proseExtension = /\.(?:md|mdx|markdown|rst|adoc|asciidoc)$/iu;
const imageExtension = /\.(?:png|jpe?g|gif|webp|svg)$/iu;
const operationalPath =
  /(?:^|\/)(?:\.agents|\.claude|\.codex|\.opencode|\.vscode|\.design-sync|\.ds-sync|prompts?|skills?)(?:\/|$)/iu;

function documentationPath(path) {
  if (
    operationalPath.test(path) ||
    /(?:^|\/)(?:AGENTS|CLAUDE|CODEX|GEMINI|SKILL)\.md$/iu.test(path) ||
    /\/\.github\//iu.test(path)
  ) {
    return false;
  }
  if (path.startsWith('.github/')) {
    return path.startsWith('.github/assets/') && imageExtension.test(path);
  }
  return (
    proseExtension.test(path) ||
    /^(?:LICENSE|NOTICE|COPYING)(?:\.txt)?$/iu.test(path) ||
    (path.startsWith('docs/') && /\.txt$/iu.test(path)) ||
    /(?:^|\/)README[^/]*\.txt$/iu.test(path) ||
    (path.startsWith('docs/') && imageExtension.test(path))
  );
}

/**
 * Classifies the complete event diff before dependency installation or verification.
 *
 * @param {{eventName: string, event: object}} context Trusted GitHub event metadata.
 * @param {{cwd?: string}} options Checkout containing both event revisions.
 * @returns {{documentationOnly: boolean, documentationChanged: boolean, reason: string}}
 * Explicit documentation-only decision, documentation impact and diagnostic reason.
 * @public
 */
export function ClassifyCiChanges(context, { cwd = process.cwd() } = {}) {
  const full = (reason) => ({
    documentationOnly: false,
    documentationChanged: true,
    reason,
  });
  const event = context?.event ?? {};
  let base;
  let head;
  switch (context?.eventName) {
    case 'pull_request':
      base = event.pull_request?.base?.sha;
      head = event.pull_request?.head?.sha;
      break;
    case 'merge_group':
      base = event.merge_group?.base_sha;
      head = event.merge_group?.head_sha;
      break;
    case 'push':
      base = event.before;
      head = event.after;
      break;
    default:
      return full('Manual, reusable or unknown event requires full verification.');
  }
  const completeSha = (sha) => typeof sha === 'string' && /^[a-f0-9]{40}$/u.test(sha);
  if (![base, head].every(completeSha) || /^0+$/u.test(base) || /^0+$/u.test(head)) {
    return full('Missing, initial or invalid event revisions require full verification.');
  }
  const git = (args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  try {
    git(['cat-file', '-e', `${base}^{commit}`]);
    git(['cat-file', '-e', `${head}^{commit}`]);
    if (context.eventName === 'pull_request') {
      base = git(['merge-base', base, head]).trim();
    }
  } catch {
    return full('Unavailable event history requires full verification.');
  }
  // Disabling rename detection keeps both a removed source and its new destination.
  // NUL separators preserve spaces, quotes and newlines in repository filenames.
  const paths = git(['diff', '--no-renames', '--name-only', '-z', base, head, '--'])
    .split('\0')
    .filter(Boolean);
  if (paths.length === 0) return full('An empty diff requires full verification.');
  const documentationOnly = paths.every(documentationPath);
  return {
    documentationOnly,
    documentationChanged: paths.some((path) => path.startsWith('docs/')),
    reason: documentationOnly
      ? 'Only documentation prose or documentation artwork changed.'
      : 'Code, configuration, operational instructions or unknown files changed.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const classification = ClassifyCiChanges({
    eventName: process.env.GITHUB_EVENT_NAME,
    event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
  });
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `documentation_only=${classification.documentationOnly}\ndocumentation_changed=${classification.documentationChanged}\n`,
    );
  }
  console.log(classification.reason);
}
