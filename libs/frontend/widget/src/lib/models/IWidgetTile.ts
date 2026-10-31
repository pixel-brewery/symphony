export interface IWidgetTile {
  readonly id: string;
  readonly testId: string;
  readonly label: string;
  readonly count: number;
  /** Route the tile opens, narrowed to exactly the set the tile counts. */
  readonly route: string;
  readonly queryParams: Readonly<Record<string, string>>;
  readonly ariaLabel: string;
  /** Whether live work sits behind the tile, which is what makes it animate. */
  readonly live: boolean;
  /** Names the live work; absent when the tile's own count already is that work. */
  readonly liveLabel?: string;
  /** Whether the tile reports work a person has to pick up, which carries the alarm icon. */
  readonly attention: boolean;
}
