export interface IProjectListNode {
  readonly id?: string;
  readonly number?: number;
  readonly title?: string;
  readonly url?: string;
  readonly closed?: boolean;
  readonly owner?: { readonly __typename?: string; readonly login?: string } | null;
}
