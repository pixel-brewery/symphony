// #region Imports

import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IFeedbackIntakeSource } from '@symphony/domain-feedback';
import { MicrosoftTeamsFeedbackIntake } from './MicrosoftTeamsFeedbackIntake';
import { describe, expect, it, vi } from 'vitest';

// #endregion

const source: IFeedbackIntakeSource = {
  id: 'teams-feedback',
  workspaceId: 'personal',
  displayName: 'FLAMOX365 feedback',
  provider: 'microsoft-teams',
  tenantId: '00000000-0000-4000-8000-000000000001',
  clientId: '00000000-0000-4000-8000-000000000002',
  credentialRef: 'env:TEAMS_CLIENT_SECRET',
  teamId: '00000000-0000-4000-8000-000000000003',
  channelId: '19:feedback@thread.tacv2',
  targetWorkItemSourceId: 'github-project',
  targetRepositoryBindingId: 'repository',
  enabled: true,
};

function settings(): IApplicationSettings {
  return { ...createDefaultApplicationSettings('/tmp'), feedbackIntakeSources: [source] };
}

function cardContent(): string {
  return JSON.stringify({
    type: 'AdaptiveCard',
    body: [
      {
        type: 'Container',
        items: [
          { type: 'TextBlock', text: 'FLAMOX365 Feedback · FEATURE_REQUEST · HIGH' },
          { type: 'TextBlock', text: 'Add keyboard navigation to the task board.' },
        ],
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Type', value: 'FEATURE_REQUEST' },
          { title: 'Urgency', value: 'HIGH' },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Open feedback in FLAMOX365',
        url: 'https://flamox.example/main/feedback/feedback-1',
      },
    ],
  });
}

describe('MicrosoftTeamsFeedbackIntake', () => {
  it('reads a FLAMOX365 card and one @Symphony reply as a provider-neutral signal', async () => {
    // arrange
    const requests: string[] = [];
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      requests.push(String(input));
      if (String(input).includes('/oauth2/v2.0/token')) {
        return Response.json({ access_token: 'access-token' });
      }
      return Response.json({
        value: [
          {
            id: 'root-message',
            createdDateTime: '2030-01-01T10:00:00.000Z',
            webUrl: 'https://teams.microsoft.com/l/message/root',
            body: { content: '' },
            mentions: [],
            attachments: [
              {
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: cardContent(),
              },
            ],
            replies: [
              {
                id: 'reply-message',
                createdDateTime: '2030-01-01T10:05:00.000Z',
                webUrl: 'https://teams.microsoft.com/l/message/reply',
                body: {
                  content: '<div><at id="0">Symphony</at> Please turn this into a ticket.</div>',
                },
                from: { user: { displayName: 'Ada Lovelace' } },
                mentions: [{ mentionText: 'Symphony' }],
                attachments: [],
                replies: [],
              },
            ],
          },
        ],
      });
    });
    const intake = new MicrosoftTeamsFeedbackIntake({
      settings,
      credential: () => 'client-secret',
      fetcher,
      wait: async () => undefined,
    });

    // act
    const signals = await intake.listSignals();

    // assert
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      sourceId: source.id,
      workspaceId: source.workspaceId,
      title: 'FLAMOX365 Feedback · FEATURE_REQUEST · HIGH',
      actor: 'Ada Lovelace',
      externalUrl: 'https://teams.microsoft.com/l/message/reply',
    });
    expect(signals[0]?.prompt).toContain('Add keyboard navigation to the task board.');
    expect(signals[0]?.prompt).toContain('Please turn this into a ticket.');
    expect(signals[0]?.marker).toMatch(/^<!-- symphony-feedback-intake:[a-f0-9]{64} -->$/u);
    expect(requests.some((request) => request.includes('$expand=replies'))).toBe(true);
  });

  it('ignores ordinary Teams messages and cards without an explicit Symphony request', async () => {
    // arrange
    const fetcher = vi.fn<typeof fetch>(async (input) =>
      String(input).includes('/oauth2/v2.0/token')
        ? Response.json({ access_token: 'access-token' })
        : Response.json({
            value: [
              {
                id: 'root-message',
                createdDateTime: '2030-01-01T10:00:00.000Z',
                body: { content: '' },
                mentions: [],
                attachments: [
                  {
                    contentType: 'application/vnd.microsoft.card.adaptive',
                    content: cardContent(),
                  },
                ],
                replies: [],
              },
            ],
          }),
    );
    // act
    const intake = new MicrosoftTeamsFeedbackIntake({
      settings,
      credential: () => 'client-secret',
      fetcher,
    });

    // assert
    await expect(intake.listSignals()).resolves.toEqual([]);
  });

  it('returns a secret-safe authorization failure', async () => {
    // act
    // arrange
    const intake = new MicrosoftTeamsFeedbackIntake({
      settings,
      credential: () => 'never-log-this-secret',
      fetcher: vi.fn<typeof fetch>(
        async () => new Response('sensitive tenant response', { status: 401 }),
      ),
    });

    // assert
    await expect(intake.testSource(source)).rejects.toThrow(
      'Microsoft Teams authentication failed.',
    );
    await expect(intake.testSource(source)).rejects.not.toThrow(/never-log|sensitive/iu);
  });

  it('retries a rate-limited Graph request and follows a trusted next page', async () => {
    // arrange
    let graphRequests = 0;
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes('/oauth2/v2.0/token')) {
        return Response.json({ access_token: 'access-token' });
      }
      graphRequests += 1;
      if (graphRequests === 1) {
        return new Response('', { status: 429, headers: { 'retry-after': '1' } });
      }
      if (url.includes('page=2')) {
        return Response.json({ value: [] });
      }
      return Response.json({
        value: [],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/teams/messages?page=2',
      });
    });
    const wait = vi.fn(async () => undefined);
    // act
    const intake = new MicrosoftTeamsFeedbackIntake({
      settings,
      credential: () => 'client-secret',
      fetcher,
      wait,
    });

    // assert
    await expect(intake.listSignals()).resolves.toEqual([]);
    expect(wait).toHaveBeenCalledWith(1_000);
    expect(graphRequests).toBe(3);
  });
});
