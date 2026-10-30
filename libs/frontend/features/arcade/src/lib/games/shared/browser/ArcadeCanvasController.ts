// #region Imports

import type { IArcadeCanvasOptions } from './IArcadeCanvasOptions';

// #endregion

const INTERACTIVE_TARGETS =
  'input, textarea, select, button, a, [contenteditable], [role="dialog"], mosaik-button, mosaik-searchbox, mosaik-text-box, mosaik-number-box, mosaik-select';

/** Owns display sizing, frame scheduling and respectful browser input for each game View. @public */
export class ArcadeCanvasController<TInput extends string> {
  // #region Fields

  private readonly _options: IArcadeCanvasOptions<TInput>;
  private readonly _document: Document;
  private readonly _window: Window;
  private readonly _heldKeys = new Set<string>();
  private readonly _cleanups: (() => void)[] = [];
  private _observer: ResizeObserver | undefined;
  private _frameHandle: number | undefined;
  private _lastFrameTime: number | undefined;
  private _disposed = false;
  private _pointerHeld = false;
  private _pointerPosition: readonly [number, number] = [0, 0];

  // #endregion

  // #region Ctor

  /** Starts the canvas lifecycle; the owning View disposes it when its lazy route closes. @public */
  public constructor(options: IArcadeCanvasOptions<TInput>) {
    this._options = options;
    this._document = options.canvas.ownerDocument;
    this._window = this._document.defaultView ?? window;
    const context = options.canvas.getContext('2d');
    if (!context) {
      options.onUnavailable?.();
      return;
    }
    this.listen(this._document, 'keydown', (event) => this.keyDown(event as KeyboardEvent), true);
    this.listen(this._document, 'keyup', (event) => this.keyUp(event as KeyboardEvent), true);
    this.listen(this._document, 'focusin', (event) => {
      if (this.isInteractive(event)) this.releaseInputs();
    });
    this.listen(this._document, 'visibilitychange', () => {
      if (this._document.hidden) this.suspend();
    });
    this.listen(this._window, 'blur', () => this.suspend());
    this.listen(options.canvas, 'pointermove', (event) => {
      if (!options.isActive()) return;
      const [x, y] = this.pointerPosition(event as PointerEvent);
      this._pointerPosition = [x, y];
      options.onPointerMove?.(x, y);
    });
    this.listen(options.canvas, 'pointerdown', (event) => {
      if (!options.isActive() || (event as PointerEvent).button !== 0) return;
      this.focus();
      const [x, y] = this.pointerPosition(event as PointerEvent);
      this._pointerHeld = true;
      this._pointerPosition = [x, y];
      options.onPointerDown?.(x, y);
    });
    this.listen(this._window, 'pointerup', () => this.releasePointer());
    this.listen(this._window, 'pointercancel', () => this.releasePointer());
    this._observer = new ResizeObserver(() => this.resize());
    this._observer.observe(options.canvas);
    this.resize();
    const frame = (now: number): void => {
      if (this._disposed) return;
      const elapsed = this._lastFrameTime === undefined ? 0 : now - this._lastFrameTime;
      this._lastFrameTime = now;
      this.resize();
      options.onAdvance(elapsed);
      options.onDraw(context, options.canvas);
      this._frameHandle = this._window.requestAnimationFrame(frame);
    };
    this._frameHandle = this._window.requestAnimationFrame(frame);
  }

  // #endregion

  // #region Methods

  /** Returns focus to the game following a user action and requests audio activation. @public */
  public focus(): void {
    if (this._disposed) return;
    this._options.canvas.focus({ preventScroll: true });
    if (this._options.isActive()) this._options.onAudioResume?.();
  }

  /** Cancels held controls without physical button-release actions when atomic cancellation is supplied. @public */
  public releaseInputs(): void {
    const inputs = new Set([...this._heldKeys].map((key) => this._options.inputs[key]));
    this._heldKeys.clear();
    if (this._options.onReleaseInputs) {
      this._pointerHeld = false;
      this._options.onReleaseInputs();
      return;
    }
    for (const input of inputs) if (input !== undefined) this._options.onInput(input, false);
    this.releasePointer();
  }

  /** Stops frames, input and observation when the owning game View is destroyed. @public */
  public dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.releaseInputs();
    this._observer?.disconnect();
    if (this._frameHandle !== undefined) this._window.cancelAnimationFrame(this._frameHandle);
    for (const cleanup of this._cleanups) cleanup();
    this._options.onAudioSuspend?.();
  }

  private listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    capture = false,
  ): void {
    target.addEventListener(type, listener, { capture });
    this._cleanups.push(() => target.removeEventListener(type, listener, { capture }));
  }

  private suspend(): void {
    this._options.onPause();
    this.releaseInputs();
    this._options.onAudioSuspend?.();
    this._lastFrameTime = undefined;
  }

  private releasePointer(): void {
    if (!this._pointerHeld) return;
    this._pointerHeld = false;
    this._options.onPointerUp?.(...this._pointerPosition);
  }

  private resize(): void {
    const canvas = this._options.canvas;
    const bounds = canvas.getBoundingClientRect();
    const ratio = this._window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(bounds.width * ratio));
    const height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  private pointerPosition(event: PointerEvent): readonly [number, number] {
    const bounds = this._options.canvas.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width))),
      Math.max(0, Math.min(1, (event.clientY - bounds.top) / Math.max(1, bounds.height))),
    ];
  }

  private keyDown(event: KeyboardEvent): void {
    if (
      !this._options.isActive() ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      this.isInteractive(event)
    )
      return;
    if (event.code === 'KeyP' || event.code === 'Escape') {
      event.preventDefault();
      if (!event.repeat) {
        this._options.onTogglePause();
        this.releaseInputs();
        this._options.onAudioResume?.();
      }
      return;
    }
    const input = this._options.inputs[event.code];
    if (input === undefined) return;
    event.preventDefault();
    if (event.repeat) return;
    const wasActive = [...this._heldKeys].some((key) => this._options.inputs[key] === input);
    this._heldKeys.add(event.code);
    this._options.onAudioResume?.();
    if (!wasActive) this._options.onInput(input, true);
  }

  private keyUp(event: KeyboardEvent): void {
    const input = this._options.inputs[event.code];
    const wasHeld = this._heldKeys.delete(event.code);
    if (input === undefined || !wasHeld) return;
    const active = [...this._heldKeys].some((key) => this._options.inputs[key] === input);
    this._options.onInput(input, active);
    if (this._options.isActive() && !this.isInteractive(event)) event.preventDefault();
  }

  private isInteractive(event: Event): boolean {
    return event
      .composedPath()
      .some((target) => target instanceof HTMLElement && target.matches(INTERACTIVE_TARGETS));
  }

  // #endregion
}
