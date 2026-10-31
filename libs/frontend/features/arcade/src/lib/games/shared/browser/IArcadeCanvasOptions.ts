/** Browser callbacks shared by the games, without coupling their rules or snapshots. @public */
export interface IArcadeCanvasOptions<TInput extends string> {
  readonly canvas: HTMLCanvasElement;
  readonly inputs: Readonly<Record<string, TInput>>;
  readonly isActive: () => boolean;
  readonly onAdvance: (elapsedMilliseconds: number) => void;
  readonly onDraw: (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
  readonly onInput: (input: TInput, active: boolean) => void;
  readonly onReleaseInputs?: () => void;
  readonly onPause: () => void;
  readonly onTogglePause: () => void;
  readonly onAudioResume?: () => void;
  readonly onAudioSuspend?: () => void;
  readonly onUnavailable?: () => void;
  readonly onPointerMove?: (x: number, y: number) => void;
  readonly onPointerDown?: (x: number, y: number) => void;
  readonly onPointerUp?: (x: number, y: number) => void;
}
