/** The Electron power-save-blocker surface the coordinator depends on. */
export interface IPowerSaveBlocker {
  start(type: 'prevent-app-suspension' | 'prevent-display-sleep'): number;
  stop(id: number): void;
  isStarted(id: number): boolean;
}
