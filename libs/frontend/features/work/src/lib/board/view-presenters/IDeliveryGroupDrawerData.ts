export interface IDeliveryGroupDrawerData {
  readonly deliveryGroupId?: string;
  readonly proposalId?: string;
  /** Individual card whose requested move opened the relationship review. */
  readonly requestedWorkItemId?: string;
  /** Provider column the operator originally dropped or moved the card into. */
  readonly requestedColumnId?: string;
  readonly requestedColumnLabel?: string;
}
