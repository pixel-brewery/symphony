export interface IWorkItemLinkPresentation {
  readonly url: string;
  readonly copyLabel: string;
  readonly openLabel: string;
  readonly openIconName: 'github' | 'azureDevOps' | 'open';
}
