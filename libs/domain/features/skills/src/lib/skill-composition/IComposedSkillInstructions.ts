export interface IComposedSkillInstructions {
  readonly instructions: string;
  readonly version: string;
  readonly promptVersion: number;
  /** Hash of the customization, recorded per run so a changed prompt explains a changed result. */
  readonly customizationHash?: string;
}
