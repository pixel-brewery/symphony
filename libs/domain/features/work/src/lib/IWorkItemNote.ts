// #region Imports

import type { IWorkItemNoteDetail } from './IWorkItemNoteDetail';
import type { WorkItemNoteKind } from './WorkItemNoteKind';

// #endregion

/**
 * Provider-neutral note Symphony publishes on the tracked item.
 *
 * A run result that exists only inside Symphony is invisible to everyone who follows the ticket,
 * so every completed step - analysis, implementation, pull-request handoff, acceptance - is
 * written back to the work tracker as well. The application composes the text; how a note
 * becomes a provider record - an issue comment, a work-item discussion entry - stays inside the
 * adapter.
 */
export interface IWorkItemNote {
  /** Which run result the note carries, so an adapter can label or route it. */
  kind: WorkItemNoteKind;
  /** Short headline the adapter renders above the body. */
  heading: string;
  /** GitHub-flavored Markdown body, already complete. */
  body: string;
  /** Labelled facts the adapter renders between the headline and the body. */
  details?: readonly IWorkItemNoteDetail[];
}
