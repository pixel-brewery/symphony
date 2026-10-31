// #region Imports

import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { workspaceStorageDirectoryName } from '@symphony/persistence-core';
import { availableParallelism, totalmem } from 'node:os';
import {
  type IResolvedLocalCiResourcePreset,
  type LocalCiResourcePresetName,
  localCiResourcePresetNames,
  localCiResourcePresets,
  resolveLocalCiResourcePreset,
} from '@symphony/domain-ci';
import { ASYNC_WALK_YIELD_EVERY } from './AsyncWalkYieldEvery';
import { BYTES_PER_GIBIBYTE } from './BytesPerGibibyte';
import type { ISegmentDefinition } from './ISegmentDefinition';
import type { ISegmentedAllocation } from './ISegmentedAllocation';
import type { IStorageGovernorOptions } from './IStorageGovernorOptions';
import type { IStorageStatus } from './IStorageStatus';
import type { IStorageUsage } from './IStorageUsage';
import type { IUsageGroup } from './IUsageGroup';
import type { StoragePressure } from './StoragePressure';
import { WalkBudgetExceeded } from './WalkBudgetExceeded';
import { availableFilesystemBytes } from './availableFilesystemBytes';
import { bucketKey } from './bucketKey';
import { compactRoots } from './compactRoots';
import { formatGiB } from './formatGiB';
import { groupTotal } from './GroupTotal';
import { instancesSegmentDescription } from './InstancesSegmentDescription';
import { maximumPressure } from './maximumPressure';
import { quotaPressure } from './quotaPressure';
import { segments } from './segments';
import { walkAllocatedBytes } from './WalkAllocatedBytes';

// #endregion

export class StorageGovernor {
  // #region Fields

  private _allocation: ISegmentedAllocation | undefined;
  private _measuredAtMs = 0;
  private _measurement: Promise<void> | undefined;
  private _measurementError: string | undefined;
  private _inlineMeasurementViable = true;
  private readonly _allocationCachePath: string;

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IStorageGovernorOptions) {
    this._allocationCachePath = resolve(
      this._options.configurationRoot,
      STORAGE_ALLOCATION_CACHE_NAME,
    );
    const cachedAllocation = readCachedAllocation(this._allocationCachePath);
    if (cachedAllocation) {
      this._allocation = cachedAllocation;
      this._measuredAtMs = Date.now();
      this._inlineMeasurementViable = false;
    }
  }

  // #endregion

  // #region Methods

  /**
   * Reports.
   *
   * @public
   */
  public report(): IStorageStatus {
    const settings = this._options.settings();
    const reserveBytes = gibibytes(settings.runtime.minimumFreeDiskGiB);
    const logicalCpus = (this._options.availableParallelism ?? availableParallelism)();
    const totalMemoryBytes = (this._options.totalMemoryBytes ?? totalmem)();
    try {
      const globalPaths = compactRoots([
        this._options.configurationRoot,
        settings.runtime.workspaceRoot,
        this._options.browserDataRoot,
      ]);
      const availableBytes = (this._options.availableFilesystemBytes ?? availableFilesystemBytes)(
        settings.runtime.workspaceRoot,
      );
      const filesystemPressure = freeSpacePressure(availableBytes, reserveBytes);
      const localCiRoot = resolve(settings.runtime.workspaceRoot, 'local-ci');
      const workspaceRootsById = new Map(
        settings.workspaces.map((workspace) => [
          workspace.id,
          compactRoots([
            resolve(
              this._options.configurationRoot,
              'workspaces',
              workspaceStorageDirectoryName(workspace.id),
            ),
            resolve(settings.runtime.workspaceRoot, workspaceStorageDirectoryName(workspace.id)),
          ]),
        ]),
      );
      const groups: readonly IUsageGroup[] = [
        {
          id: 'global',
          label: 'Application storage',
          paths: globalPaths,
          limitBytes: gibibytes(settings.runtime.managedStorageLimitGiB),
          minimumPressure: filesystemPressure,
          spansEverything: true,
          segments: globalSegments(
            settings.workspaces.map((workspace) => `workspace:${workspace.id}`),
            this._options.browserDataRoot,
          ),
        },
        {
          id: 'local-ci',
          label: 'Local GitHub Actions',
          paths: [localCiRoot],
          limitBytes: gibibytes(settings.localCi.storageLimitGiB),
          segments: localCiSegments(localCiRoot),
        },
        ...settings.workspaces.map((workspace): IUsageGroup => {
          const roots = workspaceRootsById.get(workspace.id) ?? [];
          return {
            id: `workspace:${workspace.id}`,
            label: workspace.displayName,
            paths: roots,
            limitBytes: gibibytes(workspace.storageLimitGiB),
            workspaceId: workspace.id,
            segments: workspaceSegments(roots),
          };
        }),
      ];
      const { allocation, measured } = this.resolveAllocations(groups);
      const [global, localCi, ...workspaces] = groups.map((group) =>
        usage(group, groups, allocation),
      ) as [IStorageUsage, IStorageUsage, ...IStorageUsage[]];
      const availableStorageBytes = Math.max(0, availableBytes - reserveBytes);
      const capacity = {
        logicalCpus,
        memoryGiB: Math.floor(totalMemoryBytes / BYTES_PER_GIBIBYTE),
        availableStorageGiB: Math.floor(availableStorageBytes / BYTES_PER_GIBIBYTE),
        storageLimitGiB: settings.localCi.storageLimitGiB,
      };
      const customResources =
        settings.localCi.customResources ??
        resolveLocalCiResourcePreset(
          settings.localCi.resourcePreset === 'custom'
            ? 'compact'
            : settings.localCi.resourcePreset,
          capacity,
        ).resources;
      const presets = Object.fromEntries(
        localCiResourcePresetNames.map((preset) => [
          preset,
          resolveLocalCiResourcePreset(preset, capacity, customResources),
        ]),
      ) as Record<LocalCiResourcePresetName, IResolvedLocalCiResourcePreset>;
      const writable =
        global.pressure !== 'critical' &&
        filesystemPressure !== 'critical' &&
        workspaces.every((workspace) => workspace.pressure !== 'critical') &&
        localCi.pressure !== 'critical';
      return {
        measuredAt: new Date().toISOString(),
        measured,
        writable,
        global,
        localCi,
        localCiCapacity: {
          logicalCpus,
          totalMemoryBytes,
          availableStorageBytes,
          presets,
        },
        workspaces,
        filesystem: { availableBytes, reserveBytes, pressure: filesystemPressure },
      };
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : 'Storage measurement failed.';
      const unavailable = unavailableUsage('global', 'Application storage');
      return {
        measuredAt: new Date().toISOString(),
        measured: false,
        writable: false,
        global: unavailable,
        localCi: unavailableUsage('local-ci', 'Local GitHub Actions'),
        localCiCapacity: {
          logicalCpus,
          totalMemoryBytes,
          availableStorageBytes: 0,
          presets: Object.fromEntries(
            localCiResourcePresetNames.map((preset) => [
              preset,
              resolveLocalCiResourcePreset(
                preset,
                {
                  logicalCpus,
                  memoryGiB: Math.floor(totalMemoryBytes / BYTES_PER_GIBIBYTE),
                  availableStorageGiB: 0,
                  storageLimitGiB: settings.localCi.storageLimitGiB,
                },
                settings.localCi.customResources ?? localCiResourcePresets.custom,
              ),
            ]),
          ) as Record<LocalCiResourcePresetName, IResolvedLocalCiResourcePreset>,
        },
        workspaces: settings.workspaces.map((workspace) =>
          unavailableUsage(`workspace:${workspace.id}`, workspace.displayName, workspace.id),
        ),
        filesystem: { availableBytes: 0, reserveBytes, pressure: 'critical' },
        error,
      };
    }
  }

  /**
   * Returns the assert writable.
   *
   * @param options - Options.
   * @public
   */
  public assertWritable(
    options: {
      readonly workspaceId?: string;
      readonly localCi?: boolean;
      readonly requiredBytes?: number;
      readonly workload?: 'analysis' | 'implementation' | 'local-ci';
    } = {},
  ): IStorageStatus {
    const status = this.report();
    if (status.error) {
      throw new Error(`Storage measurement failed; new disk writes are blocked. ${status.error}`);
    }
    const requirements = capacityRequirements(
      status,
      this._options.settings().localCi.resourcePreset,
      options.workload ?? (options.localCi ? 'local-ci' : undefined),
      options.requiredBytes,
    );
    assertUsage(status.global, requirements.globalBytes);
    if (
      status.filesystem.availableBytes - requirements.globalBytes <
      status.filesystem.reserveBytes
    ) {
      throw new Error(
        `Storage safety stop: the Mac must keep at least ${formatGiB(status.filesystem.reserveBytes)} free.`,
      );
    }
    // A detailed segment inventory may take minutes in managed worktrees containing hundreds of
    // thousands of dependency files. Admission must not wait for it: the filesystem check above
    // is live, and requirements reserve the workload's complete bounded growth before any write.
    // Quota checks below use the last completed allocation when one exists and the configured
    // capacity boundary on a first launch. The completed inventory is persisted for later starts.
    if (requirements.localCiBytes) assertUsage(status.localCi, requirements.localCiBytes);
    if (options.workspaceId) {
      const workspace = status.workspaces.find(
        (candidate) => candidate.workspaceId === options.workspaceId,
      );
      if (!workspace) throw new Error(`Unknown workspace: ${options.workspaceId}`);
      assertUsage(workspace, requirements.workspaceBytes);
    } else {
      const blockedWorkspace = status.workspaces.find(
        (workspace) =>
          workspace.allocatedBytes + requirements.workspaceBytes > workspace.limitBytes,
      );
      if (blockedWorkspace) assertUsage(blockedWorkspace, requirements.workspaceBytes);
    }
    return status;
  }

  /**
   * Drops the cached measurement so the next report reflects a deletion that just happened.
   * Without this a freed instance disk stays counted for the rest of the measurement window,
   * and an operator who just removed a machine still sees the blocked-writes alarm.
   *
   * @public
   */
  public invalidate(): void {
    this._allocation = undefined;
    this._measuredAtMs = 0;
  }

  /**
   * Latest allocation per usage group. Small trees are measured inline so a report always
   * carries exact numbers where that is affordable; a tree past the entry budget is measured
   * in a background pass and reports serve the last completed measurement. Until the first
   * background pass completes, unmeasured groups read as empty - the filesystem reserve check
   * stays live either way, so disk-full protection never depends on this cache.
   */
  private resolveAllocations(groups: readonly IUsageGroup[]): {
    readonly allocation: ISegmentedAllocation;
    readonly measured: boolean;
  } {
    if (this._measurementError) {
      const message = this._measurementError;
      this._measurementError = undefined;
      this.scheduleMeasurement(groups);
      throw new Error(message);
    }
    if (this._allocation && Date.now() - this._measuredAtMs <= MEASUREMENT_TTL_MS) {
      return { allocation: this._allocation, measured: true };
    }
    if (this._inlineMeasurementViable) {
      try {
        const measured = allocatedDirectoryBytesWithin(
          measurementRoots(groups),
          bucketAttribution(groups),
          { remaining: SYNC_WALK_ENTRY_BUDGET },
        );
        this._allocation = measured;
        this._measuredAtMs = Date.now();
        this.persistAllocation(measured);
        return { allocation: measured, measured: true };
      } catch (cause) {
        if (!(cause instanceof WalkBudgetExceeded)) throw cause;
        this._inlineMeasurementViable = false;
      }
    }
    this.scheduleMeasurement(groups);
    return this._allocation
      ? { allocation: this._allocation, measured: true }
      : { allocation: emptyAllocation, measured: false };
  }

  private scheduleMeasurement(groups: readonly IUsageGroup[]): void {
    if (this._measurement) return;
    this._measurement = (async () => {
      const measured = await allocatedDirectoryBytesCooperatively(
        measurementRoots(groups),
        bucketAttribution(groups),
      );
      this._allocation = measured;
      this._measuredAtMs = Date.now();
      this.persistAllocation(measured);
    })()
      .catch((cause: unknown) => {
        this._measurementError =
          cause instanceof Error ? cause.message : 'Storage measurement failed.';
      })
      .finally(() => {
        this._measurement = undefined;
      });
  }

  private persistAllocation(allocation: ISegmentedAllocation): void {
    if (!existsSync(this._options.configurationRoot)) return;
    const temporaryPath = `${this._allocationCachePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      writeFileSync(
        temporaryPath,
        JSON.stringify({
          version: STORAGE_ALLOCATION_CACHE_VERSION,
          totalBytes: allocation.totalBytes,
          bySegment: [...allocation.bySegment],
        } satisfies IStoredAllocation),
        { encoding: 'utf8', mode: 0o600 },
      );
      renameSync(temporaryPath, this._allocationCachePath);
      chmodSync(this._allocationCachePath, 0o600);
    } catch {
      // The cache accelerates future admission but never owns the authoritative live reserve.
      rmSync(temporaryPath, { force: true });
    }
  }

  // #endregion
}

const WRITE_HEADROOM_BYTES = 512 * 1024 * 1024;

// Analysis must leave enough room for the implementation that follows it. The reserve is not
// an estimate of one particular repository; it is a conservative admission boundary for a
// second managed worktree, dependency changes, and host-side verification evidence.
const IMPLEMENTATION_RESERVE_BYTES = 8 * BYTES_PER_GIBIBYTE;

interface ICapacityRequirements {
  readonly globalBytes: number;
  readonly workspaceBytes: number;
  readonly localCiBytes: number;
}

function capacityRequirements(
  status: IStorageStatus,
  resourcePreset: LocalCiResourcePresetName,
  workload: 'analysis' | 'implementation' | 'local-ci' | undefined,
  requestedBytes = 0,
): ICapacityRequirements {
  const requested = Math.max(WRITE_HEADROOM_BYTES, requestedBytes);
  if (!workload) {
    return { globalBytes: requested, workspaceBytes: requested, localCiBytes: 0 };
  }
  const resources = status.localCiCapacity.presets[resourcePreset].resources;
  const plannedLocalCiBytes =
    (resources.diskGiB + resources.cacheGiB + LOCAL_CI_OVERHEAD_GIB) * BYTES_PER_GIBIBYTE;
  const localCiGrowthBytes = Math.max(
    WRITE_HEADROOM_BYTES,
    plannedLocalCiBytes - status.localCi.allocatedBytes,
  );
  if (workload === 'local-ci') {
    return {
      globalBytes: Math.max(requested, localCiGrowthBytes),
      workspaceBytes: requested,
      localCiBytes: Math.max(requested, localCiGrowthBytes),
    };
  }
  const workspaceBytes = Math.max(requested, IMPLEMENTATION_RESERVE_BYTES);
  return {
    globalBytes: workspaceBytes + localCiGrowthBytes,
    workspaceBytes,
    localCiBytes: localCiGrowthBytes,
  };
}

const LOCAL_CI_OVERHEAD_GIB = 2;

// A managed tree can hold hundreds of thousands of inodes (toolchain caches, execution
// worktrees with node_modules), and walking one synchronously blocks the orchestrator's
// message loop for seconds - starving IPC, gh subprocess pipes, and quit handling. A small
// installation is still measured inline (tests and fresh setups see exact numbers
// immediately); once a walk exceeds the entry budget, measurement moves to a cooperative
// background pass and reports serve the last completed measurement for the TTL.
const MEASUREMENT_TTL_MS = 60_000;

const SYNC_WALK_ENTRY_BUDGET = 10_000;

const STORAGE_ALLOCATION_CACHE_NAME = 'storage-allocation-v1.json';

const STORAGE_ALLOCATION_CACHE_VERSION = 1;

interface IStoredAllocation {
  readonly version: number;
  readonly totalBytes: number;
  readonly bySegment: readonly (readonly [string, number])[];
}

const emptyAllocation: ISegmentedAllocation = { totalBytes: 0, bySegment: new Map() };

function readCachedAllocation(path: string): ISegmentedAllocation | undefined {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<IStoredAllocation>;
    if (
      parsed.version !== STORAGE_ALLOCATION_CACHE_VERSION ||
      !isAllocatedByteCount(parsed.totalBytes) ||
      !Array.isArray(parsed.bySegment)
    ) {
      return undefined;
    }
    const entries: [string, number][] = [];
    for (const entry of parsed.bySegment) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[0] !== 'string' ||
        !isAllocatedByteCount(entry[1])
      ) {
        return undefined;
      }
      entries.push([entry[0], entry[1]]);
    }
    return { totalBytes: parsed.totalBytes, bySegment: new Map(entries) };
  } catch {
    return undefined;
  }
}

function isAllocatedByteCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Every root any group cares about, collapsed so no subtree is walked twice. */
function measurementRoots(groups: readonly IUsageGroup[]): readonly string[] {
  return compactRoots(groups.flatMap((group) => group.paths));
}

function allocatedDirectoryBytesWithin(
  paths: readonly string[],
  attribution: ReadonlyMap<string, string>,
  budget: { remaining: number },
): ISegmentedAllocation {
  const walk = walkAllocatedBytes(paths, attribution);
  for (;;) {
    const step = walk.next();
    if (step.done) return step.value;
    if (--budget.remaining <= 0) throw new WalkBudgetExceeded();
  }
}

async function allocatedDirectoryBytesCooperatively(
  paths: readonly string[],
  attribution: ReadonlyMap<string, string>,
): Promise<ISegmentedAllocation> {
  const walk = walkAllocatedBytes(paths, attribution);
  let sinceYield = 0;
  for (;;) {
    const step = walk.next();
    if (step.done) return step.value;
    if (++sinceYield >= ASYNC_WALK_YIELD_EVERY) {
      sinceYield = 0;
      await new Promise<void>((resolveYield) => setImmediate(resolveYield));
    }
  }
}

/**
 * The managed total split by the subsystem that wrote it. Everything the walk finds inside
 * the configuration root that is neither a workspace, the local runner, nor the browser cache
 * is application state - so that category is the residual one and nothing goes unexplained.
 */
function globalSegments(
  workspaceGroupIds: readonly string[],
  browserDataRoot: string | undefined,
): readonly ISegmentDefinition[] {
  return [
    {
      id: 'application-state',
      label: 'Application state',
      description: 'Settings, the Symphony database, activity logs, and shared toolchain caches.',
    },
    {
      id: 'workspaces',
      label: 'Managed workspaces',
      description: 'Repositories, worktrees, verification runs, and databases of every workspace.',
      from: workspaceGroupIds,
    },
    {
      id: 'local-ci',
      label: 'Local GitHub Actions',
      description:
        'Runner tools, the Linux base image, the machine disks, and cached actions/cache entries.',
      from: ['local-ci'],
    },
    ...(browserDataRoot
      ? [
          {
            id: 'browser-data',
            label: 'Browser data',
            description:
              'Cache, cookies, and profile of the embedded Chromium and the built-in browser.',
            paths: [resolve(browserDataRoot)],
          },
        ]
      : []),
  ];
}

function localCiSegments(localCiRoot: string): readonly ISegmentDefinition[] {
  const limaRoot = resolve(localCiRoot, 'lima');
  return [
    {
      id: 'instances',
      label: 'Virtual machine instances',
      description: instancesSegmentDescription(limaRoot),
      paths: [limaRoot],
    },
    {
      id: 'base-image',
      label: 'Base image',
      description: 'The reusable Linux image, downloaded once and shared by every local run.',
      paths: [resolve(localCiRoot, 'cache', 'lima-downloads')],
    },
    {
      id: 'actions-cache',
      label: 'actions/cache entries',
      description:
        'Repository-isolated cache entries kept until they expire or exceed the cache budget.',
      paths: [resolve(localCiRoot, 'cache', 'repositories')],
    },
    {
      id: 'runner-tools',
      label: 'Runner tools',
      description: 'The Lima virtual machine manager and the GitHub Actions runner for this Mac.',
      paths: [resolve(localCiRoot, 'tools')],
    },
    {
      id: 'runner-home',
      label: 'Runner home',
      description: 'Configuration and state the runner keeps between local runs.',
      paths: [resolve(localCiRoot, 'home')],
    },
    {
      id: 'runner-other',
      label: 'Other runner data',
      description: 'Instance definitions and temporary files outside the categories above.',
    },
  ];
}

function workspaceSegments(roots: readonly string[]): readonly ISegmentDefinition[] {
  const within = (name: string): readonly string[] => roots.map((root) => resolve(root, name));
  return [
    {
      id: 'repositories',
      label: 'Cloned repositories',
      description: 'The managed clone of every repository connected to this workspace.',
      paths: within('repositories'),
    },
    {
      id: 'executions',
      label: 'Execution worktrees',
      description: 'Isolated worktrees an AI agent writes in while it works on an item.',
      paths: within('executions'),
    },
    {
      id: 'verification',
      label: 'Verification runs',
      description: 'Checkouts and captured evidence of verification runs.',
      paths: within('verification'),
    },
    {
      id: 'runtimes',
      label: 'Agent runtimes',
      description:
        'Isolated home directories for the Claude, Codex, and OpenCode command-line tools.',
      paths: within('runtimes'),
    },
    {
      id: 'database',
      label: 'Workspace database',
      description: 'The SQLite database holding items, executions, and activity of this workspace.',
    },
  ];
}

/**
 * Maps every declared root to the bucket that owns it, for all groups at once, so the whole
 * report needs a single walk instead of one walk per bar. Group roots are registered first as
 * the least specific claim; a nested segment root registered afterwards wins, because the walk
 * prefers a declared root over the attribution inherited from the parent directory.
 */
function bucketAttribution(groups: readonly IUsageGroup[]): ReadonlyMap<string, string> {
  const attribution = new Map<string, string>();
  for (const group of groups) {
    const residual = group.segments.find((segment) => !segment.paths && !segment.from);
    if (!residual) continue;
    for (const path of group.paths) attribution.set(path, bucketKey(group.id, residual.id));
  }
  for (const group of groups) {
    for (const segment of group.segments) {
      for (const path of segment.paths ?? []) {
        attribution.set(path, bucketKey(group.id, segment.id));
      }
    }
  }
  return attribution;
}

function usage(
  group: IUsageGroup,
  groups: readonly IUsageGroup[],
  allocation: ISegmentedAllocation,
): IStorageUsage {
  const allocatedBytes = groupTotal(group, allocation);
  const usagePercent = Math.min(100, Math.round((allocatedBytes / group.limitBytes) * 100));
  return {
    id: group.id,
    label: group.label,
    ...(group.workspaceId ? { workspaceId: group.workspaceId } : {}),
    paths: group.paths,
    allocatedBytes,
    limitBytes: group.limitBytes,
    usagePercent,
    pressure: maximumPressure(
      quotaPressure(allocatedBytes, group.limitBytes),
      group.minimumPressure,
    ),
    segments: segments(group, groups, allocation),
  };
}

function unavailableUsage(id: string, label: string, workspaceId?: string): IStorageUsage {
  return {
    id,
    label,
    ...(workspaceId ? { workspaceId } : {}),
    paths: [],
    allocatedBytes: 0,
    limitBytes: 0,
    usagePercent: 100,
    pressure: 'critical',
    segments: [],
  };
}

function assertUsage(value: IStorageUsage, requiredBytes: number): void {
  if (value.pressure !== 'critical' && value.allocatedBytes + requiredBytes <= value.limitBytes) {
    return;
  }
  throw new Error(
    `Storage safety stop: ${value.label} uses ${formatGiB(value.allocatedBytes)} of its ${formatGiB(value.limitBytes)} limit.`,
  );
}

function freeSpacePressure(availableBytes: number, reserveBytes: number): StoragePressure {
  if (availableBytes <= reserveBytes) return 'critical';
  if (availableBytes <= reserveBytes * 1.25) return 'danger';
  if (availableBytes <= reserveBytes * 2) return 'warning';
  return 'healthy';
}

function gibibytes(value: number): number {
  return value * BYTES_PER_GIBIBYTE;
}
