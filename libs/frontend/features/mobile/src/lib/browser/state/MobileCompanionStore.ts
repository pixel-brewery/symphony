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
import type { IMobileCompanionClient } from '../clients/interfaces/IMobileCompanionClient';
import { MOBILE_COMPANION_CLIENT } from '../clients/MOBILE_COMPANION_CLIENT';
import {
  mobileApiErrorSchema,
  mobileCommandResponseSchema,
  mobileEventSchema,
  mobileHttpRoutes,
  mobileIssueDraftCancelResponseSchema,
  mobileIssueDraftSchema,
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
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

type ConnectionState = 'connecting' | 'connected' | 'disconnected';
type PairingState = 'required' | 'requesting' | 'waiting' | 'approved' | 'rejected' | 'expired';

/**
 * Owns mobile product projections and commands while the SDK client owns trust and transport recovery.
 *
 * @remarks Pairing evidence comes from the verified session. A failed product read never revokes a valid grant, and a revoked generation cannot repopulate projections.
 * @public
 */
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
  private _issueDraftOperationId?: string;
  private readonly _cancelledIssueDrafts = new Set<string>();
  private readonly _isPaired = computed(() => this._pairingStateValue() === 'approved');
  private _initialized = false;
  private _initializing = false;
  private _disposed = false;
  private _generation = 0;
  private readonly _unsubscribeConnection: () => void;

  // #endregion

  // #region Ctor

  /**
   * Constructs the mobile companion state against a platform client.
   *
   * @param client - Session-backed product requests and bounded event delivery.
   * @param destroyRef - Angular owner that closes the session and event subscriptions.
   * @public
   */
  public constructor(
    @Inject(MOBILE_COMPANION_CLIENT)
    client: IMobileCompanionClient = inject(MOBILE_COMPANION_CLIENT),
    @Inject(DestroyRef)
    destroyRef: DestroyRef = inject(DestroyRef),
  ) {
    this._client = client;
    this._unsubscribeConnection = client.subscribeConnection((state) => {
      if (this._disposed) return;
      this._connectionStateValue.set(
        state === 'ready' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected',
      );
      if (state === 'required') {
        this.clearAuthorization();
      }
      if (state === 'ready') {
        this._pairingStateValue.set('approved');
        if (this._initialized && !this._initializing) void this.refreshSnapshot();
      }
    });
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
   * Restores SDK pairing evidence once and loads the initial product snapshot.
   *
   * @returns Resolves after initial recovery has updated the observable state.
   * @public
   */
  public async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    await this.restoreSession();
  }

  /**
   * Reconciles the current product snapshot without treating it as authorization evidence.
   *
   * @returns Resolves after assignment or a visible read failure; obsolete generations are discarded.
   * @public
   */
  public async refreshSnapshot(): Promise<void> {
    this._loadingState.set(true);
    const generation = this._generation;
    try {
      const response = await this._client.request(mobileHttpRoutes.snapshot);
      if (this._disposed || generation !== this._generation) return;
      if (response.status === 401) {
        this.clearAuthorization();
        this._errorState.set(undefined);
        return;
      }
      const snapshot = mobileSnapshotSchema.parse(this.readResponse(response));
      this._snapshotState.set(snapshot);
      this._connectionStateValue.set('connected');
      this._errorState.set(undefined);
      this.connectEvents();
    } catch (error) {
      if (this._disposed || generation !== this._generation) return;
      this._connectionStateValue.set('disconnected');
      this._errorState.set(this.errorMessage(error));
    } finally {
      this._loadingState.set(false);
    }
  }

  /**
   * Dispatches a current product command once and then reconciles reads.
   *
   * @param command - Typed action whose current validity is rechecked by the host.
   * @returns Started execution identifier when admitted and still in the current session generation.
   * @public
   */
  public async runCommand(command: MobileCommandRequest): Promise<string | undefined> {
    const generation = this._generation;
    this._loadingState.set(true);
    try {
      const response = await this._client.request(mobileHttpRoutes.command, 'POST', command);
      const result = mobileCommandResponseSchema.parse(this.readResponse(response));
      if (this._disposed || generation !== this._generation) return undefined;
      await this.refreshSnapshot();
      return result.executionId;
    } catch (error) {
      if (!this._disposed && generation === this._generation)
        this._errorState.set(this.errorMessage(error));
      return undefined;
    } finally {
      this._loadingState.set(false);
    }
  }

  /**
   * Loads the current creation metadata for the selected workspace and optional repository.
   *
   * @param repository - Repository selected from current host-owned metadata.
   * @returns True only after validated metadata is assigned to the current authorized generation.
   * @public
   */
  public async loadWorkItemCreationContext(repository?: string): Promise<boolean> {
    const generation = this._generation;
    this._workItemCreationBusyState.set(true);
    try {
      const response = await this._client.request(
        mobileHttpRoutes.workItemCreationContext,
        'POST',
        repository ? { repository } : {},
      );
      if (this._disposed || generation !== this._generation) return false;
      this._workItemCreationContextState.set(
        mobileWorkItemCreationContextSchema.parse(this.readResponse(response)),
      );
      this._errorState.set(undefined);
      return true;
    } catch (error) {
      if (!this._disposed && generation === this._generation)
        this._errorState.set(this.errorMessage(error));
      return false;
    } finally {
      this._workItemCreationBusyState.set(false);
    }
  }

  /**
   * Creates one work item through the existing host domain admission and storage checks.
   *
   * @param input - Product fields selected from the current validated creation metadata.
   * @returns Created identifier when the response belongs to the current session generation.
   * @public
   */
  public async createWorkItem(input: MobileWorkItemCreateRequest): Promise<string | undefined> {
    const generation = this._generation;
    this._workItemCreationBusyState.set(true);
    try {
      const response = await this._client.request(mobileHttpRoutes.workItemCreate, 'POST', input);
      const result = mobileWorkItemCreateResponseSchema.parse(this.readResponse(response));
      if (this._disposed || generation !== this._generation) return undefined;
      await this.refreshSnapshot();
      return result.workItemId;
    } catch (error) {
      if (!this._disposed && generation === this._generation)
        this._errorState.set(this.errorMessage(error));
      return undefined;
    } finally {
      this._workItemCreationBusyState.set(false);
    }
  }

  /**
   * Runs one identified host drafting operation without retrying it after a lost response.
   *
   * @param input - Current workspace, repository and drafting instructions.
   * @returns Validated draft while the same authorized generation still owns the operation.
   * @public
   */
  public async draftIssue(
    input: Omit<MobileIssueDraftRequest, 'operationId'>,
  ): Promise<MobileIssueDraft | undefined> {
    const generation = this._generation;
    const operationId = this._client.createOperationId();
    this._issueDraftOperationId = operationId;
    this._issueDraftBusyState.set(true);
    try {
      const response = await this._client.request(mobileHttpRoutes.issueDraft, 'POST', {
        ...input,
        operationId,
      });
      if (this._disposed || generation !== this._generation) return undefined;
      return mobileIssueDraftSchema.parse(this.readResponse(response));
    } catch (error) {
      if (
        !this._disposed &&
        generation === this._generation &&
        !this._cancelledIssueDrafts.has(operationId)
      ) {
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
   * Requests cancellation of the currently identified host draft.
   *
   * @returns Whether the host found and cancelled that operation.
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
   * Restores the SDK session, current product reads and a fresh bounded event owner after explicit recovery.
   *
   * @remarks Disposes the preceding event owner even when its automatic retry budget is exhausted.
   * Automatic event retries remain owned and bounded by the SDK; preceding mutations are never replayed.
   * @returns Resolves after recovery state is visible; no preceding mutation is replayed.
   * @public
   */
  public async retry(): Promise<void> {
    if (this._disposed) return;
    this._disconnectEvents?.();
    this._disconnectEvents = undefined;
    this._errorState.set(undefined);
    await this.restoreSession();
  }

  private clearAuthorization(): void {
    this._generation++;
    this._snapshotState.set(undefined);
    this._workItemCreationContextState.set(undefined);
    this._pairingStateValue.set('required');
    this._connectionStateValue.set('disconnected');
    this._disconnectEvents?.();
    this._disconnectEvents = undefined;
  }

  private async restoreSession(): Promise<void> {
    this._initializing = true;
    this._loadingState.set(true);
    this._pairingStateValue.set('requesting');
    try {
      if (await this._client.initialize()) {
        this._pairingStateValue.set('approved');
        await this.refreshSnapshot();
      } else this._pairingStateValue.set('required');
    } catch (cause) {
      this._errorState.set(this.errorMessage(cause));
      this._pairingStateValue.set('required');
    } finally {
      this._initializing = false;
      this._loadingState.set(false);
    }
  }

  private connectEvents(): void {
    if (this._disconnectEvents) return;
    this._connectionStateValue.set('connecting');
    this._disconnectEvents = this._client.connectEvents(mobileHttpRoutes.events, {
      open: () => {
        this._connectionStateValue.set('connected');
        this._errorState.set(undefined);
        if (!this._disposed) void this.refreshSnapshot();
      },
      message: (data) => {
        try {
          mobileEventSchema.parse(JSON.parse(String(data)));
          void this.refreshSnapshot();
        } catch {
          this._errorState.set(
            translateLabel('loc.symphony.labels.the.desktop.sent.an.unsupported.update.8e9c671'),
          );
        }
      },
      close: () => {
        this._connectionStateValue.set('disconnected');
        if (this._snapshotState()) void this.refreshSnapshot();
      },
    });
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
    return error instanceof Error
      ? error.message
      : translateLabel('loc.symphony.labels.mobile.access.is.temporarily.unavailable.f5a4ef2');
  }

  private dispose(): void {
    this._disposed = true;
    this._generation++;
    this._unsubscribeConnection();
    this._disconnectEvents?.();
    void this._client.dispose();
  }

  // #endregion
}
