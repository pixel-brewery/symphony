export interface IArtificialAnalysisModelDocument {
  readonly name?: string;
  readonly slug?: string;
  readonly release_date?: string;
  readonly evaluations?: {
    readonly artificial_analysis_intelligence_index?: number;
  };
}
