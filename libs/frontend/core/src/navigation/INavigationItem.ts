/**
 * Describes a feature-owned destination contributed to one navigation region.
 *
 * @public
 */
export interface INavigationItem {
  /** Stable destination identifier. @public @readonly */
  readonly key: string;
  /** User-facing destination label. @public @readonly */
  readonly label: string;
  /** Registered application icon name. @public @readonly */
  readonly icon: string;
  /** Existing application route opened by the destination. @public @readonly */
  readonly route: string;
  /** Position within the owning region. @public @readonly */
  readonly order: number;
  /** Navigation surface that renders the destination. @public @readonly */
  readonly region: string;

  /**
   * Optional heading of the sidebar group the destination belongs to, such as `Delivery`. Groups
   * appear in the order of their first destination; destinations without a group lead the list.
   *
   * @public
   * @readonly
   */
  readonly group?: string;

  /**
   * Optional reactive count shown at the trailing end of the sidebar row. `undefined` hides the
   * count, so a destination whose data is loading or unavailable never shows a misleading zero.
   *
   * @public
   * @readonly
   */
  readonly count?: () => number | undefined;

  /**
   * Whether the count asks for attention (a danger badge) or is a quiet number.
   *
   * @public
   * @readonly
   */
  readonly countTone?: 'attention' | 'quiet';

  /**
   * Optional reactive visibility condition, such as the saved Arcade preference.
   *
   * @public
   * @readonly
   */
  readonly isVisible?: () => boolean;
}
