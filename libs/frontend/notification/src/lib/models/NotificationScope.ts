/**
 * What a notification belongs to: one workspace, or this Mac for machine-wide problems.
 *
 * @public
 */
export type NotificationScope =
  | { readonly kind: 'workspace'; readonly workspaceId: string; readonly name: string }
  | { readonly kind: 'mac' };
