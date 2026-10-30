export interface IAnalysisDependency {
  readonly workItemId: string;
  readonly type: 'hard' | 'soft';
  readonly note?: string;
}
