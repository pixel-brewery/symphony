// #region Imports

import type { IExecutionEvent } from '@symphony/domain-execution';
import type { IExecutionEvents } from './IExecutionEvents';
import type { IExecutionEventsDependencies } from './IExecutionEventsDependencies';

// #endregion

/** Persists and publishes ordered execution events. @public */
export class ExecutionEventService implements IExecutionEvents {
  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionEventsDependencies) {}

  // #endregion

  // #region Methods

  /** Persists an ordered execution event before notifying its consumers. @public */
  public async record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'> = {
      origin: 'orchestrator',
      category: 'status',
    },
  ): Promise<void> {
    const event: IExecutionEvent = {
      id: this._dependencies.ids.next('event'),
      executionId,
      kind,
      message,
      ...stream,
      occurredAt: this._dependencies.clock.now(),
      sequence: this._dependencies.repository.listEvents().length + 1,
    };
    this._dependencies.repository.saveEvent(event);
    this._dependencies.publish(event);
  }

  // #endregion
}
