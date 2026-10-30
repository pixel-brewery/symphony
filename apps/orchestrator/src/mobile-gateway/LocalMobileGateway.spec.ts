// #region Imports

import { createHash, randomBytes } from 'node:crypto';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MobileAccessService, type IMobileAccessRepository } from '@symphony/application-mobile';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { mobileSnapshotSchema, type PersistedMobileAccess } from '@symphony/mobile-contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalMobileGateway } from './';

// #endregion

class MemoryMobileAccessRepository implements IMobileAccessRepository {
  // #region Fields

  public value: PersistedMobileAccess = { version: 1, enabled: false, devices: [] };

  // #endregion

  // #region Methods

  public load(): PersistedMobileAccess {
    return this.value;
  }

  public save(settings: PersistedMobileAccess): PersistedMobileAccess {
    this.value = structuredClone(settings);
    return this.value;
  }

  // #endregion
}

describe('LocalMobileGateway', () => {
  let gateway: LocalMobileGateway | undefined;

  afterEach(async () => {
    await gateway?.stop();
  });

  it('serves the packaged app and requires an approved device for task actions', async () => {
    // arrange
    const repository = new MemoryMobileAccessRepository();
    const access = new MobileAccessService({
      repository,
      security: {
        randomToken: () => randomBytes(32).toString('base64url'),
        hash: (value) => createHash('sha256').update(value).digest('hex'),
      },
      now: () => new Date('2026-08-10T18:00:00.000Z'),
    });
    const assetsPath = await mkdtemp(join(tmpdir(), 'symphony-mobile-assets-'));
    mkdirSync(assetsPath, { recursive: true });
    writeFileSync(join(assetsPath, 'index.html'), '<!doctype html><title>Symphony Mobile</title>');
    const port = await availablePort();
    const startAnalyzer = vi.fn(async (workItemId: string) => ({
      outcome: 'started' as const,
      execution: await execution(workItemId),
    }));
    const moveWorkItem = vi.fn(async (workItemId: string) => ({
      ...snapshot().workItems[0]!,
      id: workItemId,
    }));
    const decideWorkflow = vi.fn(async () => undefined);
    const createWorkItem = vi.fn(async (input: { title: string }) => ({
      ...snapshot().workItems[0]!,
      id: 'ticket-created',
      externalId: '#2',
      title: input.title,
    }));
    const draftIssue = vi.fn(async () => ({
      title: 'AI-created ticket',
      body: 'Complete draft body',
      projectFields: [{ fieldId: 'status', type: 'single-select' as const, value: 'backlog' }],
      labels: ['mobile'],
      assignees: ['ada'],
    }));
    let currentSnapshot = snapshot();
    const reportRequestFailure = vi.fn();
    access.enable();
    gateway = new LocalMobileGateway({
      access,
      assetsPath,
      desktopName: 'Development Mac',
      remoteAutomationEnabled: () => true,
      snapshot: async () => currentSnapshot,
      employees: () => [
        {
          id: 'employee-1',
          workspaceId: 'workspace-1',
          displayName: 'Ada',
          positionId: 'position',
          routePolicyId: 'private-route',
          qualificationTags: [],
          enabled: true,
          appearance: { figure: 'dot', color: 'mint', accessories: [] },
        },
      ],
      workItemCreationContext: async () => ({
        workspaceId: 'workspace-1',
        workspaceName: 'Mobile workspace',
        metadata: {
          repositories: ['example/symphony'],
          labels: [{ name: 'mobile', color: '7524d8' }],
          assignees: [{ login: 'ada', displayName: 'Ada' }],
          states: [{ id: 'backlog', label: 'Backlog' }],
          projectFields: [
            {
              id: 'status',
              name: 'Status',
              role: 'workflow-state',
              type: 'single-select',
              options: [{ id: 'backlog', label: 'Backlog', stageId: 'backlog' }],
            },
          ],
          issueCreatorSkill: {
            id: 'create-change-request',
            name: 'Create change request',
            version: '1',
            description: 'Drafts work items.',
            capabilities: ['work-item-creation'],
            source: 'workspace',
          },
        },
      }),
      createWorkItem,
      draftIssue,
      cancelIssueDraft: () => true,
      startAnalyzer,
      startSolver: async (workItemId) => ({
        outcome: 'started' as const,
        execution: await execution(workItemId, 'solution'),
      }),
      removeQueueEntry: (entryId) => {
        throw new Error(`Unknown queue entry: ${entryId}`);
      },
      cancelExecution: async (executionId) => execution('ticket-1', 'analysis', executionId),
      publishPullRequest: async (executionId) => execution('ticket-1', 'solution', executionId),
      moveWorkItem,
      decideWorkflow,
      reportRequestFailure,
      host: '127.0.0.1',
      portStart: port,
      portEnd: port,
      now: () => new Date('2026-08-10T18:00:00.000Z'),
    });
    await gateway.start();

    // act
    const origin = access.status().origin;
    // assert
    expect(origin).toBe(`http://127.0.0.1:${port}`);
    if (!origin) throw new Error('Mobile gateway did not publish an origin.');
    const appResponse = await fetch(`${origin}/pair`);
    expect(appResponse.headers.get('content-security-policy')).toContain("base-uri 'self'");
    expect(await appResponse.text()).toContain('Symphony Mobile');

    const invalidPairingResponse = await fetch(`${origin}/api/mobile/v1/pairing/propose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ challenge: 'short', deviceName: 'Test phone' }),
    });
    expect(invalidPairingResponse.status).toBe(400);
    expect(await invalidPairingResponse.json()).toEqual({
      code: 'MOBILE_REQUEST_INVALID',
      message: 'The mobile request is invalid.',
    });

    const challenge = access.createChallenge();
    const pairingSecret = new URLSearchParams(new URL(challenge.pairingUrl).hash.slice(1)).get(
      'pair',
    );
    expect(pairingSecret).toBeTruthy();
    const proposalResponse = await fetch(`${origin}/api/mobile/v1/pairing/propose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ challenge: pairingSecret, deviceName: 'Test phone' }),
    });
    expect(proposalResponse.status).toBe(202);
    const proposal = (await proposalResponse.json()) as {
      pairingId: string;
      verificationCode: string;
    };
    expect(access.status().pendingPairings[0]?.verificationCode).toBe(proposal.verificationCode);

    const resumedProposalResponse = await fetch(`${origin}/api/mobile/v1/pairing/propose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ challenge: pairingSecret, deviceName: 'Test phone' }),
    });
    expect(resumedProposalResponse.status).toBe(202);
    expect(await resumedProposalResponse.json()).toEqual(proposal);
    expect(access.status().pendingPairings).toHaveLength(1);

    const reassignedProposalResponse = await fetch(`${origin}/api/mobile/v1/pairing/propose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ challenge: pairingSecret, deviceName: 'Different phone' }),
    });
    expect(reassignedProposalResponse.status).toBe(410);
    expect(await reassignedProposalResponse.json()).toEqual({
      code: 'MOBILE_PAIRING_EXPIRED',
      message: 'The pairing code is invalid or has expired.',
    });

    access.approvePairing(proposal.pairingId);
    const statusResponse = await fetch(`${origin}/api/mobile/v1/pairing/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ pairingId: proposal.pairingId, challenge: pairingSecret }),
    });
    expect(statusResponse.status).toBe(200);
    expect(await statusResponse.json()).toMatchObject({ state: 'approved' });
    const cookie = statusResponse.headers.get('set-cookie')?.split(';', 1)[0];
    expect(cookie).toMatch(/^symphony_mobile=/u);

    const snapshotResponse = await fetch(`${origin}/api/mobile/v1/snapshot`, {
      headers: { cookie: cookie! },
    });
    expect(snapshotResponse.status).toBe(200);
    const mobileSnapshot = (await snapshotResponse.json()) as {
      desktopName: string;
      remoteAutomationEnabled: boolean;
      mergeRequests: readonly { title: string; externalUrl: string }[];
      tickets: readonly {
        id: string;
        title: string;
        externalUrl: string;
        remoteCommandsAvailable: boolean;
        actions: readonly { id: string; kind: string; label: string; optionId?: string }[];
        moveTargetColumnIds: readonly string[];
      }[];
      boardColumns: readonly { id: string; label: string; ticketCount: number }[];
    };
    expect(mobileSnapshot).toMatchObject({
      desktopName: 'Development Mac',
      remoteAutomationEnabled: true,
      employees: [
        {
          id: 'employee-1',
          name: 'Ada',
          state: 'idle',
          workItemIds: [],
          appearance: { figure: 'dot', color: 'mint', accessories: [] },
        },
      ],
    });
    expect(JSON.stringify(mobileSnapshot)).not.toContain('private-route');
    // The work item reports no provider column, so it lands in the "No column" bucket instead of vanishing.
    expect(mobileSnapshot.boardColumns.map((column) => [column.label, column.ticketCount])).toEqual(
      [
        ['Backlog', 0],
        ['Qualified', 1],
        ['No column', 1],
      ],
    );
    expect(mobileSnapshot.tickets[0]).toMatchObject({
      title: 'Ship mobile access',
      externalUrl: 'https://github.com/example/symphony/issues/1',
      remoteCommandsAvailable: true,
    });
    // The ticket rests in a human gate, so the phone offers the gate decisions the desktop
    // board offers there - not the analysis the stage does not run.
    expect(mobileSnapshot.tickets[0]?.actions.map((action) => [action.kind, action.label])).toEqual(
      [
        ['decide', 'Approve'],
        ['decide', 'Ask a question'],
        ['decide', 'Split'],
        ['decide', 'Close as duplicate'],
        ['decide', 'Close as not planned'],
      ],
    );
    expect(mobileSnapshot.tickets[0]?.moveTargetColumnIds).toEqual([
      'opt-backlog',
      'opt-qualified',
    ]);
    expect(mobileSnapshot.tickets[1]?.actions).toEqual([
      { id: 'analyze', kind: 'analyze', label: 'Analyze now' },
    ]);
    expect(mobileSnapshot.mergeRequests[0]).toMatchObject({
      title: 'Ship mobile navigation',
      externalUrl: 'https://github.com/example/symphony/pull/12',
    });

    const contextResponse = await fetch(`${origin}/api/mobile/v1/work-items/creation-context`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie!, origin },
      body: JSON.stringify({ repository: 'example/symphony' }),
    });
    expect(contextResponse.status).toBe(200);
    expect(await contextResponse.json()).toMatchObject({
      workspaceId: 'workspace-1',
      repositories: ['example/symphony'],
      issueCreatorSkill: { id: 'create-change-request' },
    });

    const draftResponse = await fetch(`${origin}/api/mobile/v1/work-items/draft`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie!, origin },
      body: JSON.stringify({
        operationId: 'draft-1',
        workspaceId: 'workspace-1',
        repository: 'example/symphony',
        prompt: 'Draft a complete mobile work item.',
        projectFields: [{ fieldId: 'status', type: 'single-select', value: 'backlog' }],
      }),
    });
    expect(draftResponse.status).toBe(200);
    expect(draftIssue).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'draft-1' }));

    const createResponse = await fetch(`${origin}/api/mobile/v1/work-items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie!, origin },
      body: JSON.stringify({
        workspaceId: 'workspace-1',
        title: 'Created on mobile',
        body: 'Ready for review.',
        repository: 'example/symphony',
        projectFields: [{ fieldId: 'status', type: 'single-select', value: 'backlog' }],
        labels: ['mobile'],
        assignees: ['ada'],
      }),
    });
    expect(createResponse.status).toBe(201);
    expect(await createResponse.json()).toEqual({ workItemId: 'ticket-created' });
    expect(createWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Created on mobile' }),
    );

    const commandResponse = await fetch(`${origin}/api/mobile/v1/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie!, origin },
      body: JSON.stringify({
        action: 'analyze',
        workItemId: 'ticket-2',
        prompt: 'Focus on the mobile contract.',
      }),
    });
    expect(commandResponse.status).toBe(202);
    expect(startAnalyzer).toHaveBeenCalledWith('ticket-2', 'Focus on the mobile contract.');

    // A step the stage does not own is refused by the desktop, whatever the phone last saw.
    const refusedResponse = await fetch(`${origin}/api/mobile/v1/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie!, origin },
      body: JSON.stringify({ action: 'analyze', workItemId: 'ticket-1' }),
    });
    expect(refusedResponse.status).toBe(409);
    expect(startAnalyzer).toHaveBeenCalledTimes(1);

    const decideResponse = await fetch(`${origin}/api/mobile/v1/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie!, origin },
      body: JSON.stringify({ action: 'decide', workItemId: 'ticket-1', optionId: 'approve' }),
    });
    expect(decideResponse.status).toBe(202);
    expect(await decideResponse.json()).toEqual({ accepted: true });
    expect(decideWorkflow).toHaveBeenCalledWith('ticket-1', 'approve');

    const moveResponse = await fetch(`${origin}/api/mobile/v1/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie!, origin },
      body: JSON.stringify({
        action: 'move',
        workItemId: 'ticket-1',
        boardColumnId: 'opt-qualified',
      }),
    });
    expect(moveResponse.status).toBe(202);
    expect(moveWorkItem).toHaveBeenCalledWith('ticket-1', 'opt-qualified');

    const foreignColumnResponse = await fetch(`${origin}/api/mobile/v1/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie!, origin },
      body: JSON.stringify({ action: 'move', workItemId: 'ticket-1', boardColumnId: 'opt-other' }),
    });
    expect(foreignColumnResponse.status).toBe(409);
    expect(moveWorkItem).toHaveBeenCalledTimes(1);

    currentSnapshot = {
      ...currentSnapshot,
      pullRequests: currentSnapshot.pullRequests?.map((pullRequest, index) =>
        index === 0 ? { ...pullRequest, externalUrl: 'not-an-http-url' } : pullRequest,
      ),
    };
    const reportedFailureCount = reportRequestFailure.mock.calls.length;
    const sanitizedSnapshotResponse = await fetch(`${origin}/api/mobile/v1/snapshot`, {
      headers: { cookie: cookie! },
    });
    expect(sanitizedSnapshotResponse.status).toBe(200);
    const sanitizedSnapshot = mobileSnapshotSchema.parse(await sanitizedSnapshotResponse.json());
    expect(sanitizedSnapshot.mergeRequests).toEqual([]);
    expect(reportRequestFailure).toHaveBeenCalledTimes(reportedFailureCount);

    const longProgress = 'Progress '.repeat(7_000);
    currentSnapshot = {
      ...currentSnapshot,
      executions: [await execution('ticket-1', 'analysis', 'execution-long-progress')],
      events: [
        {
          id: 'event-long-progress',
          executionId: 'execution-long-progress',
          kind: 'agent.progress',
          message: longProgress,
          occurredAt: '2026-08-10T18:01:00.000Z',
          sequence: 1,
        },
      ],
    };
    const boundedProgressResponse = await fetch(`${origin}/api/mobile/v1/snapshot`, {
      headers: { cookie: cookie! },
    });
    expect(boundedProgressResponse.status).toBe(200);
    const boundedProgressSnapshot = mobileSnapshotSchema.parse(
      await boundedProgressResponse.json(),
    );
    expect(boundedProgressSnapshot.executions[0]?.latestProgress).toBe(
      longProgress.slice(0, 20_000),
    );
    expect(reportRequestFailure).toHaveBeenCalledTimes(reportedFailureCount);

    currentSnapshot = {
      ...currentSnapshot,
      workItems: currentSnapshot.workItems.map((workItem, index) =>
        index === 0 ? { ...workItem, title: '' } : workItem,
      ),
    };
    const invalidSnapshotResponse = await fetch(`${origin}/api/mobile/v1/snapshot`, {
      headers: { cookie: cookie! },
    });
    expect(invalidSnapshotResponse.status).toBe(500);
    expect(await invalidSnapshotResponse.json()).toEqual({
      code: 'MOBILE_RESPONSE_INVALID',
      message: 'Symphony could not prepare the mobile data.',
    });
    expect(reportRequestFailure).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'GET',
        pathname: '/api/mobile/v1/snapshot',
        status: 500,
        code: 'MOBILE_RESPONSE_INVALID',
        error: 'Mobile response validation failed.',
        validationIssues: expect.arrayContaining([
          expect.objectContaining({ path: 'tickets.0.title' }),
        ]),
      }),
    );

    access.revokeAllDevices();
    const revokedResponse = await fetch(`${origin}/api/mobile/v1/snapshot`, {
      headers: { cookie: cookie! },
    });
    expect(revokedResponse.status).toBe(401);
  });
});

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to reserve test port.');
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

function execution(
  workItemId: string,
  kind: 'analysis' | 'solution' = 'analysis',
  id = `execution-${kind}`,
): IExecutionRecord {
  return {
    id,
    workItemId,
    workflowId: 'default',
    kind,
    state: 'queued',
    startedAt: '2026-08-10T18:00:00.000Z',
  };
}

function snapshot(): IOrchestrationSnapshot {
  return {
    health: {
      status: 'ready',
      utilityProcess: true,
      database: true,
      homebrew: { available: true },
      git: { available: true },
      githubCli: { available: true },
      agents: {
        codex: { available: true },
        claude: { available: false },
        opencode: { available: true },
      },
    },
    workItems: [
      {
        id: 'ticket-1',
        workspaceId: 'workspace-1',
        externalId: '#1',
        externalUrl: 'https://github.com/example/symphony/issues/1',
        title: 'Ship mobile access',
        body: 'Build the local companion.',
        stageId: 'backlog',
        provider: 'github-projects',
        repository: 'example/symphony',
        labels: ['mobile'],
        assignees: [{ login: 'ada', displayName: 'Ada' }],
      },
      {
        id: 'ticket-2',
        workspaceId: 'workspace-1',
        externalId: '#3',
        title: 'Analyze the companion contract',
        body: 'Waiting for the analysis.',
        stageId: 'qualified',
        boardColumnId: 'opt-qualified',
        provider: 'github-projects',
        repository: 'example/symphony',
        labels: [],
        assignees: [],
      },
    ],
    boardColumns: [
      { id: 'opt-backlog', label: 'Backlog', stageId: 'backlog' },
      { id: 'opt-qualified', label: 'Qualified', stageId: 'qualified' },
    ],
    pullRequests: [
      {
        id: 'pull-request-12',
        workspaceId: 'workspace-1',
        repositoryBindingId: 'repository-1',
        number: 12,
        title: 'Ship mobile navigation',
        state: 'open',
        draft: false,
        author: 'ada',
        sourceBranch: 'feature/mobile-navigation',
        targetBranch: 'main',
        externalUrl: 'https://github.com/example/symphony/pull/12',
        createdAt: '2026-08-10T17:00:00.000Z',
        updatedAt: '2026-08-10T17:30:00.000Z',
      },
    ],
    executions: [],
    events: [],
    workflow: defaultWorkflow,
    skills: [],
  };
}
