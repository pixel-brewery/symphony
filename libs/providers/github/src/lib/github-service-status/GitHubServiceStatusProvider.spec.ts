// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { GitHubServiceStatusProvider } from './GitHubServiceStatusProvider';

// #endregion

function statusResponse(components: readonly object[]): Response {
  return new Response(JSON.stringify({ components }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('GitHubServiceStatusProvider', () => {
  it('maps disrupted components used by Symphony into one provider-neutral incident', async () => {
    // arrange
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      statusResponse([
        {
          name: 'Actions',
          status: 'major_outage',
          updated_at: '2026-08-26T15:23:10.602Z',
        },
        {
          name: 'Pull Requests',
          status: 'degraded_performance',
          updated_at: '2026-08-26T15:20:00.000Z',
        },
        {
          name: 'Pages',
          status: 'partial_outage',
          updated_at: '2026-08-26T15:25:00.000Z',
        },
      ]),
    );
    const provider = new GitHubServiceStatusProvider(fetchImplementation);

    // act
    const incidents = await provider.incidents(new AbortController().signal);

    // assert
    expect(incidents).toEqual([
      {
        id: 'github-service-status',
        providerName: 'GitHub',
        severity: 'outage',
        affectedComponents: ['Actions', 'Pull Requests'],
        affectedCapabilities: ['automation', 'pull-requests'],
        updatedAt: '2026-08-26T15:23:10.602Z',
      },
    ]);
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://www.githubstatus.com/api/v2/components.json',
      expect.objectContaining({ redirect: 'error' }),
    );
  });

  it('returns no incident while relevant components are operational', async () => {
    // arrange
    const provider = new GitHubServiceStatusProvider(
      vi.fn<typeof fetch>(async () =>
        statusResponse([
          {
            name: 'Actions',
            status: 'operational',
            updated_at: '2026-08-26T15:23:10.602Z',
          },
          {
            name: 'Pages',
            status: 'major_outage',
            updated_at: '2026-08-26T15:23:10.602Z',
          },
        ]),
      ),
    );

    // act
    const incidents = await provider.incidents(new AbortController().signal);

    // assert
    expect(incidents).toEqual([]);
  });
});
