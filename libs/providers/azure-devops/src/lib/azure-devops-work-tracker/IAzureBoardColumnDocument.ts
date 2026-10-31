export interface IAzureBoardColumnDocument {
  readonly id?: string;
  readonly name?: string;
  readonly columnType?: 'incoming' | 'inProgress' | 'outgoing' | string;
  /** Work-item type → state name that puts an item into this column. */
  readonly stateMappings?: Readonly<Record<string, string>>;
}
