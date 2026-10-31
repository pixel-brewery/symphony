// #region Imports
import {
  requestSchemas,
  responseSchemas,
  type RequestMethod,
} from '@symphony/ipc-contracts-composition';
import { type IExecutableRequestHandler } from './IExecutableRequestHandler';
import { type IOrchestratorFeatureContribution } from './IOrchestratorFeatureContribution';
import { orchestratorMethods } from './OrchestratorMethods';
// #endregion

/**
 * Seals the fixed Utility Process feature catalog before accepting requests.
 *
 * @public
 */
export class OrchestratorRequestRegistry {
  // #region Fields
  private readonly _handlers = new Map<RequestMethod, IExecutableRequestHandler>();
  private readonly _registeredFeatures = new Set<string>();
  private readonly _omittedFeatures: ReadonlySet<string>;
  private readonly _catalog: Readonly<Record<string, readonly RequestMethod[]>>;
  private _sealed = false;
  // #endregion

  // #region Ctor
  /**
   * Declares the expected feature ownership and intentional product omissions.
   *
   * @public
   */
  public constructor(
    catalog: Readonly<Record<string, readonly RequestMethod[]>>,
    omittedFeatures: readonly string[] = [],
  ) {
    this._catalog = Object.freeze(
      Object.fromEntries(
        Object.entries(catalog).map(([id, methods]) => [id, Object.freeze([...methods])]),
      ),
    );
    this._omittedFeatures = new Set(omittedFeatures);
    const declared = new Set<RequestMethod>();
    for (const [id, methods] of Object.entries(this._catalog)) {
      for (const method of methods) {
        if (declared.has(method))
          throw new Error(`Duplicate orchestration method ownership: ${method}`);
        if (!Object.hasOwn(requestSchemas, method))
          throw new Error(`Unknown orchestration method: ${method}`);
        declared.add(method);
      }
      if (!id) throw new Error('An orchestration feature requires an identifier.');
    }
    for (const method of orchestratorMethods) {
      if (!declared.has(method))
        throw new Error(`Missing orchestration method ownership: ${method}`);
    }
    for (const id of this._omittedFeatures) {
      if (!Object.hasOwn(this._catalog, id))
        throw new Error(`Unknown omitted orchestration feature: ${id}`);
    }
  }
  // #endregion

  // #region Properties
  /**
   * Exposes the immutable wire catalog in its existing order.
   *
   * @public
   */
  public get methods(): readonly RequestMethod[] {
    return orchestratorMethods;
  }
  // #endregion

  // #region Methods
  /**
   * Registers one enabled feature without replacing another handler.
   *
   * @public
   */
  public register(feature: IOrchestratorFeatureContribution): void {
    if (this._sealed) throw new Error('The orchestration request registry is sealed.');
    const methods = this._catalog[feature.id];
    if (!methods) throw new Error(`Unknown orchestration feature: ${feature.id}`);
    if (this._omittedFeatures.has(feature.id))
      throw new Error(`The orchestration feature is omitted: ${feature.id}`);
    if (this._registeredFeatures.has(feature.id))
      throw new Error(`Duplicate orchestration feature: ${feature.id}`);
    const pending = new Map<RequestMethod, IExecutableRequestHandler>();
    for (const handler of feature.handlers) {
      if (!methods.includes(handler.method))
        throw new Error(`Foreign method in orchestration feature ${feature.id}: ${handler.method}`);
      if (this._handlers.has(handler.method) || pending.has(handler.method))
        throw new Error(`Duplicate orchestration handler: ${handler.method}`);
      if (
        handler.requestSchema !== requestSchemas[handler.method] ||
        handler.responseSchema !== responseSchemas[handler.method]
      ) {
        throw new Error(`Noncanonical orchestration schemas: ${handler.method}`);
      }
      pending.set(handler.method, handler);
    }
    for (const method of methods) {
      if (!pending.has(method))
        throw new Error(`Missing orchestration handler in ${feature.id}: ${method}`);
    }
    for (const [method, handler] of pending) this._handlers.set(method, handler);
    this._registeredFeatures.add(feature.id);
  }

  /**
   * Rejects accidental feature omissions before the process announces readiness.
   *
   * @public
   */
  public seal(): void {
    for (const id of Object.keys(this._catalog)) {
      if (!this._registeredFeatures.has(id) && !this._omittedFeatures.has(id)) {
        throw new Error(`Missing orchestration feature: ${id}`);
      }
    }
    this._sealed = true;
  }

  /**
   * Invokes the selected typed boundary after the registry has been sealed.
   *
   * @public
   */
  public execute(
    method: RequestMethod,
    payload: unknown,
    beforeDispatch: () => void,
  ): Promise<unknown> {
    if (!this._sealed)
      return Promise.reject(new Error('The orchestration request registry is not sealed.'));
    const handler = this._handlers.get(method);
    if (!handler)
      return Promise.reject(new Error(`The orchestration feature for "${method}" is unavailable.`));
    return handler.execute(payload, beforeDispatch);
  }
  // #endregion
}
