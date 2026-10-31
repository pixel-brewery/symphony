/**
 * Selects the workspace glyph independently of its existing color.
 * Missing selections retain the workspace short-code fallback.
 *
 * @public
 */
export type WorkspaceAvatar =
  | { readonly kind: 'icon'; readonly value: string }
  | { readonly kind: 'emoji'; readonly value: string }
  | { readonly kind: 'monogram'; readonly value: string };
