/**
 * One line the analysis or assessment left for the person deciding.
 *
 * @public
 */
export interface IInboxFinding {
  /** `info` restates what was found; `open` names a question the analysis left open. @public @readonly */
  readonly tone: 'info' | 'open';
  /** The finding, verbatim from the analysis or assessment. @public @readonly */
  readonly text: string;
}
