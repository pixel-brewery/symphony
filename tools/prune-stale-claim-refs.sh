#!/usr/bin/env bash
# tools/prune-stale-claim-refs.sh
#
# Deletes leaked Symphony claim references from a repository. A claim reference is leaked when
# the run that acquired it died hard: release deletes the reference, a crash does not. Only
# references without a lease are removed - a lease means another orchestrator may still own the
# work item, and deleting it would let a second machine claim the same work.
#
# Usage: tools/prune-stale-claim-refs.sh <owner/repo> [--dry-run]
set -euo pipefail

repository="${1:?Usage: prune-stale-claim-refs.sh <owner/repo> [--dry-run]}"
dry_run="${2:-}"

gh api "repos/${repository}/git/matching-refs/heads/symphony/claims" --jq '.[] | [.ref, .object.sha] | @tsv' |
  while IFS=$'\t' read -r ref sha; do
    message="$(gh api "repos/${repository}/git/commits/${sha}" --jq '.message')"
    subject="$(printf '%s' "${message}" | head -1)"
    if printf '%s' "${message}" | grep -q '^Lease-Until:'; then
      printf 'keep     %s  (%s)\n' "${ref#refs/heads/}" "${subject}"
      continue
    fi
    if [ "${dry_run}" = '--dry-run' ]; then
      printf 'would delete  %s  (%s)\n' "${ref#refs/heads/}" "${subject}"
      continue
    fi
    gh api -X DELETE "repos/${repository}/git/${ref}" >/dev/null
    printf 'deleted  %s  (%s)\n' "${ref#refs/heads/}" "${subject}"
  done
