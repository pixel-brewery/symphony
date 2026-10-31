export interface ISegmentedAllocation {
  readonly totalBytes: number;
  readonly bySegment: ReadonlyMap<string, number>;
}
