/**
 * What an Inbox entry asks for or reports.
 *
 * Decisions: `solution` (an analysed item waits for an agent or your own implementation),
 * `acceptance` (delivered work waits at a human gate), `delivery-group` (an Analyzer proposal to
 * deliver items together), `failing-workflow` (the latest finished run of a workflow failed).
 * Updates: `execution` (an agent started, finished or failed a step) and `merged-pull-request`.
 *
 * @public
 */
export type InboxEntryKind =
  | 'solution'
  | 'acceptance'
  | 'delivery-group'
  | 'failing-workflow'
  | 'execution'
  | 'merged-pull-request';
