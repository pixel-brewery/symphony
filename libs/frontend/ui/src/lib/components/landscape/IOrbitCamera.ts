/** Renderer-only camera state shared across views, without changing domain objects. @public */
export interface IOrbitCamera {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
}
