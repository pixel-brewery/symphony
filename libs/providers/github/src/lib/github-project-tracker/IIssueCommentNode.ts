export interface IIssueCommentNode {
  readonly id?: string;
  readonly databaseId?: number | null;
  readonly url?: string;
  readonly body?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly author?: { readonly login?: string; readonly avatarUrl?: string } | null;
}
