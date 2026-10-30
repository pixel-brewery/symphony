export interface ISquirrelStartupOptions {
  readonly platform?: NodeJS.Platform;
  readonly command?: string;
  readonly execPath?: string;
  readonly quit: () => void;
  readonly spawnUpdate?: (
    executable: string,
    arguments_: readonly string[],
  ) => ISpawnedUpdateProcess;
}

interface ISpawnedUpdateProcess {
  once(event: 'close' | 'error', listener: () => void): unknown;
}
