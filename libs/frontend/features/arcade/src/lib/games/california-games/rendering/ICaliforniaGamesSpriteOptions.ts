/** Controls indexed sprite projection onto the California Games Lynx surface. @public */
export interface ICaliforniaGamesSpriteOptions {
  /** Palette index that remains transparent. @public */
  readonly transparentIndex?: number;
  /** Mirrors source columns before projection. @public */
  readonly flipX?: boolean;
  /** Mirrors source rows before projection. @public */
  readonly flipY?: boolean;
  /** Integer horizontal pixel scale. @public */
  readonly scaleX?: number;
  /** Integer vertical pixel scale. @public */
  readonly scaleY?: number;
  /** Horizontal row displacement used for Lynx-style tilt. @public */
  readonly shear?: number;
  /** Omits alternating pixels to approximate the original tube transparency. @public */
  readonly checkerTransparency?: boolean;
  /** Optional one-byte-per-pixel occupancy mask used by collision tests. @public */
  readonly collisionMask?: Uint8Array;
}
