// #region Imports

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import {
  externalHttpUrlSchema,
  mobileApiErrorSchema,
  mobileCommandRequestSchema,
  mobileCommandResponseSchema,
  mobileEventSchema,
  mobileHttpRoutes,
  mobileIssueDraftCancelRequestSchema,
  mobileIssueDraftCancelResponseSchema,
  type MobileIssueDraftRequest,
  mobileIssueDraftRequestSchema,
  mobileIssueDraftSchema,
  mobilePairingProposalRequestSchema,
  mobilePairingStatusRequestSchema,
  mobilePairingStatusSchema,
  type MobileSnapshot,
  mobileSnapshotSchema,
  type MobileTicket,
  type MobileTicketAction,
  type MobileWorkItemCreateRequest,
  mobileWorkItemCreateRequestSchema,
  mobileWorkItemCreateResponseSchema,
  mobileWorkItemCreationContextRequestSchema,
  mobileWorkItemCreationContextSchema,
} from '@symphony/mobile-contracts';
import type { IExecutionQueueEntry, IExecutionRecord } from '@symphony/domain-execution';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import type { IWorkflowStage } from '@symphony/domain-workflow';
import type { IWorkItem, IWorkItemHealth } from '@symphony/domain-work';
import { activeWorkItemCoordination } from '@symphony/domain-work';
import { findStage } from '@symphony/domain-workflow';
import {
  inspectWorkItem,
  isActiveExecution,
  resolveWorkItemActions,
} from '@symphony/domain-execution';
import type { ExecutionAdmission } from '@symphony/application-execution';
import { extname, resolve, sep } from 'node:path';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { ZodError, type ZodType } from 'zod';
import type { ILocalMobileGatewayDependencies } from './ILocalMobileGatewayDependencies';
import { UNASSIGNED_COLUMN_ID } from './UnassignedColumnId';
import { UNASSIGNED_COLUMN_LABEL } from './UnassignedColumnLabel';
import { requireCreationScope } from './requireCreationScope';
import { requireProjectFields } from './requireProjectFields';
import { requireTicket } from './requireTicket';
import { safeMessage } from './safeMessage';
import { selectPrivateHost } from './selectPrivateHost';
import { projectAgentActivity } from '@symphony/domain-execution';

// #endregion

const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

const MAX_MOBILE_PROGRESS_LENGTH = 20_000;

const MAX_MOBILE_SUMMARY_LENGTH = 1_000_000;

const DEFAULT_PORT_START = 49_152;

const DEFAULT_PORT_END = 49_200;

const SESSION_COOKIE = 'symphony_mobile';

class InvalidMobileRequestError extends Error {}

/** Provider columns with their tickets, plus a "No column" bucket only while tickets have no provider column. */
function mobileBoardColumns(
  columns: IOrchestrationSnapshot['boardColumns'],
  tickets: readonly MobileTicket[],
): readonly {
  id: string;
  label: string;
  stageId?: MobileTicket['stageId'];
  ticketCount: number;
  tickets: readonly MobileTicket[];
}[] {
  const knownColumnIds = new Set(columns.map((column) => column.id));
  const buckets = columns.map((column) => {
    const columnTickets = tickets.filter((ticket) => ticket.boardColumnId === column.id);
    return {
      id: column.id,
      label: column.label,
      ...(column.stageId ? { stageId: column.stageId } : {}),
      ...(column.sourceId ? { sourceId: column.sourceId } : {}),
      ticketCount: columnTickets.length,
      tickets: columnTickets,
    };
  });
  const unassigned = tickets.filter(
    (ticket) => !ticket.boardColumnId || !knownColumnIds.has(ticket.boardColumnId),
  );
  return unassigned.length
    ? [
        ...buckets,
        {
          id: UNASSIGNED_COLUMN_ID,
          label: UNASSIGNED_COLUMN_LABEL,
          ticketCount: unassigned.length,
          tickets: unassigned,
        },
      ]
    : buckets;
}

function projectTicket(
  item: IWorkItem,
  stages: readonly IWorkflowStage[],
  stateLabel: string,
  executions: readonly IExecutionRecord[],
  executionQueue: readonly IExecutionQueueEntry[],
  ownsCoordination: boolean,
  moveTargets: readonly string[],
  health: IWorkItemHealth,
): MobileTicket {
  const coordination = activeWorkItemCoordination(item.coordination, new Date());
  const externalCoordination =
    coordination && !ownsCoordination
      ? {
          action: coordination.action,
          ...(coordination.owner ? { owner: coordination.owner } : {}),
        }
      : undefined;
  // The same rule the desktop board applies, so a phone never offers a step the stage does not
  // own and never hides one the ticket is waiting for.
  const actions = resolveWorkItemActions(item, executions, stages, executionQueue);
  const activeExecution = executions.find(isActiveExecution);
  const remoteCommandUrl =
    item.provider === 'github-projects' ? parseExternalHttpUrl(item.externalUrl) : undefined;
  return {
    id: item.id,
    workspaceId: item.workspaceId ?? 'default',
    externalId: item.externalId,
    ...(remoteCommandUrl ? { externalUrl: remoteCommandUrl } : {}),
    remoteCommandsAvailable: Boolean(remoteCommandUrl),
    title: item.title,
    body: item.body,
    ...(item.stageId ? { stageId: item.stageId } : {}),
    terminal: findStage(stages, item.stageId)?.kind === 'terminal',
    ...(item.boardColumnId ? { boardColumnId: item.boardColumnId } : {}),
    stateLabel,
    repository: item.repository || undefined,
    labels: item.labels,
    assignees: item.assignees.map((assignee) => assignee.displayName ?? assignee.login),
    ...(externalCoordination ? { externalCoordination } : {}),
    updatedAt: item.updatedAt,
    ...(health.severity
      ? {
          health: {
            severity: health.severity,
            issues: health.issues.map((issue) => ({
              id: issue.id,
              severity: issue.severity,
              summary: issue.summary,
              detail: issue.detail,
              remedy: issue.remedy,
            })),
          },
        }
      : {}),
    actions,
    moveTargetColumnIds: moveTargets,
    activeExecutionId: activeExecution?.id,
  };
}

/**
 * Board columns the ticket may be written to. A column of another board is not a target: the
 * provider only accepts the columns of the board that owns the item. Trackers that report one
 * unattributed set of columns leave the board undivided.
 */
function moveTargetColumnIds(
  columns: IOrchestrationSnapshot['boardColumns'],
  item: IWorkItem,
): readonly string[] {
  const owned = columns.filter((column) => column.sourceId === item.sourceId);
  if (owned.length) return owned.map((column) => column.id);
  return columns.every((column) => !column.sourceId) ? columns.map((column) => column.id) : [];
}

/**
 * Accepts a command only for a step the ticket's stage actually offers right now. The mobile
 * app renders the same list, but the desktop decides: a phone may hold a snapshot that is
 * seconds old, and the stage may have moved on in the meantime.
 */
function requireTicketAction(
  snapshot: MobileSnapshot,
  workItemId: string,
  kind: MobileTicketAction['kind'],
  optionId?: string,
): MobileTicketAction {
  const ticket = requireTicket(snapshot, workItemId);
  const action = ticket.actions.find(
    (candidate) =>
      candidate.kind === kind && (optionId === undefined || candidate.optionId === optionId),
  );
  if (!action) throw new Error('The ticket action is no longer valid.');
  if (action.blockedReason) throw new Error(action.blockedReason);
  return action;
}

function requireCreationInput(
  context: Awaited<ReturnType<ILocalMobileGatewayDependencies['workItemCreationContext']>>,
  input: MobileWorkItemCreateRequest,
): void {
  requireCreationScope(context, input.workspaceId, input.repository);
  const labels = new Set(context.metadata.labels.map((label) => label.name));
  if (input.labels.some((label) => !labels.has(label))) {
    throw new Error('The available labels changed. Reload the work-item form.');
  }
  const assignees = new Set(context.metadata.assignees.map((assignee) => assignee.login));
  if (input.assignees.some((assignee) => !assignees.has(assignee))) {
    throw new Error('The available assignees changed. Reload the work-item form.');
  }
  requireProjectFields(context.metadata, input.projectFields);
}

function requireDraftInput(
  context: Awaited<ReturnType<ILocalMobileGatewayDependencies['workItemCreationContext']>>,
  input: MobileIssueDraftRequest,
): void {
  requireCreationScope(context, input.workspaceId, input.repository);
  if (input.projectFields) requireProjectFields(context.metadata, input.projectFields);
}

function formatHost(host: string): string {
  return host.includes(':') ? `[${host}]` : host;
}

function parseExternalHttpUrl(value: string | undefined): string | undefined {
  const parsed = externalHttpUrlSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function boundedOptionalText(value: string | undefined, maximumLength: number): string | undefined {
  return value && value.length > maximumLength ? value.slice(0, maximumLength) : value;
}

function requestPathname(requestUrl: string | undefined, origin: string | undefined): string {
  try {
    return new URL(requestUrl ?? '/', origin).pathname;
  } catch {
    return '/';
  }
}

function requestFailureLogMessage(cause: unknown): string {
  return cause instanceof ZodError ? 'Mobile response validation failed.' : safeMessage(cause);
}

function requestFailure(cause: unknown): { status: number; code: string; message: string } {
  const message = safeMessage(cause);
  if (cause instanceof InvalidMobileRequestError) {
    return {
      status: 400,
      code: 'MOBILE_REQUEST_INVALID',
      message: 'The mobile request is invalid.',
    };
  }
  if (cause instanceof ZodError) {
    return {
      status: 500,
      code: 'MOBILE_RESPONSE_INVALID',
      message: 'Symphony could not prepare the mobile data.',
    };
  }
  if (message.includes('too large')) {
    return { status: 413, code: 'MOBILE_REQUEST_TOO_LARGE', message };
  }
  if (message.includes('origin')) {
    return { status: 403, code: 'MOBILE_ORIGIN_FORBIDDEN', message };
  }
  if (message.includes('not paired') || message.includes('not authorized')) {
    return { status: 401, code: 'MOBILE_NOT_AUTHORIZED', message };
  }
  if (message.includes('invalid or has expired')) {
    return { status: 410, code: 'MOBILE_PAIRING_EXPIRED', message };
  }
  if (
    message.includes('no longer') ||
    message.includes('changed') ||
    message.includes('Select one workspace')
  ) {
    return { status: 409, code: 'MOBILE_STATE_CHANGED', message };
  }
  return { status: 500, code: 'MOBILE_REQUEST_FAILED', message };
}

function contentType(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.ico':
      return 'image/x-icon';
    case '.webmanifest':
      return 'application/manifest+json; charset=utf-8';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function isCompressible(path: string): boolean {
  return ['.html', '.js', '.css', '.svg', '.json', '.webmanifest'].includes(
    extname(path).toLowerCase(),
  );
}

export class LocalMobileGateway {
  // #region Fields

  private _server?: Server;
  private readonly _sockets = new Map<WebSocket, string>();
  private readonly _webSockets = new WebSocketServer({ noServer: true, perMessageDeflate: false });
  private _origin?: string;
  private _boundHost?: string;

  // #endregion

  // #region Ctor

  public constructor(private readonly _dependencies: ILocalMobileGatewayDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Starts.
   *
   * @public
   */
  public async start(): Promise<void> {
    if (this._server || !this._dependencies.access.isEnabled()) return;
    this._dependencies.access.setRuntime('starting');
    try {
      const host = this._dependencies.host ?? selectPrivateHost();
      const server = createServer((request, response) => {
        void this.handleRequest(request, response).catch((cause: unknown) => {
          const failure = requestFailure(cause);
          this._dependencies.reportRequestFailure?.({
            method: request.method ?? 'UNKNOWN',
            pathname: requestPathname(request.url, this._origin),
            status: failure.status,
            code: failure.code,
            error: requestFailureLogMessage(cause),
            ...(cause instanceof ZodError
              ? {
                  validationIssues: cause.issues.map((issue) => ({
                    code: issue.code,
                    path: issue.path.join('.'),
                  })),
                }
              : {}),
          });
          this.respondError(response, failure.status, failure.code, failure.message);
        });
      });
      server.on('upgrade', (request, socket, head) => {
        try {
          if (!this._origin) throw new Error('Mobile access is not ready.');
          const url = new URL(request.url ?? '/', this._origin);
          if (url.pathname !== mobileHttpRoutes.events) throw new Error('Unknown WebSocket route.');
          this.assertOrigin(request);
          const token = this.sessionToken(request);
          if (!token) throw new Error('Missing mobile session.');
          const deviceId = this._dependencies.access.authorize(token);
          this._webSockets.handleUpgrade(request, socket, head, (webSocket) => {
            this.registerSocket(webSocket, deviceId);
          });
        } catch {
          socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
          socket.destroy();
        }
      });
      const port = await this.listen(server, host);
      this._server = server;
      this._boundHost = host;
      this._origin = `http://${formatHost(host)}:${port}`;
      this._dependencies.access.setRuntime('available', { origin: this._origin });
    } catch (cause) {
      this._dependencies.access.setRuntime('unavailable', {
        unavailableReason: safeMessage(cause),
      });
      throw cause;
    }
  }

  /**
   * Stops.
   *
   * @public
   */
  public async stop(): Promise<void> {
    if (!this._server) {
      this._origin = undefined;
      this._dependencies.access.setRuntime('disabled');
      return;
    }
    this._dependencies.access.setRuntime('stopping');
    await this.closeServer('Mobile access disabled');
    this._dependencies.access.setRuntime('disabled');
  }

  /**
   * Returns the reconcile.
   *
   * @public
   */
  public async reconcile(): Promise<void> {
    if (!this._dependencies.access.isEnabled()) {
      await this.stop();
      return;
    }
    let host: string;
    try {
      host = this._dependencies.host ?? selectPrivateHost();
    } catch (cause) {
      if (this._server) await this.closeServer('Local network changed');
      this._dependencies.access.setRuntime('unavailable', {
        unavailableReason: safeMessage(cause),
      });
      throw cause;
    }
    if (!this._server) {
      await this.start();
      return;
    }
    if (host !== this._boundHost) {
      this._dependencies.access.setRuntime('rebinding');
      await this.closeServer('Local network changed');
      await this.start();
    }
  }

  /**
   * Returns the broadcast snapshot invalidated.
   *
   * @public
   */
  public broadcastSnapshotInvalidated(): void {
    const payload = JSON.stringify(
      mobileEventSchema.parse({
        type: 'snapshot.invalidated',
        occurredAt: (this._dependencies.now ?? (() => new Date()))().toISOString(),
      }),
    );
    for (const socket of this._webSockets.clients) {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    }
  }

  /**
   * Disconnects the device.
   *
   * @param deviceId - Device id.
   * @public
   */
  public disconnectDevice(deviceId: string): void {
    for (const [socket, connectedDeviceId] of this._sockets) {
      if (connectedDeviceId === deviceId) socket.close(1008, 'Device revoked');
    }
  }

  /**
   * Disconnects the all devices.
   *
   * @public
   */
  public disconnectAllDevices(): void {
    for (const socket of this._webSockets.clients) socket.close(1008, 'Devices revoked');
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (!this._origin) {
      this.respondError(response, 503, 'MOBILE_UNAVAILABLE', 'Mobile access is not ready.');
      return;
    }
    const url = new URL(request.url ?? '/', this._origin);
    if (url.pathname.startsWith('/api/')) {
      this.assertOrigin(request);
      response.setHeader('Cache-Control', 'no-store');
    }

    if (request.method === 'POST' && url.pathname === mobileHttpRoutes.pairingPropose) {
      const input = await this.readRequest(request, mobilePairingProposalRequestSchema);
      this.respondJson(
        response,
        202,
        this._dependencies.access.proposePairing(input.challenge, input.deviceName),
      );
      return;
    }

    if (request.method === 'POST' && url.pathname === mobileHttpRoutes.pairingStatus) {
      const input = await this.readRequest(request, mobilePairingStatusRequestSchema);
      const result = this._dependencies.access.pairingStatus(input.pairingId, input.challenge);
      if (result.state === 'approved' && result.token) {
        response.setHeader(
          'Set-Cookie',
          `${SESSION_COOKIE}=${encodeURIComponent(result.token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`,
        );
        this.respondJson(
          response,
          200,
          mobilePairingStatusSchema.parse({
            state: 'approved',
            deviceId: result.deviceId,
          }),
        );
      } else {
        this.respondJson(response, 200, result);
      }
      return;
    }

    if (request.method === 'GET' && url.pathname === mobileHttpRoutes.snapshot) {
      this.authorize(request);
      this.respondJson(response, 200, await this.mobileSnapshot());
      return;
    }

    if (request.method === 'POST' && url.pathname === mobileHttpRoutes.workItemCreationContext) {
      this.authorize(request);
      const input = await this.readRequest(request, mobileWorkItemCreationContextRequestSchema);
      const context = await this._dependencies.workItemCreationContext(input.repository);
      this.respondJson(
        response,
        200,
        mobileWorkItemCreationContextSchema.parse({
          version: 1,
          workspaceId: context.workspaceId,
          workspaceName: context.workspaceName,
          repositories: context.metadata.repositories,
          labels: context.metadata.labels,
          assignees: context.metadata.assignees,
          projectFields: context.metadata.projectFields,
          issueCreatorSkill: context.metadata.issueCreatorSkill,
          analysisSkill: context.metadata.analysisSkill,
          solutionSkill: context.metadata.solutionSkill,
        }),
      );
      return;
    }

    if (request.method === 'POST' && url.pathname === mobileHttpRoutes.workItemCreate) {
      this.authorize(request);
      const input = await this.readRequest(request, mobileWorkItemCreateRequestSchema);
      const context = await this._dependencies.workItemCreationContext(input.repository);
      requireCreationInput(context, input);
      const workItem = await this._dependencies.createWorkItem(input);
      this.respondJson(
        response,
        201,
        mobileWorkItemCreateResponseSchema.parse({ workItemId: workItem.id }),
      );
      return;
    }

    if (request.method === 'POST' && url.pathname === mobileHttpRoutes.issueDraft) {
      this.authorize(request);
      const input = await this.readRequest(request, mobileIssueDraftRequestSchema);
      const context = await this._dependencies.workItemCreationContext(input.repository);
      requireDraftInput(context, input);
      const draft = await this._dependencies.draftIssue(input);
      this.respondJson(response, 200, mobileIssueDraftSchema.parse(draft));
      return;
    }

    if (request.method === 'POST' && url.pathname === mobileHttpRoutes.issueDraftCancel) {
      this.authorize(request);
      const input = await this.readRequest(request, mobileIssueDraftCancelRequestSchema);
      this.respondJson(
        response,
        200,
        mobileIssueDraftCancelResponseSchema.parse({
          cancelled: this._dependencies.cancelIssueDraft(input.operationId),
        }),
      );
      return;
    }

    if (request.method === 'POST' && url.pathname === mobileHttpRoutes.command) {
      this.authorize(request);
      const input = await this.readRequest(request, mobileCommandRequestSchema);
      const snapshot = await this.mobileSnapshot();
      switch (input.action) {
        case 'analyze': {
          requireTicketAction(snapshot, input.workItemId, 'analyze');
          this.respondAdmission(
            response,
            await this._dependencies.startAnalyzer(input.workItemId, input.prompt),
          );
          return;
        }
        case 'solve': {
          const action = requireTicketAction(snapshot, input.workItemId, 'solve');
          if (action.requiresFeedback && !input.feedback?.trim()) {
            throw new Error('Describe what the rework must change before starting it.');
          }
          this.respondAdmission(
            response,
            await this._dependencies.startSolver(input.workItemId, input.feedback),
          );
          return;
        }
        case 'remove-queue-entry': {
          const entry = snapshot.executionQueue.find((candidate) => candidate.id === input.entryId);
          if (!entry) throw new Error('The queued step is no longer waiting.');
          this._dependencies.removeQueueEntry(input.entryId);
          this.respondCommandAccepted(response);
          return;
        }
        case 'cancel-execution': {
          const active = snapshot.executions.find(
            (candidate) =>
              candidate.id === input.executionId &&
              ['queued', 'running', 'waiting'].includes(candidate.state),
          );
          if (!active) throw new Error('The execution is no longer active.');
          const execution = await this._dependencies.cancelExecution(input.executionId);
          this.respondCommandAccepted(response, execution.id);
          return;
        }
        case 'publish-pull-request': {
          const action = requireTicketAction(snapshot, input.workItemId, 'publish-pull-request');
          if (action.executionId !== input.executionId) {
            throw new Error('The implementation is no longer the one to publish.');
          }
          const execution = await this._dependencies.publishPullRequest(input.executionId);
          this.respondCommandAccepted(response, execution.id);
          return;
        }
        case 'decide': {
          requireTicketAction(snapshot, input.workItemId, 'decide', input.optionId);
          await this._dependencies.decideWorkflow(input.workItemId, input.optionId);
          this.respondCommandAccepted(response);
          return;
        }
        case 'move': {
          const ticket = requireTicket(snapshot, input.workItemId);
          if (!ticket.moveTargetColumnIds.includes(input.boardColumnId)) {
            throw new Error('The board column is no longer available for this ticket.');
          }
          await this._dependencies.moveWorkItem(input.workItemId, input.boardColumnId);
          this.respondCommandAccepted(response);
          return;
        }
      }
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      this.serveAsset(url.pathname, request.method === 'HEAD', request, response);
      return;
    }

    this.respondError(response, 404, 'MOBILE_ROUTE_NOT_FOUND', 'The mobile route does not exist.');
  }

  private async closeServer(reason: string): Promise<void> {
    for (const socket of this._webSockets.clients) socket.close(1001, reason);
    const server = this._server;
    this._server = undefined;
    this._origin = undefined;
    this._boundHost = undefined;
    if (server) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }

  private async mobileSnapshot(): Promise<MobileSnapshot> {
    const source = await this._dependencies.snapshot();
    const executionQueue = source.executionQueue ?? [];
    const executionsByWorkItem = new Map<string, IExecutionRecord[]>();
    for (const execution of source.executions) {
      const existing = executionsByWorkItem.get(execution.workItemId);
      if (existing) existing.push(execution);
      else executionsByWorkItem.set(execution.workItemId, [execution]);
    }
    const localClaimIds = new Set(
      source.executions.flatMap((execution) =>
        execution.workItemClaim ? [execution.workItemClaim.id] : [],
      ),
    );
    const columnLabels = new Map(source.boardColumns.map((column) => [column.id, column.label]));
    const projectFields = source.projectFields ?? [];
    const tickets = source.workItems.map((item) => {
      const columnLabel = item.boardColumnId ? columnLabels.get(item.boardColumnId) : undefined;
      return projectTicket(
        item,
        source.workflow.stages,
        columnLabel ?? UNASSIGNED_COLUMN_LABEL,
        executionsByWorkItem.get(item.id) ?? [],
        executionQueue,
        item.coordination ? localClaimIds.has(item.coordination.claimId) : false,
        moveTargetColumnIds(source.boardColumns, item),
        inspectWorkItem(item, {
          stages: source.workflow.stages,
          executions: executionsByWorkItem.get(item.id) ?? [],
          // Snapshots merge every board; a field of another board is foreign here, not missing.
          fields: projectFields.filter(
            (field) => !field.sourceId || !item.sourceId || field.sourceId === item.sourceId,
          ),
          ...(columnLabel ? { boardColumnLabel: columnLabel } : {}),
        }),
      );
    });
    const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
    const latestEventByExecution = new Map<string, string>();
    for (const event of [...source.events].sort((left, right) => left.sequence - right.sequence)) {
      latestEventByExecution.set(event.executionId, event.message);
    }
    return mobileSnapshotSchema.parse({
      version: 1,
      desktopName: this._dependencies.desktopName,
      remoteAutomationEnabled: this._dependencies.remoteAutomationEnabled(),
      generatedAt: (this._dependencies.now ?? (() => new Date()))().toISOString(),
      employees: (this._dependencies.employees?.() ?? []).map((agent) => {
        const activity = projectAgentActivity([agent], source, true)[0]!;
        return {
          id: agent.id,
          name: agent.displayName,
          appearance: agent.appearance,
          state: activity.state,
          workItemIds: [...new Set(activity.work.map((work) => work.workItemId))],
          activeRole: activity.work.find((work) => work.state === 'working')?.role,
          lastKnownAt: activity.lastKnownAt,
        };
      }),
      tickets,
      boardColumns: mobileBoardColumns(source.boardColumns, tickets),
      mergeRequests: (source.pullRequests ?? []).flatMap((pullRequest) => {
        const externalUrl = parseExternalHttpUrl(pullRequest.externalUrl);
        return externalUrl
          ? [
              {
                id: pullRequest.id,
                workspaceId: pullRequest.workspaceId,
                number: pullRequest.number,
                title: pullRequest.title,
                state: pullRequest.state,
                draft: pullRequest.draft,
                author: pullRequest.author,
                sourceBranch: pullRequest.sourceBranch,
                targetBranch: pullRequest.targetBranch,
                externalUrl,
                createdAt: pullRequest.createdAt,
                updatedAt: pullRequest.updatedAt,
              },
            ]
          : [];
      }),
      executions: source.executions.map((execution) => ({
        id: execution.id,
        workItemId: execution.workItemId,
        ticketTitle: ticketById.get(execution.workItemId)?.title ?? execution.workItemId,
        kind: execution.kind ?? 'analysis',
        state: execution.state,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        latestProgress: boundedOptionalText(
          latestEventByExecution.get(execution.id),
          MAX_MOBILE_PROGRESS_LENGTH,
        ),
        summary: boundedOptionalText(execution.summary, MAX_MOBILE_SUMMARY_LENGTH),
        error: boundedOptionalText(execution.error, MAX_MOBILE_PROGRESS_LENGTH),
      })),
      executionQueue: executionQueue.map((entry, index) => ({
        id: entry.id,
        workItemId: entry.workItemId,
        ticketTitle: ticketById.get(entry.workItemId)?.title ?? entry.workItemTitle,
        ticketExternalId: entry.workItemExternalId,
        kind: entry.kind,
        position: index + 1,
        queuedAt: entry.queuedAt,
        lastError: boundedOptionalText(entry.lastError, MAX_MOBILE_PROGRESS_LENGTH),
      })),
    });
  }

  private authorize(request: IncomingMessage): string {
    const token = this.sessionToken(request);
    if (!token) throw new Error('This phone is not paired with Symphony.');
    return this._dependencies.access.authorize(token);
  }

  private registerSocket(socket: WebSocket, deviceId: string): void {
    this._sockets.set(socket, deviceId);
    this._dependencies.access.setDeviceConnected(deviceId, true);
    socket.on('close', () => {
      this._sockets.delete(socket);
      const hasAnotherSocket = [...this._sockets.values()].some(
        (connectedDeviceId) => connectedDeviceId === deviceId,
      );
      if (!hasAnotherSocket) this._dependencies.access.setDeviceConnected(deviceId, false);
    });
    socket.on('error', () => socket.close());
  }

  private respondAdmission(response: ServerResponse, admission: ExecutionAdmission): void {
    this.respondJson(
      response,
      202,
      mobileCommandResponseSchema.parse(
        admission.outcome === 'started'
          ? { accepted: true, executionId: admission.execution.id }
          : { accepted: true, queueEntryId: admission.entry.id },
      ),
    );
  }

  private respondCommandAccepted(response: ServerResponse, executionId?: string): void {
    this.respondJson(
      response,
      202,
      mobileCommandResponseSchema.parse({
        accepted: true,
        ...(executionId ? { executionId } : {}),
      }),
    );
  }

  private sessionToken(request: IncomingMessage): string | undefined {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
    const cookie = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim().split('=', 2))
      .find(([name]) => name === SESSION_COOKIE)?.[1];
    return cookie ? decodeURIComponent(cookie) : undefined;
  }

  private assertOrigin(request: IncomingMessage): void {
    const origin = request.headers.origin;
    if (origin && origin !== this._origin) throw new Error('The request origin is not allowed.');
  }

  private async readJson(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_REQUEST_BYTES) throw new Error('The mobile request is too large.');
      chunks.push(buffer);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  }

  private async readRequest<T>(request: IncomingMessage, schema: ZodType<T>): Promise<T> {
    try {
      return schema.parse(await this.readJson(request));
    } catch (cause) {
      if (cause instanceof ZodError || cause instanceof SyntaxError) {
        throw new InvalidMobileRequestError('The mobile request is invalid.');
      }
      throw cause;
    }
  }

  private serveAsset(
    pathname: string,
    headOnly: boolean,
    request: IncomingMessage,
    response: ServerResponse,
  ): void {
    const requested = pathname === '/' || pathname === '/pair' ? 'index.html' : pathname.slice(1);
    const candidate = resolve(this._dependencies.assetsPath, requested);
    const root = resolve(this._dependencies.assetsPath);
    const safeCandidate = candidate === root || candidate.startsWith(`${root}${sep}`);
    const assetPath =
      safeCandidate && existsSync(candidate) && statSync(candidate).isFile()
        ? candidate
        : resolve(root, 'index.html');
    if (!existsSync(assetPath)) {
      this.respondError(
        response,
        503,
        'MOBILE_ASSETS_MISSING',
        'The packaged mobile application is unavailable.',
      );
      return;
    }
    response.statusCode = 200;
    response.setHeader('Content-Type', contentType(assetPath));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws:; frame-ancestors 'none'; base-uri 'self'",
    );
    if (headOnly) {
      response.end();
      return;
    }
    const stream = createReadStream(assetPath);
    if (request.headers['accept-encoding']?.includes('gzip') && isCompressible(assetPath)) {
      response.setHeader('Content-Encoding', 'gzip');
      response.setHeader('Vary', 'Accept-Encoding');
      stream.pipe(createGzip()).pipe(response);
    } else {
      stream.pipe(response);
    }
  }

  private respondJson(response: ServerResponse, status: number, value: unknown): void {
    if (response.headersSent) return;
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(value));
  }

  private respondError(
    response: ServerResponse,
    status: number,
    code: string,
    message: string,
  ): void {
    this.respondJson(response, status, mobileApiErrorSchema.parse({ code, message }));
  }

  private async listen(server: Server, host: string): Promise<number> {
    const start = this._dependencies.portStart ?? DEFAULT_PORT_START;
    const end = this._dependencies.portEnd ?? DEFAULT_PORT_END;
    for (let port = start; port <= end; port += 1) {
      try {
        await new Promise<void>((resolveListen, rejectListen) => {
          const onError = (cause: Error): void => rejectListen(cause);
          server.once('error', onError);
          server.listen(port, host, () => {
            server.off('error', onError);
            resolveListen();
          });
        });
        return port;
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw cause;
      }
    }
    throw new Error(`No mobile-access port is available between ${start} and ${end}.`);
  }

  // #endregion
}
