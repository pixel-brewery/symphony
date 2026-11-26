// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserMobileCompanionClient } from './BrowserMobileCompanionClient';
// #endregion

const clients: BrowserMobileCompanionClient[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) await client.dispose();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  history.replaceState(null, '', '/');
});

describe('BrowserMobileCompanionClient', () => {
  it('recovers the same SDK pairing attempt after a lost response and stores no challenge or bearer in session storage', async () => {
    // arrange
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    const challenge = 'q'.repeat(43);
    history.replaceState(
      null,
      '',
      '/#' +
        new URLSearchParams({
          pair: challenge,
          app: 'symphony',
          host: 'test-host',
          expires: expiresAt,
        }),
    );
    const host = {
      identity: { appId: 'symphony', hostId: 'test-host' },
      name: 'Symphony',
      protocolVersion: 1,
      endpoints: [{ id: 'lan-http', transportId: 'lan-http', origin: location.origin }],
    };
    const attempts: string[] = [];
    let lost = true;
    const fetchRequest = vi.fn<typeof fetch>(async (input, options) => {
      const url = String(input);
      if (url.endsWith('/host'))
        return new Response(JSON.stringify(host), {
          headers: { 'content-type': 'application/json' },
        });
      if (url.endsWith('/session')) return new Response('{}', { status: 401 });
      if (url.endsWith('/pairings')) {
        const request = JSON.parse(String(options?.body)) as { attemptId: string };
        attempts.push(request.attemptId);
        if (lost) {
          lost = false;
          throw new Error('Lost pairing response.');
        }
        return new Response(
          JSON.stringify({
            status: 'paired',
            session: {
              host,
              principal: { ...host.identity, deviceId: 'device', capabilities: ['symphony:read'] },
            },
          }),
          { headers: { 'content-type': 'application/json' } },
        );
      }
      throw new Error('Unexpected request.');
    });
    vi.stubGlobal('fetch', fetchRequest);
    const first = new BrowserMobileCompanionClient(document);
    clients.push(first);
    // act
    await expect(first.initialize()).rejects.toThrow();
    expect(JSON.stringify(Object.entries(sessionStorage))).not.toContain(challenge);
    await first.dispose();
    const restored = new BrowserMobileCompanionClient(document);
    clients.push(restored);
    expect(await restored.initialize()).toBe(true);
    // assert
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toBe(attempts[0]);
    expect(location.hash).toBe('');
    expect(sessionStorage.length).toBe(0);
  });
});
