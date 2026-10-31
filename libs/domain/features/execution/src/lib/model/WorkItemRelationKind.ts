/** Analyzer classification for the relationship between otherwise independent work items. */
export type WorkItemRelationKind =
  'duplicate' | 'joint-delivery' | 'dependency' | 'collision' | 'unrelated';
