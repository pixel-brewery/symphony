export interface IGoalReviewDecision {
  id: string;
  recordedAt: string;
  reviewerAgentId?: string;
  decision: 'approved' | 'revision-required' | 'blocked';
  message: string;
}
