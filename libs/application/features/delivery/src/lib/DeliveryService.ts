// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IDeliveryLaunchPlan, IDeliveryOperation } from '@symphony/domain-delivery';
import type { IDeliveryLaunchPort } from './ports/IDeliveryLaunchPort';
import type { IDeliveryOperationRepository } from './ports/IDeliveryOperationRepository';

// #endregion

/**
 * Coordinates explicit delivery launches with durable duplicate prevention and read-only recovery.
 *
 * @public
 */
export class DeliveryService {
  // #region Fields

  private readonly _active = new Set<string>();

  // #endregion

  // #region Ctor

  /**
   * Creates the delivery lifecycle from its provider and durable journal boundaries.
   *
   * @param _port - Version checks, provider dispatch and read-only reconciliation.
   * @param _repository - Durable delivery intents and observed run evidence.
   * @param _now - Clock supplying the persisted launch timestamp.
   * @public
   */
  public constructor(
    private readonly _port: IDeliveryLaunchPort,
    private readonly _repository: IDeliveryOperationRepository,
    private readonly _now: () => string,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Resolves the exact delivery intent for an existing target and requested reference.
   *
   * @param targetId - Configured delivery target identifier.
   * @param ref - Requested source-control reference.
   * @returns The provider-validated delivery plan.
   * @public
   */
  public preview(targetId: string, ref: string): Promise<IDeliveryLaunchPlan> {
    return this._port.preview(targetId, ref);
  }

  /**
   * Persists intent before dispatch and keeps uncertain mutations blocked across restarts.
   *
   * @param id - Stable caller-owned operation identifier reused for the same intent.
   * @param plan - Exact target, version and workflow evidence approved for dispatch.
   * @returns The durable operation and its accepted or uncertain outcome.
   * @public
   */
  public async start(id: string, plan: IDeliveryLaunchPlan): Promise<IDeliveryOperation> {
    const existing = this._repository.list().find((operation) => operation.id === id);
    if (existing) {
      if (JSON.stringify(existing.plan) !== JSON.stringify(plan))
        throw new Error('This operation ID belongs to another delivery intent.');
      return existing;
    }
    const pending = this._repository
      .list()
      .find(
        (operation) =>
          operation.plan.targetId === plan.targetId &&
          (operation.state === 'submitting' || operation.state === 'uncertain'),
      );
    if (pending || this._active.has(plan.targetId))
      throw new Error('Reconcile the existing delivery before starting another one.');
    this._active.add(plan.targetId);
    try {
      for (const operation of this._repository
        .list()
        .filter(
          (item) =>
            item.plan.targetId === plan.targetId &&
            item.state === 'accepted' &&
            item.run &&
            (item.run.status === 'queued' || item.run.status === 'in-progress'),
        )) {
        const run = await this._port.readRun(operation.plan, operation.run!.id);
        this._repository.save({ ...operation, run });
        if (run.status === 'queued' || run.status === 'in-progress')
          throw new Error(
            'This target already has a running delivery. Open its Actions run before starting another version.',
          );
      }
      await this._port.check(plan);
      const operation: IDeliveryOperation = {
        id,
        plan,
        state: 'submitting',
        startedAt: this._now(),
      };
      this._repository.save(operation);
      try {
        const run = await this._port.dispatch(plan, id);
        const accepted = this.acceptedOperation(operation, run);
        this._repository.save(accepted);
        return accepted;
      } catch {
        const uncertain: IDeliveryOperation = {
          ...operation,
          state: 'uncertain',
          message:
            'The dispatch response is unclear. Reconcile this request and inspect Actions before another launch.',
        };
        this._repository.save(uncertain);
        return uncertain;
      }
    } finally {
      this._active.delete(plan.targetId);
    }
  }

  /**
   * Returns the durable delivery operations available to the owning workspace.
   *
   * @returns Recorded delivery intents and their latest evidence.
   * @public
   */
  public list(): readonly IDeliveryOperation[] {
    return this._repository.list();
  }

  /**
   * Reconciles a recorded delivery through reads without repeating its provider mutation.
   *
   * @param id - Existing durable operation identifier.
   * @returns Updated evidence, retaining uncertainty when no run proves acceptance.
   * @public
   */
  public async reconcile(id: string): Promise<IDeliveryOperation> {
    const operation = this._repository.list().find((item) => item.id === id);
    if (!operation) throw new Error('This delivery request is unavailable.');
    if (operation.state === 'rejected') return operation;
    if (operation.state === 'accepted' && operation.run) {
      const run = await this._port.readRun(operation.plan, operation.run.id);
      const updated = this.acceptedOperation(operation, run);
      this._repository.save(updated);
      return updated;
    }
    const run = await this._port.reconcile(operation.plan, operation.startedAt, id);
    const updated: IDeliveryOperation = run
      ? this.acceptedOperation(operation, run)
      : { ...operation, state: 'uncertain' };
    this._repository.save(updated);
    return updated;
  }

  private acceptedOperation(operation: IDeliveryOperation, run: ICiRun): IDeliveryOperation {
    return {
      ...operation,
      state: 'accepted',
      run,
      message:
        run.revision === operation.plan.revision
          ? undefined
          : 'GitHub started a workflow at a different or unconfirmed revision. Inspect its Actions details before approving it. Delivery is confirmed only by the resulting destination evidence.',
    };
  }

  // #endregion
}
