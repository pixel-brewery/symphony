export type TaskDialogData =
  { readonly mode: 'create' } | { readonly mode: 'edit'; readonly workItemId: string };
