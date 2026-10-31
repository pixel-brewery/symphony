/**
 * What the `New work item` sheet starts with when its caller already knows where the item goes,
 * for example the `+` of a board column.
 *
 * @public
 */
export interface INewWorkItemSheetOptions {
  /** Board column the item starts in; matched against the creation board's columns. */
  readonly columnId?: string;
  /**
   * Workflow stage of that column. A merged board shows one column per stage across boards, so
   * the stage finds the creation board's own column when the id belongs to another board.
   */
  readonly stageId?: string;
}
