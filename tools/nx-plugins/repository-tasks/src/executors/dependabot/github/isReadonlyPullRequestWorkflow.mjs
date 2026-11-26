// #region Imports
import { createHash } from 'node:crypto';
// #endregion

function pinInvariant(text) {
  return text
    .split('\n')
    .map((line) => {
      const match =
        /^([ ]*(?:-\s+)?uses:\s+)([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*)@([a-f0-9]{40})(?:[ ]+#\s*v?\d+(?:\.\d+)*(?:[.+-][a-zA-Z0-9_.-]+)?)?[ ]*$/u.exec(
          line,
        );
      return match ? `${match[1]}${match[2]}@PIN` : line;
    })
    .join('\n');
}

/**
 * Binds immutable CI source to the trusted fixed review attestation.
 *
 * @param mainSource - Verified Git-blob source from the current protected main commit.
 * @param pullRequestSource - Verified Git-blob source from the exact bot head.
 * @param reviewedCiSha256 - Fixed lowercase SHA256 from the trusted Main policy, never from event, PR or API data.
 * @returns Whether Main matches the explicitly reviewed pin-invariant baseline and the PR preserves that exact normalized source.
 * @remarks Only complete same-owner/path action pins and supported version comments are normalized. Intentional CI logic changes require a new review and explicit policy update; no parser or runtime learning chooses authority.
 *
 * @internal
 */
export function isReadonlyPullRequestWorkflow(mainSource, pullRequestSource, reviewedCiSha256) {
  if (
    typeof mainSource !== 'string' ||
    typeof pullRequestSource !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(reviewedCiSha256 ?? '')
  )
    return false;
  const reviewed = pinInvariant(mainSource);
  return (
    createHash('sha256').update(reviewed, 'utf8').digest('hex') === reviewedCiSha256 &&
    reviewed === pinInvariant(pullRequestSource)
  );
}
