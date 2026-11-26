// #region Imports
import { EventEmitter } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { WebSocket } from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ISymphonyMobileApplicationDependencies } from './interfaces/ISymphonyMobileApplicationDependencies';
import { SymphonyMobileApplicationAdapter } from './SymphonyMobileApplicationAdapter';
// #endregion

const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

describe('SymphonyMobileApplicationAdapter', () => {
  it('does not dispatch a product write after revocation interrupts asynchronous metadata validation', async () => {
    // arrange
    let completeMetadata!: (
      value: Awaited<ReturnType<ISymphonyMobileApplicationDependencies['workItemCreationContext']>>,
    ) => void;
    const metadata = vi.fn(
      () =>
        new Promise<
          Awaited<ReturnType<ISymphonyMobileApplicationDependencies['workItemCreationContext']>>
        >((resolve) => {
          completeMetadata = resolve;
        }),
    );
    const unused = async (): Promise<never> => {
      throw new Error('Unexpected domain operation.');
    };
    const createWorkItem = vi.fn(unused);
    const adapter = new SymphonyMobileApplicationAdapter({
      desktopName: 'Symphony',
      remoteAutomationEnabled: () => false,
      snapshot: unused,
      workItemCreationContext: metadata,
      createWorkItem,
      draftIssue: unused,
      cancelIssueDraft: () => false,
      startAnalyzer: unused,
      startSolver: unused,
      cancelExecution: unused,
      removeQueueEntry: () => {
        throw new Error('Unexpected queue operation.');
      },
      publishPullRequest: unused,
      moveWorkItem: unused,
      decideWorkflow: unused,
    });
    const controller = new AbortController();
    const server = createServer((request, response) => {
      void adapter.handle(request, response, {
        requestId: 'request',
        operationId: 'mobile.work-item.create',
        principal: {
          appId: 'symphony',
          hostId: 'installation',
          deviceId: 'device',
          capabilities: ['symphony:work-items'],
        },
        signal: controller.signal,
      });
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('The test listener has no numeric address.');
    const pending = fetch(`http://127.0.0.1:${address.port}/api/mobile/v1/work-items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace',
        title: 'Mobile request',
        body: '',
        repository: 'example/project',
        projectFields: [],
        labels: [],
        assignees: [],
      }),
    });
    const outcome = pending.then(
      () => 'responded',
      () => 'cancelled',
    );
    await vi.waitFor(() => expect(metadata).toHaveBeenCalledTimes(1));
    // act
    controller.abort();
    completeMetadata({
      workspaceId: 'workspace',
      workspaceName: 'Workspace',
      metadata: {
        repositories: ['example/project'],
        labels: [],
        assignees: [],
        states: [],
        projectFields: [],
      },
    });
    // assert
    expect(await outcome).toBe('cancelled');
    expect(createWorkItem).not.toHaveBeenCalled();
  });

  it('reports only a device gaining its first or losing its last event connection', async () => {
    // arrange
    const unused = async (): Promise<never> => {
      throw new Error('Unexpected domain operation.');
    };
    const adapter = new SymphonyMobileApplicationAdapter({
      desktopName: 'Symphony',
      remoteAutomationEnabled: () => false,
      snapshot: unused,
      workItemCreationContext: unused,
      createWorkItem: unused,
      draftIssue: unused,
      cancelIssueDraft: () => false,
      startAnalyzer: unused,
      startSolver: unused,
      cancelExecution: unused,
      removeQueueEntry: () => {
        throw new Error('Unexpected queue operation.');
      },
      publishPullRequest: unused,
      moveWorkItem: unused,
      decideWorkflow: unused,
    });
    const changed = vi.fn();
    const release = adapter.subscribeConnections(changed);
    const revocation = new AbortController();
    const context = (deviceId: string, signal: AbortSignal) => ({
      requestId: 'events',
      operationId: 'mobile.events',
      principal: {
        appId: 'symphony',
        hostId: 'installation',
        deviceId,
        capabilities: ['symphony:read'],
      },
      signal,
    });
    // Only the close notification of the event socket matters to the connection projection.
    const first = new EventEmitter() as unknown as WebSocket;
    const second = new EventEmitter() as unknown as WebSocket;
    const other = new EventEmitter() as unknown as WebSocket;
    // act
    await adapter.webSocket(first, context('phone', revocation.signal));
    await adapter.webSocket(second, context('phone', revocation.signal));
    await adapter.webSocket(other, context('tablet', new AbortController().signal));
    first.emit('close');
    const whileStillConnected = changed.mock.calls.length;
    revocation.abort();
    second.emit('close');
    release();
    other.emit('close');
    // assert
    expect(whileStillConnected).toBe(2);
    expect(changed).toHaveBeenCalledTimes(3);
    expect([...adapter.connectedDeviceIds()]).toEqual([]);
  });
});
