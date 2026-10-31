export interface ILocalCiHostCapacity {
  readonly logicalCpus: number;
  readonly memoryGiB: number;
  readonly availableStorageGiB: number;
  readonly storageLimitGiB: number;
}
