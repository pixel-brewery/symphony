// #region Imports

import type { ICiRun, IExternalWriteOperation } from '@symphony/domain-ci';
import type { IExternalWriteRepository } from './ports/IExternalWriteRepository';

// #endregion

/** Serializes provider mutations and keeps uncertain requests blocked across restart. */
export class ExternalWriteService {
  // #region Fields
  private readonly _active = new Set<string>();
  // #endregion
  // #region Ctor
  /** @public */
  public constructor(
    private readonly _repository: IExternalWriteRepository,
    private readonly _now: () => string,
  ) {}
  // #endregion
  // #region Methods
  /** Checks precede persistence; a lost mutation response never creates permission to resend. @public */
  public async execute(
    intent: Pick<IExternalWriteOperation, 'scope' | 'fingerprint' | 'kind'>,
    check: () => Promise<void>,
    perform: (operationId: string) => Promise<ICiRun | void>,
    readRun: (run: ICiRun) => Promise<ICiRun>,
    reconcile?: (operation: IExternalWriteOperation) => Promise<ICiRun | true | undefined>,
  ): Promise<ICiRun | void> {
    if (this._active.has(intent.scope))
      throw new Error('This operation is already being submitted.');
    this._active.add(intent.scope);
    try {
      for (let previous of this._repository
        .list()
        .filter((record) => record.scope === intent.scope)) {
        if (previous.state !== 'accepted' && reconcile) {
          const proof = await reconcile(previous);
          if (proof) {
            previous = {
              ...previous,
              state: 'accepted',
              ...(proof === true ? {} : { run: proof }),
            };
            this._repository.save(previous);
          }
        }
        if (previous.state !== 'accepted')
          throw new Error(
            'A previous response is unclear. Inspect the provider run before attempting another operation.',
          );
        if (intent.kind === 'approval' && previous.fingerprint === intent.fingerprint) return;
        if (previous.run) {
          const run = await readRun(previous.run);
          this._repository.save({ ...previous, run });
          if (run.status === 'queued' || run.status === 'in-progress') {
            if (previous.fingerprint === intent.fingerprint) return run;
            throw new Error(
              'This workflow already has an active manual run. Open its Actions details.',
            );
          }
        }
      }
      await check();
      const operation: IExternalWriteOperation = {
        ...intent,
        id: crypto.randomUUID(),
        state: 'submitting',
        startedAt: this._now(),
      };
      this._repository.save(operation);
      try {
        const run = await perform(operation.id);
        this._repository.save({ ...operation, state: 'accepted', ...(run ? { run } : {}) });
        return run;
      } catch {
        this._repository.save({ ...operation, state: 'uncertain' });
        throw new Error(
          'The provider response is unclear. Inspect Actions; this request will not be resent automatically.',
        );
      }
    } finally {
      this._active.delete(intent.scope);
    }
  }
  // #endregion
}
