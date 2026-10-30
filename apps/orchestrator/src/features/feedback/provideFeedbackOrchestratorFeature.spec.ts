// #region Imports
import { describe, expect, it, vi } from 'vitest';
import { type IFeedbackIntakePort } from '@symphony/application-feedback';
import { provideFeedbackOrchestratorFeature } from './provideFeedbackOrchestratorFeature';
// #endregion

describe('provideFeedbackOrchestratorFeature', () => {
  it('verifies the addressed source once through the consumed intake port', async () => {
    // arrange
    const verify: IFeedbackIntakePort['testSource'] = async () => ({
      status: 'completed',
      message: 'Verified',
    });
    const testSource = vi.fn(verify);
    const feature = provideFeedbackOrchestratorFeature({ feedbackIntake: { testSource } });
    const handler = feature.handlers[0];
    if (!handler) throw new Error('Feedback handler missing');
    const source = {
      id: 'feedback',
      workspaceId: 'workspace',
      displayName: 'Feedback',
      provider: 'microsoft-teams',
      tenantId: '00000000-0000-4000-8000-000000000001',
      clientId: '00000000-0000-4000-8000-000000000002',
      teamId: '00000000-0000-4000-8000-000000000003',
      channelId: 'channel',
      targetWorkItemSourceId: 'work',
      targetRepositoryBindingId: 'repository',
      enabled: true,
      credentialRef: 'env:TEAMS_TOKEN',
    };
    // act
    const answer = await handler.execute({ source }, () => undefined);
    // assert
    expect(answer).toEqual({ status: 'completed', message: 'Verified' });
    expect(testSource).toHaveBeenCalledExactlyOnceWith(source);
  });
});
