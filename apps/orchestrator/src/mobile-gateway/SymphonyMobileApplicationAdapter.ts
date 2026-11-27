// #region Imports

import type { IncomingMessage, ServerResponse } from 'node:http';
import { WebSocket } from 'ws';
import type { IRemoteApplicationAdapter } from '@pixel-brewery/remote-node/host';
import type { IRemoteRequestContext } from '@pixel-brewery/remote-protocol';
import {
  externalHttpUrlSchema,
  mobileApiErrorSchema,
  mobileCommandRequestSchema,
  mobileCommandResponseSchema,
  mobileEventSchema,
  mobileIssueDraftCancelRequestSchema,
  mobileIssueDraftCancelResponseSchema,
  type MobileIssueDraftRequest,
  mobileIssueDraftRequestSchema,
  mobileIssueDraftSchema,
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
import { ZodError, type ZodType } from 'zod';
import type { ISymphonyMobileApplicationDependencies } from './interfaces/ISymphonyMobileApplicationDependencies';
import { UNASSIGNED_COLUMN_ID } from './UnassignedColumnId';
import { UNASSIGNED_COLUMN_LABEL } from './UnassignedColumnLabel';
import { requireCreationScope } from './requireCreationScope';
import { requireProjectFields } from './requireProjectFields';
import { requireTicket } from './requireTicket';
import { safeMessage } from './safeMessage';
import { projectAgentActivity } from '@symphony/domain-execution';

// #endregion

const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_MOBILE_PROGRESS_LENGTH = 20_000;
const MAX_MOBILE_SUMMARY_LENGTH = 1_000_000;
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
  context: Awaited<ReturnType<ISymphonyMobileApplicationDependencies['workItemCreationContext']>>,
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
  context: Awaited<ReturnType<ISymphonyMobileApplicationDependencies['workItemCreationContext']>>,
  input: MobileIssueDraftRequest,
): void {
  requireCreationScope(context, input.workspaceId, input.repository);
  if (input.projectFields) requireProjectFields(context.metadata, input.projectFields);
}

function parseExternalHttpUrl(value: string | undefined): string | undefined {
  const parsed = externalHttpUrlSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function boundedOptionalText(value: string | undefined, maximumLength: number): string | undefined {
  return value && value.length > maximumLength ? value.slice(0, maximumLength) : value;
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

/**
 * Owns Symphony product projections and domain admission after SDK device and route authorization.
 *
 * @public
 */
export class SymphonyMobileApplicationAdapter implements IRemoteApplicationAdapter {
  // #region Fields
  private readonly _sockets = new Map<WebSocket, string>();
  private readonly _connectionListeners = new Set<() => void>();
  // #endregion
  // #region Ctor
  /**
   * Binds existing domain callbacks; network and credential owners remain outside this adapter.
   *
   * @param _dependencies - Product snapshot, action, scope and activity owners.
   * @public
   */
  public constructor(private readonly _dependencies: ISymphonyMobileApplicationDependencies) {}
  // #endregion
  // #region Methods
  /**
   * Validates and executes one explicitly registered Symphony operation through its original streams.
   *
   * @param request - Original HTTP request retaining product JSON and cancellation lifetime.
   * @param response - Original response retaining product status and error format.
   * @param context - SDK-authorized device, capabilities and operation identifier.
   * @returns Resolves after the product response completes.
   * @public
   */
  public async handle(
    request: IncomingMessage,
    response: ServerResponse,
    context: IRemoteRequestContext,
  ): Promise<void> {
    const contextSignal = context.signal;
    try {
      await this._dependencies.recordActivity?.(context.principal.deviceId);
      if (context.signal.aborted) {
        response.destroy();
        return;
      }
      if (context.operationId === 'mobile.snapshot') {
        this.respondJson(response, 200, await this.mobileSnapshot());
        return;
      }

      if (context.operationId === 'mobile.creation-context') {
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

      if (context.operationId === 'mobile.work-item.create') {
        const input = await this.readRequest(request, mobileWorkItemCreateRequestSchema);
        const context = await this._dependencies.workItemCreationContext(input.repository);
        requireCreationInput(context, input);
        if (contextSignal.aborted) {
          response.destroy();
          return;
        }
        const workItem = await this._dependencies.createWorkItem(input);
        this.respondJson(
          response,
          201,
          mobileWorkItemCreateResponseSchema.parse({ workItemId: workItem.id }),
        );
        return;
      }

      if (context.operationId === 'mobile.draft') {
        const input = await this.readRequest(request, mobileIssueDraftRequestSchema);
        const context = await this._dependencies.workItemCreationContext(input.repository);
        requireDraftInput(context, input);
        if (contextSignal.aborted) {
          response.destroy();
          return;
        }
        const draft = await this._dependencies.draftIssue(input);
        this.respondJson(response, 200, mobileIssueDraftSchema.parse(draft));
        return;
      }

      if (context.operationId === 'mobile.draft.cancel') {
        const input = await this.readRequest(request, mobileIssueDraftCancelRequestSchema);
        if (contextSignal.aborted) {
          response.destroy();
          return;
        }
        this.respondJson(
          response,
          200,
          mobileIssueDraftCancelResponseSchema.parse({
            cancelled: this._dependencies.cancelIssueDraft(input.operationId),
          }),
        );
        return;
      }

      if (context.operationId === 'mobile.commands') {
        const input = await this.readRequest(request, mobileCommandRequestSchema);
        const snapshot = await this.mobileSnapshot();
        if (contextSignal.aborted) {
          response.destroy();
          return;
        }
        switch (input.action) {
          case 'analyze': {
            requireTicketAction(snapshot, input.workItemId, 'analyze');
            this.respondAdmission(
              response,
              await this._dependencies.startAnalyzer(input.workItemId, input.prompt, contextSignal),
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
              await this._dependencies.startSolver(input.workItemId, input.feedback, contextSignal),
            );
            return;
          }
          case 'remove-queue-entry': {
            const entry = snapshot.executionQueue.find(
              (candidate) => candidate.id === input.entryId,
            );
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
            await this._dependencies.moveWorkItem(
              input.workItemId,
              input.boardColumnId,
              contextSignal,
            );
            this.respondCommandAccepted(response);
            return;
          }
        }
      }

      this.respondError(
        response,
        404,
        'MOBILE_ROUTE_NOT_FOUND',
        'The mobile route does not exist.',
      );
    } catch (cause) {
      if (contextSignal.aborted) {
        response.destroy();
        return;
      }
      const failure = requestFailure(cause);
      this._dependencies.reportRequestFailure?.({
        method: request.method ?? 'UNKNOWN',
        pathname: request.url?.split('?')[0] ?? '/',
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
    }
  }

  /**
   * Registers product invalidation delivery within an SDK-owned device lifetime.
   *
   * @param socket - Authenticated event connection.
   * @param context - Device identity and signal aborted on revocation, rebind or disposal.
   * @returns Resolves after activity recording and event cleanup are installed.
   * @public
   */
  public async webSocket(socket: WebSocket, context: IRemoteRequestContext): Promise<void> {
    await this._dependencies.recordActivity?.(context.principal.deviceId);
    if (context.signal.aborted) return;
    const deviceId = context.principal.deviceId;
    const connectedBefore = this.isConnected(deviceId);
    this._sockets.set(socket, deviceId);
    if (!connectedBefore) this.notifyConnections();
    const cleanup = () => {
      context.signal.removeEventListener('abort', cleanup);
      if (!this._sockets.delete(socket)) return;
      if (!this.isConnected(deviceId)) this.notifyConnections();
    };
    context.signal.addEventListener('abort', cleanup, { once: true });
    socket.once('close', cleanup);
  }

  /**
   * Observes changes of the connected device set, so the desktop shows presence without reading it on a timer.
   *
   * @param listener - Called synchronously when a device gains its first or loses its last event connection.
   * @returns Idempotent cleanup removing only this registration.
   * @public
   */
  public subscribeConnections(listener: () => void): () => void {
    const registration = (): void => listener();
    this._connectionListeners.add(registration);
    return () => {
      this._connectionListeners.delete(registration);
    };
  }

  /**
   * Projects currently connected devices without exposing transport or credential state.
   *
   * @returns Unique identifiers owning at least one live product event connection.
   * @public
   */
  public connectedDeviceIds(): ReadonlySet<string> {
    return new Set(this._sockets.values());
  }

  /**
   * Sends the existing typed invalidation event; clients reconcile through a fresh snapshot read.
   *
   * @public
   */
  public broadcastSnapshotInvalidated(): void {
    const message = JSON.stringify(
      mobileEventSchema.parse({
        type: 'snapshot.invalidated',
        occurredAt: (this._dependencies.now ?? (() => new Date()))().toISOString(),
      }),
    );
    for (const socket of this._sockets.keys())
      if (socket.readyState === WebSocket.OPEN) {
        if (socket.bufferedAmount > 1_048_576) socket.terminate();
        else socket.send(message);
      }
  }

  private isConnected(deviceId: string): boolean {
    for (const owner of this._sockets.values()) if (owner === deviceId) return true;
    return false;
  }

  private notifyConnections(): void {
    for (const listener of [...this._connectionListeners]) listener();
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
      ...(this._dependencies.displaySettings
        ? { displaySettings: this._dependencies.displaySettings() }
        : {}),
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

  // #endregion
}
