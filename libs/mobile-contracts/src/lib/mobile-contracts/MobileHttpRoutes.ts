/**
 * Names the complete Symphony product route family, separate from SDK pairing and session endpoints.
 *
 * @public
 */
export const mobileHttpRoutes = {
  /**
   * Scoped current mobile product state.
   */
  snapshot: '/api/mobile/v1/snapshot',
  /**
   * Explicit current ticket and execution actions.
   */
  command: '/api/mobile/v1/commands',
  /**
   * Current workspace and repository creation metadata.
   */
  workItemCreationContext: '/api/mobile/v1/work-items/creation-context',
  /**
   * Creation of one currently admitted work item.
   */
  workItemCreate: '/api/mobile/v1/work-items',
  /**
   * One identified AI-assisted product draft.
   */
  issueDraft: '/api/mobile/v1/work-items/draft',
  /**
   * Cancellation of the identified draft operation.
   */
  issueDraftCancel: '/api/mobile/v1/work-items/draft/cancel',
  /**
   * Authenticated bounded snapshot invalidation events.
   */
  events: '/api/mobile/v1/events',
} as const;
