export interface IProjectFieldValueNode {
  readonly __typename?: string;
  readonly field?: { readonly id?: string };
  readonly text?: string;
  readonly number?: number;
  readonly date?: string;
  readonly optionId?: string;
  readonly iterationId?: string;
  readonly options?: readonly { readonly id?: string }[];
}
