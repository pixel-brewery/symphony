/** One selectable card in the agent wizard (account, model, or effort). */
export interface IAiChoice {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}
