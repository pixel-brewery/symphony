export interface IProjectItemDocument {
  readonly id: string;
  readonly title?: string;
  readonly labels?: readonly string[];
  readonly assignees?: readonly string[];
  readonly content?: {
    readonly id?: string;
    readonly body?: string;
    readonly createdAt?: string;
    readonly number?: number;
    readonly repository?: string;
    readonly title?: string;
    readonly type?: string;
    readonly updatedAt?: string;
    readonly url?: string;
  };
}
