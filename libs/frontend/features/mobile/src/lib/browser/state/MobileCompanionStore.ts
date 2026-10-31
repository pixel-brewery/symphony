// #region Imports

import {
  computed,
  DestroyRef,
  Inject,
  inject,
  Injectable,
  signal,
  type Signal,
} from '@angular/core';
import type { IMobileCompanionClient } from '../clients/IMobileCompanionClient';
import { MOBILE_COMPANION_CLIENT } from '../clients/MobileCompanionClient';
import {
  mobileApiErrorSchema,
  mobileCommandResponseSchema,
  mobileEventSchema,
  mobileHttpRoutes,
  mobileIssueDraftCancelResponseSchema,
  mobileIssueDraftSchema,
  mobilePairingProposalSchema,
  mobilePairingStatusSchema,
  mobileSnapshotSchema,
  mobileWorkItemCreateResponseSchema,
  mobileWorkItemCreationContextSchema,
  type MobileCommandRequest,
  type MobileIssueDraft,
  type MobileIssueDraftRequest,
  type MobilePairingProposal,
  type MobileSnapshot,
  type MobileWorkItemCreateRequest,
  type MobileWorkItemCreationContext,
} from '@symphony/mobile-contracts';

// #endregion

type ConnectionState = 'connecting' | 'connected' | 'disconnected';
type PairingState = 'required' | 'requesting' | 'waiting' | 'approved' | 'rejected' | 'expired';

@Injectable({ providedIn: 'root' })
export class MobileCompanionStore {
  // #region Fields

  private readonly _client: IMobileCompanionClient;
  private readonly _snapshotState = signal<MobileSnapshot | undefined>(undefined);
  private readonly _pairingStateValue = signal<PairingState>('required');
  private readonly _pairingValue = signal<MobilePairingProposal | undefined>(undefined);
  private readonly _connectionStateValue = signal<ConnectionState>('connecting');
  private readonly _loadingState = signal(false);
  private readonly _workItemCreationContextState = signal<
    MobileWorkItemCreationContext | undefined
  >(undefined);
  private readonly _workItemCreationBusyState = signal(false);
  private readonly _issueDraftBusyState = signal(false);
  private readonly _errorState = signal<string | undefined>(undefined);
  private _disconnectEvents?: () => void;
  private _pairingTimer?: number;
  private _reconnectTimer?: number;
  private _challenge?: string;
  private _issueDraftOperationId?: string;
  private readonly _cancelledIssueDrafts = new Set<string>();
  private readonly _isPaired = computed(() => this._snapshotState() !== undefined);
  private _initialized = false;

  // #endregion

  // #region Ctor

  /**
   * Constructs the mobile companion state against a platform client.
   *
   * @public
   */
  public constructor(
    @Inject(MOBILE_COMPANION_CLIENT)
    client: IMobileCompanionClient = inject(MOBILE_COMPANION_CLIENT),
    @Inject(DestroyRef)
    destroyRef: DestroyRef = inject(DestroyRef),
  ) {
    this._client = client;
    destroyRef.onDestroy(() => this.dispose());
  }

  // #endregion

  // #region Properties

  /**
   * The current mobile snapshot.
   *
   * @public
   * @readonly
   */
  public get snapshot(): Signal<MobileSnapshot | undefined> {
    return this._snapshotState.asReadonly();
  }

  /**
   * The pairing state.
   *
   * @public
   * @readonly
   */
  public get pairingState(): Signal<PairingState> {
    return this._pairingStateValue.asReadonly();
  }

  /**
   * The pairing.
   *
   * @public
   * @readonly
   */
  public get pairing(): Signal<MobilePairingProposal | undefined> {
    return this._pairingValue.asReadonly();
  }

  /**
   * The connection state.
   *
   * @public
   * @readonly
   */
  public get connectionState(): Signal<ConnectionState> {
    return this._connectionStateValue.asReadonly();
  }

  /**
   * The loading.
   *
   * @public
   * @readonly
   */
  public get loading(): Signal<boolean> {
    return this._loadingState.asReadonly();
  }

  /**
   * The work item creation context.
   *
   * @public
   * @readonly
   */
  public get workItemCreationContext(): Signal<MobileWorkItemCreationContext | undefined> {
    return this._workItemCreationContextState.asReadonly();
  }

  /**
   * The work item creation busy.
   *
   * @public
   * @readonly
   */
  public get workItemCreationBusy(): Signal<boolean> {
    return this._workItemCreationBusyState.asReadonly();
  }

  /**
   * The issue draft busy.
   *
   * @public
   * @readonly
   */
  public get issueDraftBusy(): Signal<boolean> {
    return this._issueDraftBusyState.asReadonly();
  }

  /**
   * The error.
   *
   * @public
   * @readonly
   */
  public get error(): Signal<string | undefined> {
    return this._errorState.asReadonly();
  }

  /**
   * Whether it is paired.
   *
   * @public
   * @readonly
   */
  public get isPaired(): Signal<boolean> {
    return this._isPaired;
  }

  // #endregion

  // #region Methods

  /**
   * Initializes.
   *
   * @public
   */
  public async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    this._challenge = this._client.pairingChallenge();

    if (this._challenge) {
      await this.requestPairing(this._challenge);
      return;
    }
    await this.refreshSnapshot();
  }

  /**
   * Refreshes the snapshot.
   *
   * @public
   */
  public async refreshSnapshot(): Promise<void> {
    this._loadingState.set(true);
    try {
      const response = await this._client.request(mobileHttpRoutes.snapshot);
      if (response.status === 401) {
        this._snapshotState.set(undefined);
        this._pairingStateValue.set('required');
        this._connectionStateValue.set('disconnected');
        this._errorState.set(undefined);
        return;
      }
      const snapshot = mobileSnapshotSchema.parse(this.readResponse(response));
      this._snapshotState.set(snapshot);
      this._pairingStateValue.set('approved');
      this._connectionStateValue.set('connected');
      this._errorState.set(undefined);
      this.connectEvents();
    } catch (error) {
      this._connectionStateValue.set('disconnected');
      this._errorState.set(this.errorMessage(error));
    } finally {
      this._loadingState.set(false);
    }
  }

  /**
   * Runs the command.
   *
   * @param command - Command.
   * @public
   */
  public async runCommand(command: MobileCommandRequest): Promise<string | undefined> {
    this._loadingState.set(true);
    try {
      const response = await this._client.request(mobileHttpRoutes.command, 'POST', command);
      const result = mobileCommandResponseSchema.parse(this.readResponse(response));
      await this.refreshSnapshot();
      return result.executionId;
    } catch (error) {
      this._errorState.set(this.errorMessage(error));
      return undefined;
    } finally {
      this._loadingState.set(false);
    }
  }

  /**
   * Loads the work item creation context.
   *
   * @param repository - Repository.
   * @public
   */
  public async loadWorkItemCreationContext(repository?: string): Promise<boolean> {
    this._workItemCreationBusyState.set(true);
    try {
      const response = await this._client.request(
        mobileHttpRoutes.workItemCreationContext,
        'POST',
        repository ? { repository } : {},
      );
      this._workItemCreationContextState.set(
        mobileWorkItemCreationContextSchema.parse(this.readResponse(response)),
      );
      this._errorState.set(undefined);
      return true;
    } catch (error) {
      this._errorState.set(this.errorMessage(error));
      return false;
    } finally {
      this._workItemCreationBusyState.set(false);
    }
  }

  /**
   * Creates the work item.
   *
   * @param input - Input.
   * @public
   */
  public async createWorkItem(input: MobileWorkItemCreateRequest): Promise<string | undefined> {
    this._workItemCreationBusyState.set(true);
    try {
      const response = await this._client.request(mobileHttpRoutes.workItemCreate, 'POST', input);
      const result = mobileWorkItemCreateResponseSchema.parse(this.readResponse(response));
      await this.refreshSnapshot();
      return result.workItemId;
    } catch (error) {
      this._errorState.set(this.errorMessage(error));
      return undefined;
    } finally {
      this._workItemCreationBusyState.set(false);
    }
  }

  /**
   * Drafts the issue.
   *
   * @param input - Input.
   * @public
   */
  public async draftIssue(
    input: Omit<MobileIssueDraftRequest, 'operationId'>,
  ): Promise<MobileIssueDraft | undefined> {
    const operationId = this._client.createOperationId();
    this._issueDraftOperationId = operationId;
    this._issueDraftBusyState.set(true);
    try {
      const response = await this._client.request(mobileHttpRoutes.issueDraft, 'POST', {
        ...input,
        operationId,
      });
      return mobileIssueDraftSchema.parse(this.readResponse(response));
    } catch (error) {
      if (!this._cancelledIssueDrafts.has(operationId)) {
        this._errorState.set(this.errorMessage(error));
      }
      return undefined;
    } finally {
      if (this._issueDraftOperationId === operationId) {
        this._issueDraftOperationId = undefined;
        this._issueDraftBusyState.set(false);
      }
      this._cancelledIssueDrafts.delete(operationId);
    }
  }

  /**
   * Cancels the issue draft.
   *
   * @public
   */
  public async cancelIssueDraft(): Promise<boolean> {
    const operationId = this._issueDraftOperationId;
    if (!operationId) return false;
    this._cancelledIssueDrafts.add(operationId);
    try {
      const response = await this._client.request(mobileHttpRoutes.issueDraftCancel, 'POST', {
        operationId,
      });
      const result = mobileIssueDraftCancelResponseSchema.parse(this.readResponse(response));
      return result.cancelled;
    } catch (error) {
      this._cancelledIssueDrafts.delete(operationId);
      this._errorState.set(this.errorMessage(error));
      return false;
    }
  }

  /**
   * Retries.
   *
   * @public
   */
  public async retry(): Promise<void> {
    this._errorState.set(undefined);
    if (this._challenge && this._pairingValue()) {
      await this.pollPairing();
      return;
    }
    if (this._challenge) {
      await this.requestPairing(this._challenge);
      return;
    }
    await this.refreshSnapshot();
  }

  private async requestPairing(challenge: string): Promise<void> {
    this._pairingStateValue.set('requesting');
    this._loadingState.set(true);
    try {
      const response = await this._client.request(mobileHttpRoutes.pairingPropose, 'POST', {
        challenge,
        deviceName: this._client.deviceName(),
      });
      const pairing = mobilePairingProposalSchema.parse(this.readResponse(response));
      this._pairingValue.set(pairing);
      this._pairingStateValue.set('waiting');
      this._errorState.set(undefined);
      this.schedulePairingPoll();
    } catch (error) {
      this._pairingStateValue.set('required');
      this._errorState.set(this.errorMessage(error));
    } finally {
      this._loadingState.set(false);
    }
  }

  private schedulePairingPoll(): void {
    if (this._pairingTimer !== undefined) this._client.cancel(this._pairingTimer);
    this._pairingTimer = this._client.schedule(() => void this.pollPairing(), 1_000);
  }

  private async pollPairing(): Promise<void> {
    const pairing = this._pairingValue();
    if (!pairing || !this._challenge) return;
    try {
      const response = await this._client.request(mobileHttpRoutes.pairingStatus, 'POST', {
        pairingId: pairing.pairingId,
        challenge: this._challenge,
      });
      const status = mobilePairingStatusSchema.parse(this.readResponse(response));
      this._pairingStateValue.set(status.state === 'pending' ? 'waiting' : status.state);
      this._errorState.set(undefined);
      if (status.state === 'pending') {
        this.schedulePairingPoll();
      } else if (status.state === 'approved') {
        await this.refreshSnapshot();
        if (this._snapshotState()) this.clearPairingContext();
      } else {
        this.clearPairingContext();
      }
    } catch (error) {
      this._errorState.set(this.errorMessage(error));
      this.schedulePairingPoll();
    }
  }

  private connectEvents(): void {
    if (this._disconnectEvents) return;
    this._connectionStateValue.set('connecting');
    this._disconnectEvents = this._client.connectEvents(mobileHttpRoutes.events, {
      open: () => {
        this._connectionStateValue.set('connected');
        this._errorState.set(undefined);
      },
      message: (data) => {
        try {
          mobileEventSchema.parse(JSON.parse(String(data)));
          void this.refreshSnapshot();
        } catch {
          this._errorState.set('The desktop sent an unsupported update.');
        }
      },
      close: () => {
        this._disconnectEvents = undefined;
        this._connectionStateValue.set('disconnected');
        if (this._snapshotState()) this.scheduleReconnect();
      },
    });
  }

  private scheduleReconnect(): void {
    if (this._reconnectTimer !== undefined) this._client.cancel(this._reconnectTimer);
    this._reconnectTimer = this._client.schedule(() => this.connectEvents(), 2_000);
  }

  private clearPairingContext(): void {
    this._challenge = undefined;
    this._client.clearPairingChallenge();
  }

  private readResponse(response: {
    readonly ok: boolean;
    readonly status: number;
    readonly body: unknown;
  }): unknown {
    if (response.ok) return response.body;
    const apiError = mobileApiErrorSchema.safeParse(response.body);
    throw new Error(
      apiError.success ? apiError.data.message : `Request failed (${response.status}).`,
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Mobile access is temporarily unavailable.';
  }

  private dispose(): void {
    if (this._pairingTimer !== undefined) this._client.cancel(this._pairingTimer);
    if (this._reconnectTimer !== undefined) this._client.cancel(this._reconnectTimer);
    this._disconnectEvents?.();
  }

  // #endregion
}
