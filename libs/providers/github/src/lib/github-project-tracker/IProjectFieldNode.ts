export interface IProjectFieldNode {
  readonly __typename?: string;
  readonly id?: string;
  readonly name?: string;
  readonly dataType?: string;
  readonly options?: readonly {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string;
    readonly color?: string;
  }[];
  readonly configuration?: {
    readonly iterations?: readonly {
      readonly id?: string;
      readonly title?: string;
      readonly startDate?: string;
      readonly duration?: number;
    }[];
    readonly completedIterations?: readonly {
      readonly id?: string;
      readonly title?: string;
      readonly startDate?: string;
      readonly duration?: number;
    }[];
  };
}
