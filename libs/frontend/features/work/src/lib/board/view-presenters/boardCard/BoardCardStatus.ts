/**
 * What the status chip of a board card reports, in the order the card resolves it: a person has
 * to act, another machine owns the item, an agent or a check is working, the delivered pull
 * request needs care, or the item simply rests in its stage.
 *
 * @public
 */
export type BoardCardStatus =
  | 'waiting-for-you'
  | 'failed'
  | 'elsewhere'
  | 'running'
  | 'queued'
  | 'checks-failed'
  | 'conflicting'
  | 'behind-base'
  | 'ready-to-review'
  | 'ready-for-agent'
  | 'done'
  | 'stage';
