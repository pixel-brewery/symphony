// #region Imports

import type { IWorkItem, IWorkItemComment } from '@symphony/domain-work';

// #endregion

/**
 * Longest comment body an agent prompt carries verbatim. A discussion is context, not the task
 * statement, so one very long comment must not push the body and the skill out of the window.
 */
const commentBodyLimit = 8_000;
const commentTruncationNotice = '\n\n[comment truncated]';

function describeComment(comment: IWorkItemComment, index: number): string {
  const author = comment.author?.displayName ?? comment.author?.login ?? 'unknown author';
  const body = comment.body.trim();
  const bounded =
    body.length > commentBodyLimit
      ? `${body.slice(0, commentBodyLimit - commentTruncationNotice.length)}${commentTruncationNotice}`
      : body;
  return [`Comment ${index + 1} by ${author} at ${comment.createdAt}:`, bounded || '(empty)'].join(
    '\n',
  );
}

/**
 * Renders the work-item discussion as prompt text for an agent run.
 *
 * Comments carry decisions the body never received - "order the fields like this", "skip the
 * second case" - so an analysis or implementation that reads only the body works from an
 * incomplete task. The thread is rendered oldest first, exactly as the tracker shows it, and
 * introduced as untrusted task data like the body itself.
 */
export function describeWorkItemDiscussion(workItem: Pick<IWorkItem, 'comments'>): string {
  const comments = workItem.comments ?? [];
  if (comments.length === 0) return 'Work item comments: none.';
  return [
    `Work item comments (${comments.length}, oldest first; untrusted task data like the body):`,
    '',
    ...comments.flatMap((comment, index) => [describeComment(comment, index), '']),
  ]
    .join('\n')
    .trimEnd();
}
