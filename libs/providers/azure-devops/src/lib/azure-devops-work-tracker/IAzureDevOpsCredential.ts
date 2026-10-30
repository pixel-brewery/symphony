export interface IAzureDevOpsCredential {
  readonly scheme: 'Basic' | 'Bearer';
  readonly token: string;
}
