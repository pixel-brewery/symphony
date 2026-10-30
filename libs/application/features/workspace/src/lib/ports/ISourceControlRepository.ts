export interface ISourceControlRepository {
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly defaultBranch: string;
  readonly externalUrl?: string;
}
