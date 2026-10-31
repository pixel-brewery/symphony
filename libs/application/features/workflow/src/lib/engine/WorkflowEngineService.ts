// #region Imports

import {
  type ClosureReasonCode,
  type IHumanDecision,
  type IRunResult,
  type IWorkflowAuditEntry,
  type IWorkflowClaim,
  type IWorkflowRecord,
  type ProcessRole,
  type WorkflowArtifactKind,
  type WorkflowStageId,
  findStage,
  analysisProvesReadiness,
  evaluateGuards,
  guardRationale,
  type IGuardFacts,
  routeHumanDecision,
  routeRunResult,
  type RoutingDecision,
} from '@symphony/domain-workflow';
import { type IWorkItem, type IWorkItemClaim, isClaimExpired } from '@symphony/domain-work';
import { ClaimRejectedError } from './ClaimRejectedError';
import { type IWorkflowEngineDependencies } from './IWorkflowEngineDependencies';

// #endregion

/** The reason a provider write failed, in one sentence an operator can act on. */
function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'the provider reported an unknown error.';
}

/**
 * The supervisor.
 *
 * Roles report a `RunResult`; people record a `HumanDecision`. Only this service turns either
 * into a stage change, and only after the transition's guards pass. Every outcome is written
 * to the append-only audit before its effect is applied, so a failure always leaves a named
 * follow-up step rather than an undefined state.
 */
export class WorkflowEngineService {
  // #region Ctor

  public constructor(private readonly _dependencies: IWorkflowEngineDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Records.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public record(workItemId: string): IWorkflowRecord | undefined {
    return this._dependencies.records.workflowRecord(workItemId);
  }

  /**
   * Returns the audit trail.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public auditTrail(workItemId: string): readonly IWorkflowAuditEntry[] {
    return this._dependencies.records.listWorkflowAudit(workItemId);
  }

  /**
   * Returns the durable record for an item, creating it from the board stage on first sight.
   * An item whose column is unmapped gets no record: Symphony never invents a stage.
   *
   * @param item - Item.
   * @public
   */
  public ensureRecord(item: IWorkItem): IWorkflowRecord | undefined {
    const existing = this._dependencies.records.workflowRecord(item.id);
    if (existing) return this.reconcileStage(existing, item);
    if (!item.stageId) return undefined;
    const now = this._dependencies.clock.now();
    const stage = findStage(this._dependencies.workflow().stages, item.stageId);
    const created: IWorkflowRecord = {
      workItemId: item.id,
      workspaceId: item.workspaceId ?? '',
      sourceId: item.sourceId ?? '',
      workflowId: this._dependencies.workflow().id,
      workflowVersion: this._dependencies.workflow().version,
      stageId: item.stageId,
      runtimeState: stage?.kind === 'human-gate' ? 'awaiting-human-review' : 'idle',
      revisions: {},
      routing: {},
      counters: {
        retriesByReason: {},
        reworksByRoute: {},
        consecutiveIdenticalFailures: 0,
        totalRuns: 0,
        enteredAt: now,
      },
      artifacts: [],
      pullRequestIds: [],
      updatedAt: now,
    };
    this._dependencies.records.saveWorkflowRecord(created);
    return created;
  }

  /**
   * Adopts a stage change performed by the operator through Symphony's own board, so the
   * audit names the person instead of blaming an anonymous external change.
   *
   * @param item - Item.
   * @param actor - Actor.
   * @public
   */
  public adoptOperatorStage(item: IWorkItem, actor: string): void {
    const record = this.ensureRecord(item);
    if (!record) return;
    this.adoptStage(record, item, actor, 'The operator moved the work item on the board.');
  }

  /**
   * Compares every workflow record with the board projection and repairs safe divergences.
   *
   * A drifted stage is adopted; a stage whose entry gate the item never passed is escalated
   * to a person instead of silently accepted. Adoption and escalation run in the same pass,
   * so a stage that arrives unproven is questioned immediately rather than one interval
   * later. Items outside the supplied projection are left untouched: absence from the
   * current view scope is not proof of remote deletion.
   *
   * @param items - Items.
   * @public
   */
  public reconcile(items: readonly IWorkItem[]): { adopted: number; escalated: number } {
    const byId = new Map(items.map((item) => [item.id, item]));
    let adopted = 0;
    let escalated = 0;
    for (const stored of this._dependencies.records.listWorkflowRecords()) {
      const item = byId.get(stored.workItemId);
      if (!item?.stageId) continue;
      let record = stored;
      if (item.stageId !== record.stageId) {
        record = this.reconcileStage(record, item);
        adopted += 1;
      }
      const unproven = this.unprovenStageEntry(record);
      if (
        unproven &&
        record.runtimeState !== 'human-required' &&
        record.routing.closureReason === undefined
      ) {
        this.escalateHeld(item, `Can ${item.externalId} stay in ${record.stageId}?`, unproven);
        escalated += 1;
      }
    }
    return { adopted, escalated };
  }

  /**
   * Records that a role started working on the item.
   *
   * @param item - Item.
   * @param role - Role.
   * @param runId - Run id.
   * @param skillVersion - Skill version.
   * @param promptVersion - Prompt version.
   * @public
   */
  public runStarted(
    item: IWorkItem,
    role: ProcessRole,
    runId: string,
    skillVersion: string,
    promptVersion: number,
  ): void {
    const record = this.ensureRecord(item);
    if (!record) return;
    const now = this._dependencies.clock.now();
    this._dependencies.records.saveWorkflowRecord({
      ...record,
      runtimeState: 'running',
      activeRun: {
        id: runId,
        role,
        startedAt: now,
        attempt: (record.activeRun?.attempt ?? 0) + 1,
        skillVersion,
        promptVersion,
      },
      counters: { ...record.counters, totalRuns: record.counters.totalRuns + 1 },
      updatedAt: now,
    });
  }

  /**
   * Applies the stage transition a freshly acquired claim triggers, if the workflow defines
   * one for the item's stage - with its guards, not around them.
   *
   * The provider claim is mirrored onto the record for the duration of the run so the claim,
   * lease, and fencing guards judge real state. A rejection clears the mirror and throws a
   * `ClaimRejectedError`: the caller must abort the start and release the provider claim.
   *
   * @param item - Item.
   * @param role - Role.
   * @param runId - Run id.
   * @param claim - Claim.
   * @public
   */
  public async applyClaim(
    item: IWorkItem,
    role: ProcessRole,
    runId: string,
    claim?: IWorkItemClaim,
  ): Promise<IWorkItem> {
    const record = this.ensureRecord(item);
    if (!record) return item;
    const now = this._dependencies.clock.now();
    const mirrored: IWorkflowClaim | undefined = claim
      ? {
          runId,
          role,
          owner: claim.owner,
          acquiredAt: claim.acquiredAt,
          // A claim without a lease carries no runway; mirroring its acquisition instant
          // makes the lease guard reject it instead of granting it eternal validity.
          leaseUntil: claim.leaseUntil ?? claim.acquiredAt,
          heartbeatAt: claim.heartbeatAt ?? claim.acquiredAt,
          claimVersion: claim.claimVersion ?? 1,
          externalReference: claim.id,
        }
      : undefined;
    const claimed: IWorkflowRecord = {
      ...record,
      ...(mirrored ? { claim: mirrored } : {}),
      updatedAt: now,
    };
    const transition = this._dependencies
      .workflow()
      .transitions.find(
        (candidate) =>
          candidate.from === record.stageId &&
          candidate.trigger.kind === 'claim' &&
          candidate.trigger.role === role,
      );
    if (!transition) {
      this.save(claimed);
      return item;
    }
    // The evaluation acts on behalf of the claim holder, so their identity is the owner the
    // fencing guard compares against; the orchestrator identity applies otherwise.
    const facts: IGuardFacts = {
      ...this.guardFacts(claimed, item, undefined),
      ...(mirrored ? { owner: mirrored.owner, claimVersion: mirrored.claimVersion } : {}),
    };
    const evaluation = evaluateGuards(transition.guards, facts);
    if (!evaluation.satisfied) {
      const rationale = guardRationale(evaluation);
      this.audit({
        workItemId: record.workItemId,
        kind: 'guard-rejected',
        fromStageId: record.stageId,
        toStageId: transition.to,
        role,
        actor: mirrored?.owner ?? this._dependencies.owner(),
        detail: rationale,
        failedGuards: evaluation.failed.map((failure) => failure.guard),
      });
      this.save({
        ...claimed,
        claim: undefined,
        runtimeState: 'human-required',
        humanRequest: {
          id: this._dependencies.ids.next('question'),
          raisedAt: now,
          raisedByRole: 'supervisor',
          reasonCode: 'guard-not-satisfiable',
          question: `Can ${item.externalId} move to ${transition.to}?`,
          rationale,
          options: ['Resolve the listed conditions', 'Route the work item elsewhere'],
          consequences: ['The work item stays where it is until a person decides.'],
          invalidates: [],
        },
        updatedAt: now,
      });
      throw new ClaimRejectedError(item.externalId, transition.to, rationale);
    }
    const moved = await this._dependencies.tracker.transition(item.id, transition.to);
    this._dependencies.workItemChanged?.(moved);
    this.audit({
      workItemId: record.workItemId,
      kind: 'stage-changed',
      fromStageId: record.stageId,
      toStageId: transition.to,
      role,
      actor: mirrored?.owner ?? this._dependencies.owner(),
      detail: `Transition ${transition.id} applied on the ${role} claim.`,
    });
    this.save({
      ...claimed,
      stageId: transition.to,
      runtimeState: this.stateForStage(transition.to),
      humanRequest: undefined,
      counters: { ...claimed.counters, enteredAt: now },
      updatedAt: now,
    });
    return moved;
  }

  /**
   * Routes a finished run and applies the resulting effect.
   *
   * @param item - Item.
   * @param result - Result.
   * @public
   */
  public async applyRunResult(
    item: IWorkItem,
    result: IRunResult,
  ): Promise<IWorkflowRecord | undefined> {
    const record = this.ensureRecord(item);
    if (!record) return undefined;
    this.audit({
      workItemId: record.workItemId,
      kind: 'run-reported',
      role: result.role,
      outcome: result.outcome,
      reasonCode: result.reasonCode,
      actor: this._dependencies.owner(),
      detail: result.summary,
    });
    // A guard rejection leaves a supervisor question on the record. A newly reported run is
    // fresh evidence that supersedes that question: the guards run again below and raise it
    // anew if they are still unmet. Without this, the stale question fails `no-open-question`
    // forever and no later success could ever move the work item.
    const supersedesGuardQuestion =
      record.humanRequest?.raisedByRole === 'supervisor' &&
      record.humanRequest.reasonCode === 'guard-not-satisfiable';
    const withRevisions: IWorkflowRecord = {
      ...record,
      ...(supersedesGuardQuestion ? { humanRequest: undefined } : {}),
      ...(result.analysis ? { analysis: result.analysis } : {}),
      revisions: { ...record.revisions, ...(result.revisions ?? {}) },
      artifacts: [...record.artifacts, ...(result.artifacts ?? [])],
      pullRequestIds:
        result.pullRequest && !record.pullRequestIds.includes(result.pullRequest.id)
          ? [...record.pullRequestIds, result.pullRequest.id]
          : record.pullRequestIds,
      routing: {
        ...record.routing,
        lastOutcome: result.outcome,
        ...(result.reasonCode ? { lastReasonCode: result.reasonCode } : {}),
      },
    };
    const decision = routeRunResult(this._dependencies.workflow(), withRevisions, result, {
      now: new Date(this._dependencies.clock.now()),
      jitter: this._dependencies.jitter ?? (() => 0.5),
    });
    return this.apply(withRevisions, decision, item, result);
  }

  /**
   * Resolves an operator's option against the current stage and records one audited decision.
   *
   * @param item - The already loaded work item.
   * @param decision - The operator's command and attribution.
   * @public
   */
  public applyOperatorDecision(
    item: IWorkItem,
    decision: Pick<IHumanDecision, 'workItemId' | 'optionId' | 'decidedBy' | 'note' | 'commitSha'>,
  ): Promise<IWorkflowRecord | undefined> {
    const record = this.ensureRecord(item);
    const stage = this._dependencies
      .workflow()
      .stages.find((candidate) => candidate.id === record?.stageId);
    const option = stage?.decisions?.find((candidate) => candidate.id === decision.optionId);
    if (!option) {
      throw new Error(`The current stage offers no decision "${decision.optionId}".`);
    }
    return this.applyHumanDecision(item, {
      id: this._dependencies.ids.next('decision'),
      workItemId: decision.workItemId,
      stageId: stage!.id,
      optionId: option.id,
      effect: option.effect,
      ...(option.targetStageId ? { targetStageId: option.targetStageId } : {}),
      ...(option.closureReason ? { closureReason: option.closureReason } : {}),
      decidedBy: decision.decidedBy,
      decidedAt: this._dependencies.clock.now(),
      ...(decision.note ? { note: decision.note } : {}),
      source: 'operator',
      ...(decision.commitSha ? { commitSha: decision.commitSha } : {}),
    });
  }

  /**
   * Routes a human decision. This is the only path through a human gate.
   *
   * @param item - Item.
   * @param decision - Decision.
   * @public
   */
  public async applyHumanDecision(
    item: IWorkItem,
    decision: IHumanDecision,
  ): Promise<IWorkflowRecord | undefined> {
    const record = this.ensureRecord(item);
    if (!record) {
      throw new Error(
        `Work item ${item.externalId} sits in a board column that is not mapped to a workflow stage. Map the column in the board settings.`,
      );
    }
    this.audit({
      workItemId: record.workItemId,
      kind: 'human-decided',
      fromStageId: record.stageId,
      actor: decision.decidedBy,
      detail: `${decision.optionId}${decision.note ? `: ${decision.note}` : ''}`,
    });
    const routed = routeHumanDecision(this._dependencies.workflow(), record, decision);
    return this.apply(record, routed, item, undefined, decision);
  }

  /**
   * Records a person's answer to a supervisor question and lets automation continue.
   *
   * This is the only way an open question on an automated stage ends: gate decisions belong
   * to gate stages, but a question raised by an escalation or a guard rejection is addressed
   * to whoever operates the process. A stale identifier means the question was superseded by
   * newer evidence in the meantime; the answer is refused so nobody decides on outdated facts.
   *
   * @param item - Item.
   * @param answer - Answer.
   * @public
   */
  public answerHumanRequest(
    item: IWorkItem,
    answer: {
      readonly questionId: string;
      readonly option?: string;
      readonly note?: string;
      readonly answeredBy: string;
    },
  ): IWorkflowRecord {
    const record = this.ensureRecord(item);
    if (!record) {
      throw new Error(
        `Work item ${item.externalId} sits in a board column that is not mapped to a workflow stage. Map the column in the board settings.`,
      );
    }
    if (!record.humanRequest || record.humanRequest.id !== answer.questionId) {
      throw new Error(
        `The question on ${item.externalId} was already answered or superseded. Refresh the process view before deciding.`,
      );
    }
    if (answer.option && !record.humanRequest.options.includes(answer.option)) {
      throw new Error(`The question on ${item.externalId} offers no option "${answer.option}".`);
    }
    const now = this._dependencies.clock.now();
    this.audit({
      workItemId: record.workItemId,
      kind: 'human-decided',
      fromStageId: record.stageId,
      actor: answer.answeredBy,
      detail: `${answer.option ?? 'Question dismissed'}${answer.note ? `: ${answer.note}` : ''}`,
    });
    return this.save({
      ...record,
      humanRequest: undefined,
      runtimeState: this.stateForStage(record.stageId),
      updatedAt: now,
    });
  }

  /**
   * Marks unanswered supervisor questions that exceeded the configured reminder or
   * escalation deadline, so the wait is visible instead of silent.
   *
   * @public
   */
  public remindOverdueQuestions(): { reminded: number; escalated: number } {
    const policy = this._dependencies.workflow().policies.humanRequired;
    const now = new Date(this._dependencies.clock.now()).getTime();
    const nowIso = this._dependencies.clock.now();
    let reminded = 0;
    let escalated = 0;
    for (const record of this._dependencies.records.listWorkflowRecords()) {
      const request = record.humanRequest;
      if (!request || record.runtimeState !== 'human-required') continue;
      const raisedAt = new Date(request.raisedAt).getTime();
      if (Number.isNaN(raisedAt)) continue;
      if (now >= raisedAt + policy.escalationHours * 3_600_000 && !request.escalatedAt) {
        this.audit({
          workItemId: record.workItemId,
          kind: 'escalated',
          reasonCode: 'decision-required',
          actor: this._dependencies.owner(),
          detail: `The question has waited longer than ${policy.escalationHours} hours and needs the process owner.`,
        });
        this.save({
          ...record,
          humanRequest: {
            ...request,
            escalatedAt: nowIso,
            remindedAt: request.remindedAt ?? nowIso,
          },
          updatedAt: nowIso,
        });
        escalated += 1;
        continue;
      }
      if (now >= raisedAt + policy.reminderHours * 3_600_000 && !request.remindedAt) {
        this.audit({
          workItemId: record.workItemId,
          kind: 'escalated',
          reasonCode: 'decision-required',
          actor: this._dependencies.owner(),
          detail: `Reminder: the question has waited longer than ${policy.reminderHours} hours.`,
        });
        this.save({
          ...record,
          humanRequest: { ...request, remindedAt: nowIso },
          updatedAt: nowIso,
        });
        reminded += 1;
      }
    }
    return { reminded, escalated };
  }

  /**
   * Records whose runtime state parks them until the scheduler or a person acts.
   *
   * @public
   */
  public heldRecords(): readonly IWorkflowRecord[] {
    return this._dependencies.records
      .listWorkflowRecords()
      .filter(
        (record) => record.runtimeState === 'retry-wait' || record.runtimeState === 'blocked',
      );
  }

  /**
   * Releases a held record back to automation - a due retry or a resolved blocker. The caller
   * starts the resumed role; this only restores the record and leaves the audit evidence.
   *
   * @param item - Item.
   * @param detail - Detail.
   * @public
   */
  public resumeHeld(item: IWorkItem, detail: string): IWorkflowRecord | undefined {
    const record = this.ensureRecord(item);
    if (!record) return undefined;
    if (record.runtimeState !== 'retry-wait' && record.runtimeState !== 'blocked') return record;
    const now = this._dependencies.clock.now();
    this.audit({
      workItemId: record.workItemId,
      kind: 'resumed',
      actor: this._dependencies.owner(),
      detail,
    });
    return this.save({
      ...record,
      runtimeState: 'idle',
      routing: {
        ...record.routing,
        nextRetryAt: undefined,
        blockedSince: undefined,
        blockingWorkItemIds: undefined,
      },
      updatedAt: now,
    });
  }

  /**
   * Escalates a held record to a person when automation cannot resume it safely - for
   * example a blocker that no longer exists, or a resumption whose start keeps failing.
   *
   * @param item - Item.
   * @param question - Question.
   * @param rationale - Rationale.
   * @public
   */
  public escalateHeld(item: IWorkItem, question: string, rationale: string): void {
    const record = this.ensureRecord(item);
    if (!record) return;
    if (
      record.runtimeState === 'human-required' &&
      record.humanRequest?.question === question &&
      record.humanRequest.rationale === rationale
    ) {
      return;
    }
    const now = this._dependencies.clock.now();
    this.audit({
      workItemId: record.workItemId,
      kind: 'escalated',
      reasonCode: 'decision-required',
      actor: this._dependencies.owner(),
      detail: rationale,
    });
    this.save({
      ...record,
      runtimeState: 'human-required',
      humanRequest: {
        id: this._dependencies.ids.next('question'),
        raisedAt: now,
        raisedByRole: 'supervisor',
        reasonCode: 'decision-required',
        question,
        rationale,
        options: [],
        consequences: [],
        invalidates: [],
      },
      updatedAt: now,
    });
  }

  /**
   * Adopts a stage change that happened in the provider board. A person moving a card is a
   * legitimate input; the record follows it and the run that was in flight is invalidated.
   */
  private reconcileStage(record: IWorkflowRecord, item: IWorkItem): IWorkflowRecord {
    return this.adoptStage(
      record,
      item,
      'tracker',
      'The stage was changed outside Symphony; the workflow record followed it.',
    );
  }

  private adoptStage(
    record: IWorkflowRecord,
    item: IWorkItem,
    actor: string,
    detail: string,
  ): IWorkflowRecord {
    if (!item.stageId || item.stageId === record.stageId) return record;
    const now = this._dependencies.clock.now();
    const stage = findStage(this._dependencies.workflow().stages, item.stageId);
    this.audit({
      workItemId: record.workItemId,
      kind: 'stage-changed',
      fromStageId: record.stageId,
      toStageId: item.stageId,
      actor,
      detail,
    });
    const reconciled: IWorkflowRecord = {
      ...record,
      stageId: item.stageId,
      runtimeState: stage?.kind === 'human-gate' ? 'awaiting-human-review' : 'idle',
      activeRun: undefined,
      counters: { ...record.counters, enteredAt: now },
      updatedAt: now,
    };
    this._dependencies.records.saveWorkflowRecord(reconciled);
    return reconciled;
  }

  /**
   * Why this record may not hold its current stage, if it may not.
   *
   * A stage reached through Symphony passed the guards of its entry transition. A stage
   * adopted from the provider board passed nothing: an agent or a person moved the card, and
   * the board is authoritative for where an item sits but proves nothing about what the stage
   * asserts. The evidence each gated stage claims is therefore checked here, so an item
   * cannot rest in a stage whose promise no artifact backs.
   */
  private unprovenStageEntry(record: IWorkflowRecord): string | undefined {
    if (this.requiresVerification(record.stageId) && !record.revisions.verifiedCommitSha) {
      return 'The stage expects a passing verification, but no verified commit is recorded. Accept deliberately or route the work item back.';
    }
    if (this.requiresAnalysis(record.stageId) && !analysisProvesReadiness(record.analysis)) {
      return 'The stage expects an analysis that is ready for implementation, but none is recorded. The work item was moved here outside Symphony. Route it back for analysis or record one deliberately.';
    }
    return undefined;
  }

  /** Whether the workflow places this stage behind a passing analysis. */
  private requiresAnalysis(stageId: WorkflowStageId): boolean {
    return this.gatedByRoleOutcome(stageId, 'analyze');
  }

  /** Whether the workflow places this stage behind a passing verification. */
  private requiresVerification(stageId: WorkflowStageId): boolean {
    return this.gatedByRoleOutcome(stageId, 'verify');
  }

  /** Whether some transition reaching this stage is the passing outcome of this role. */
  private gatedByRoleOutcome(stageId: WorkflowStageId, role: ProcessRole): boolean {
    return this._dependencies
      .workflow()
      .transitions.some(
        (transition) =>
          transition.to === stageId &&
          transition.trigger.kind === 'outcome' &&
          transition.trigger.role === role &&
          transition.trigger.outcome === 'pass',
      );
  }

  private async apply(
    record: IWorkflowRecord,
    decision: RoutingDecision,
    item: IWorkItem,
    result?: IRunResult,
    humanDecision?: IHumanDecision,
  ): Promise<IWorkflowRecord> {
    const now = this._dependencies.clock.now();
    switch (decision.kind) {
      case 'transition': {
        const facts = this.guardFacts(record, item, humanDecision, result);
        const evaluation = evaluateGuards(decision.transition.guards, facts);
        if (!evaluation.satisfied) {
          const rationale = guardRationale(evaluation);
          // A synchronization loop re-reports the same result every interval. The first
          // rejection is evidence; identical repetitions would only flood the audit trail.
          if (
            record.runtimeState === 'human-required' &&
            record.humanRequest?.reasonCode === 'guard-not-satisfiable' &&
            record.humanRequest.rationale === rationale
          ) {
            return this.save({ ...record, updatedAt: now });
          }
          this.audit({
            workItemId: record.workItemId,
            kind: 'guard-rejected',
            fromStageId: record.stageId,
            toStageId: decision.transition.to,
            actor: this._dependencies.owner(),
            detail: rationale,
            failedGuards: evaluation.failed.map((failure) => failure.guard),
          });
          return this.save({
            ...record,
            // The reporting run is over either way, so its claim buys nothing here - and a
            // claim nobody releases keeps occupying the change surface of every overlapping
            // work item until its lease elapses. The claim path releases on rejection too.
            claim: undefined,
            runtimeState: 'human-required',
            humanRequest: {
              id: this._dependencies.ids.next('question'),
              raisedAt: now,
              raisedByRole: 'supervisor',
              reasonCode: 'guard-not-satisfiable',
              question: `Can ${item.externalId} move to ${decision.transition.to}?`,
              rationale,
              options: ['Resolve the listed conditions', 'Route the work item elsewhere'],
              consequences: ['The work item stays where it is until a person decides.'],
              invalidates: [],
            },
            updatedAt: now,
          });
        }
        const moved = await this._dependencies.tracker.transition(item.id, decision.transition.to);
        this._dependencies.workItemChanged?.(moved);
        this.audit({
          workItemId: record.workItemId,
          kind: 'stage-changed',
          fromStageId: record.stageId,
          toStageId: decision.transition.to,
          role: result?.role,
          outcome: result?.outcome,
          actor: humanDecision?.decidedBy ?? this._dependencies.owner(),
          detail: `Transition ${decision.transition.id} applied.`,
        });
        return this.save({
          ...record,
          stageId: decision.transition.to,
          runtimeState: this.stateForStage(decision.transition.to),
          activeRun: undefined,
          claim: undefined,
          humanRequest: undefined,
          ...(decision.invalidates.includes('analysis') ? { analysis: undefined } : {}),
          artifacts: this.invalidate(record, decision.invalidates, now),
          counters: this.countTransition(
            record,
            decision.transition.from,
            decision.transition.to,
            result,
          ),
          updatedAt: now,
        });
      }

      case 'retry': {
        this.audit({
          workItemId: record.workItemId,
          kind: 'retry-scheduled',
          role: result?.role,
          reasonCode: decision.reasonCode,
          actor: this._dependencies.owner(),
          detail: `Attempt ${decision.attempt} scheduled for ${decision.retryAt}.`,
        });
        return this.save({
          ...record,
          runtimeState: 'retry-wait',
          activeRun: undefined,
          claim: undefined,
          routing: {
            ...record.routing,
            nextRetryAt: decision.retryAt,
            ...(result ? { resumeRole: result.role } : {}),
          },
          counters: {
            ...record.counters,
            retriesByReason: {
              ...record.counters.retriesByReason,
              [decision.reasonCode]: decision.attempt,
            },
          },
          updatedAt: now,
        });
      }

      case 'hold': {
        this.audit({
          workItemId: record.workItemId,
          kind: decision.runtimeState === 'blocked' ? 'blocked' : 'run-reported',
          role: result?.role,
          reasonCode: decision.reasonCode,
          actor: this._dependencies.owner(),
          detail: result?.summary ?? 'The work item stays in its stage.',
        });
        return this.save({
          ...record,
          runtimeState: decision.runtimeState,
          activeRun: undefined,
          claim: undefined,
          routing: {
            ...record.routing,
            ...(decision.runtimeState === 'blocked'
              ? {
                  blockedSince: now,
                  blockingWorkItemIds: result?.blockingWorkItemIds ?? [],
                  ...(result ? { resumeRole: result.role } : {}),
                }
              : {}),
          },
          updatedAt: now,
        });
      }

      case 'escalate': {
        const question =
          result?.humanRequest?.question ?? `How should ${item.externalId} continue?`;
        // Re-reported results must not raise the identical question again every interval.
        if (
          record.runtimeState === 'human-required' &&
          record.humanRequest?.reasonCode === decision.reasonCode &&
          record.humanRequest.question === question
        ) {
          return this.save({ ...record, activeRun: undefined, claim: undefined, updatedAt: now });
        }
        this.audit({
          workItemId: record.workItemId,
          kind: 'escalated',
          role: result?.role,
          reasonCode: decision.reasonCode,
          actor: this._dependencies.owner(),
          detail: result?.summary ?? 'A person has to decide how this work item continues.',
        });
        return this.save({
          ...record,
          runtimeState: 'human-required',
          activeRun: undefined,
          claim: undefined,
          humanRequest: {
            id: this._dependencies.ids.next('question'),
            raisedAt: now,
            raisedByRole: result?.role ?? 'supervisor',
            reasonCode: decision.reasonCode,
            question,
            rationale: result?.humanRequest?.rationale ?? result?.summary ?? '',
            options: result?.humanRequest?.options ?? [],
            consequences: result?.humanRequest?.consequences ?? [],
            invalidates: result?.humanRequest?.invalidates ?? [],
          },
          updatedAt: now,
        });
      }

      case 'quarantine': {
        this.audit({
          workItemId: record.workItemId,
          kind: 'quarantined',
          role: result?.role,
          reasonCode: decision.reasonCode,
          actor: this._dependencies.owner(),
          detail: result?.summary ?? 'Automatic processing stopped for safety.',
        });
        return this.save({
          ...record,
          runtimeState: 'quarantined',
          activeRun: undefined,
          claim: undefined,
          updatedAt: now,
        });
      }

      case 'close': {
        const closure = await this.closeTracked(item, decision.closureReason);
        this.audit({
          workItemId: record.workItemId,
          kind: 'closed',
          reasonCode: decision.closureReason,
          actor: humanDecision?.decidedBy ?? this._dependencies.owner(),
          detail: `Closed as ${decision.closureReason}. ${closure.detail}`,
          ...(closure.stageId && closure.stageId !== record.stageId
            ? { fromStageId: record.stageId, toStageId: closure.stageId }
            : {}),
        });
        return this.save({
          ...record,
          ...(closure.stageId ? { stageId: closure.stageId } : {}),
          runtimeState: 'closed',
          activeRun: undefined,
          claim: undefined,
          humanRequest: undefined,
          routing: { ...record.routing, closureReason: decision.closureReason },
          updatedAt: now,
        });
      }
    }
  }

  /**
   * Carries a closure to the provider so the tracked item stops being an open request.
   *
   * Two things make a closure real outside Symphony: the item is closed at the provider with
   * the reason it was closed for, and the board stops showing it among the work that is still
   * being done. Both are attempted, both are optional - a provider without a close operation,
   * or a workflow without a terminal stage, still leaves a recorded closure - and neither is
   * allowed to fail the decision the operator already took. What actually happened is
   * returned so the audit entry states it instead of implying more than was done.
   */
  private async closeTracked(
    item: IWorkItem,
    reason: ClosureReasonCode,
  ): Promise<{ readonly stageId?: WorkflowStageId; readonly detail: string }> {
    const notes: string[] = [];
    let changed: IWorkItem | undefined;
    if (this._dependencies.tracker.closeWorkItem) {
      try {
        changed = await this._dependencies.tracker.closeWorkItem(item.id, reason);
      } catch (cause) {
        notes.push(`The provider did not close the item: ${describeCause(cause)}`);
      }
    } else {
      notes.push('The provider offers no close operation, so the closure is recorded locally.');
    }
    const terminal = this.terminalStageId();
    if (terminal && item.stageId !== terminal) {
      try {
        changed = await this._dependencies.tracker.transition(item.id, terminal);
      } catch (cause) {
        notes.push(`The board still shows the item where it was: ${describeCause(cause)}`);
      }
    }
    if (changed) this._dependencies.workItemChanged?.(changed);
    return {
      ...(changed?.stageId ? { stageId: changed.stageId } : {}),
      detail: notes.length ? notes.join(' ') : 'The provider item is closed.',
    };
  }

  /** The stage a closed item comes to rest in, when the workflow declares one. */
  private terminalStageId(): WorkflowStageId | undefined {
    return this._dependencies.workflow().stages.find((stage) => stage.kind === 'terminal')?.id;
  }

  private stateForStage(stageId: WorkflowStageId): IWorkflowRecord['runtimeState'] {
    const stage = findStage(this._dependencies.workflow().stages, stageId);
    if (stage?.kind === 'human-gate') return 'awaiting-human-review';
    if (stage?.kind === 'terminal') return 'closed';
    return 'idle';
  }

  private invalidate(
    record: IWorkflowRecord,
    kinds: readonly WorkflowArtifactKind[],
    now: string,
  ): IWorkflowRecord['artifacts'] {
    if (kinds.length === 0) return record.artifacts;
    return record.artifacts.map((artifact) =>
      kinds.includes(artifact.kind) && !artifact.invalidatedAt
        ? { ...artifact, invalidatedAt: now }
        : artifact,
    );
  }

  private countTransition(
    record: IWorkflowRecord,
    from: WorkflowStageId,
    to: WorkflowStageId,
    result: IRunResult | undefined,
  ): IWorkflowRecord['counters'] {
    const now = this._dependencies.clock.now();
    if (result?.outcome !== 'rework') {
      return { ...record.counters, consecutiveIdenticalFailures: 0, enteredAt: now };
    }
    const key = `${from}->${to}`;
    return {
      ...record.counters,
      reworksByRoute: {
        ...record.counters.reworksByRoute,
        [key]: (record.counters.reworksByRoute[key] ?? 0) + 1,
      },
      enteredAt: now,
    };
  }

  /**
   * Facts the guards evaluate. Anything Symphony cannot currently prove stays false, so a
   * transition that depends on it is refused with the guard named rather than waved through.
   */
  private guardFacts(
    record: IWorkflowRecord,
    item: IWorkItem,
    decision: IHumanDecision | undefined,
    result?: IRunResult,
  ): IGuardFacts {
    return {
      record,
      now: new Date(this._dependencies.clock.now()),
      ...(decision ? { decision } : {}),
      ...(record.analysis ? { analysis: record.analysis } : {}),
      ...(result?.pullRequest ? { pullRequest: result.pullRequest } : {}),
      ...(result?.verification ? { verification: result.verification } : {}),
      workItem: {
        title: item.title,
        body: item.body,
        ...(item.revision !== undefined ? { revision: String(item.revision) } : {}),
        closed: record.routing.closureReason !== undefined,
      },
      dependenciesSatisfied: this.dependenciesSatisfied(record),
      collidingWorkItemIds: this.collidingWorkItemIds(record),
      // Capacity comes from the composition root's execution accounting; without that
      // supplier the guard cannot be proven and fails closed.
      capacityAvailable: this._dependencies.capacityAvailable?.() ?? false,
      riskPolicySatisfied: this.riskPolicySatisfied(record),
      // The audit is written before every effect by construction, so completeness holds
      // whenever this engine is the one moving the item.
      auditComplete: true,
      owner: this._dependencies.owner(),
      ...(record.claim ? { claimVersion: record.claim.claimVersion } : {}),
    };
  }

  /**
   * Symphony has no dependency-resolution source yet, so a declared hard dependency is an
   * unproven precondition: the guard fails closed and a person confirms it deliberately. An
   * analysis without declared hard dependencies proves the absence.
   */
  private dependenciesSatisfied(record: IWorkflowRecord): boolean {
    if (!record.analysis) return false;
    return record.analysis.dependencies.every((dependency) => dependency.type !== 'hard');
  }

  /**
   * High-collision work must not run twice concurrently: another record whose claim still runs
   * and whose likely change surface overlaps collides when either side declares an elevated
   * collision risk.
   */
  private collidingWorkItemIds(record: IWorkflowRecord): readonly string[] {
    const surface = new Set(record.analysis?.likelyChangeSurface ?? []);
    if (surface.size === 0) return [];
    const elevated = (risk: string | undefined): boolean => risk === 'high' || risk === 'critical';
    const now = new Date(this._dependencies.clock.now());
    return this._dependencies.records
      .listWorkflowRecords()
      .filter(
        (other) =>
          other.workItemId !== record.workItemId &&
          other.workspaceId === record.workspaceId &&
          this.occupies(other, now) &&
          (elevated(other.analysis?.collisionRisk) || elevated(record.analysis?.collisionRisk)) &&
          (other.analysis?.likelyChangeSurface ?? []).some((path) => surface.has(path)),
      )
      .map((other) => other.workItemId);
  }

  /**
   * Whether the record's claim still holds its change surface.
   *
   * An elapsed lease means the owning run is gone: `lease-active` rejects it, the action surface
   * offers the item again, and the tracker sweeps the abandoned reference. Occupancy has to read
   * the same way, or one abandoned claim blocks every overlapping work item indefinitely.
   */
  private occupies(record: IWorkflowRecord, now: Date): boolean {
    return record.claim !== undefined && !isClaimExpired(record.claim, now);
  }

  /**
   * Critical risk requires a person: automation refuses the transition and the operator
   * decides deliberately. Anything below critical proceeds; an item without a stored
   * analysis cannot prove its class and fails closed.
   */
  private riskPolicySatisfied(record: IWorkflowRecord): boolean {
    if (!record.analysis) return false;
    return record.analysis.risk.class !== 'critical';
  }

  private save(record: IWorkflowRecord): IWorkflowRecord {
    this._dependencies.records.saveWorkflowRecord(record);
    return record;
  }

  private audit(entry: Omit<IWorkflowAuditEntry, 'id' | 'sequence' | 'occurredAt'>): void {
    this._dependencies.records.saveWorkflowAudit({
      ...entry,
      id: this._dependencies.ids.next('audit'),
      sequence: this._dependencies.records.nextWorkflowAuditSequence(),
      occurredAt: this._dependencies.clock.now(),
    });
  }

  // #endregion
}
