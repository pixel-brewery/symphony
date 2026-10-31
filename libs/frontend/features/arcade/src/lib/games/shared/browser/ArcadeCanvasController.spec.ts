// @vitest-environment jsdom

// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { BreakoutGame } from '../../breakout/model/BreakoutGame';
import { ArcadeCanvasController } from './ArcadeCanvasController';
import type { IArcadeCanvasOptions } from './IArcadeCanvasOptions';

// #endregion

function createHarness(overrides: Partial<IArcadeCanvasOptions<'left' | 'fire'>> = {}) {
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  document.body.append(canvas);
  vi.spyOn(canvas, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 10,
    y: 20,
    left: 10,
    top: 20,
    width: 400,
    height: 200,
    right: 410,
    bottom: 220,
    toJSON: () => ({}),
  });
  let frame: FrameRequestCallback | undefined;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frame = callback;
    return 7;
  });
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  const disconnect = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
  const input = vi.fn();
  const advance = vi.fn();
  const draw = vi.fn();
  const pause = vi.fn();
  const toggle = vi.fn();
  const pointer = vi.fn();
  const pointerDown = vi.fn();
  const pointerUp = vi.fn();
  const audioSuspend = vi.fn();
  let active = true;
  const controller = new ArcadeCanvasController({
    canvas,
    inputs: { ArrowLeft: 'left', KeyA: 'left', Space: 'fire' },
    isActive: () => active,
    onInput: input,
    onAdvance: advance,
    onDraw: draw,
    onPause: pause,
    onTogglePause: toggle,
    onPointerMove: pointer,
    onPointerDown: pointerDown,
    onPointerUp: pointerUp,
    onAudioSuspend: audioSuspend,
    ...overrides,
  });
  return {
    canvas,
    controller,
    input,
    advance,
    draw,
    pause,
    toggle,
    pointer,
    pointerDown,
    pointerUp,
    cancel,
    disconnect,
    audioSuspend,
    frame: (now: number) => frame?.(now),
    setActive: (value: boolean) => {
      active = value;
    },
  };
}

function key(
  code: string,
  type = 'keydown',
  target: EventTarget = document,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

describe('ArcadeCanvasController', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps aliased controls held until their last key is released and clears controls on focus loss', () => {
    // arrange
    const harness = createHarness();
    // act
    key('ArrowLeft');
    key('KeyA');
    key('ArrowLeft', 'keyup');
    // assert
    expect(harness.input).not.toHaveBeenCalledWith('left', false);
    // act
    window.dispatchEvent(new Event('blur'));
    // assert
    expect(harness.input).toHaveBeenLastCalledWith('left', false);
    expect(harness.pause).toHaveBeenCalledOnce();
    expect(harness.audioSuspend).toHaveBeenCalledOnce();
    harness.controller.dispose();
  });

  it('leaves typing and system shortcuts alone, and routes pause only in an active game', () => {
    // arrange
    const harness = createHarness();
    const input = document.createElement('input');
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    shadow.append(button);
    document.body.append(input, host);
    // act
    const typing = key('Space', 'keydown', input);
    key('ArrowLeft', 'keydown', document, { metaKey: true });
    key('Space', 'keydown', button, { composed: true });
    harness.setActive(false);
    key('KeyP');
    // assert
    expect(typing.defaultPrevented).toBe(false);
    expect(harness.input).not.toHaveBeenCalled();
    expect(harness.toggle).not.toHaveBeenCalled();
    // act
    harness.setActive(true);
    key('KeyP');
    key('KeyP', 'keydown', document, { repeat: true });
    // assert
    expect(harness.toggle).toHaveBeenCalledOnce();
    harness.controller.dispose();
  });

  it('tracks display density, normalizes paddle pointer positions and releases its browser resources', () => {
    // arrange
    const harness = createHarness();
    vi.stubGlobal('devicePixelRatio', 2);
    // act
    harness.frame(100);
    harness.frame(116);
    harness.canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 210, clientY: 70 }));
    // assert
    expect(harness.canvas.width).toBe(800);
    expect(harness.canvas.height).toBe(400);
    expect(harness.advance.mock.calls).toEqual([[0], [16]]);
    expect(harness.pointer).toHaveBeenLastCalledWith(0.5, 0.25);
    // act
    harness.controller.dispose();
    harness.controller.dispose();
    key('ArrowLeft');
    // assert
    expect(harness.cancel).toHaveBeenCalledOnce();
    expect(harness.disconnect).toHaveBeenCalledOnce();
    expect(harness.input).not.toHaveBeenCalled();
  });

  it('releases a held paddle button outside the canvas and on focus loss', () => {
    // arrange
    const harness = createHarness();
    // act
    harness.canvas.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 210, clientY: 70, button: 0 }),
    );
    window.dispatchEvent(new MouseEvent('pointerup'));
    window.dispatchEvent(new MouseEvent('pointerup'));
    // assert
    expect(harness.pointerDown).toHaveBeenCalledOnce();
    expect(harness.pointerUp).toHaveBeenCalledExactlyOnceWith(0.5, 0.25);
    // act
    harness.canvas.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    window.dispatchEvent(new Event('blur'));
    // assert
    expect(harness.pointerUp).toHaveBeenCalledTimes(2);
    harness.controller.dispose();
  });

  it.each(['blur', 'pause', 'focus'] as const)(
    'preserves a caught ball when %s cancels held controls',
    (reason) => {
      // arrange
      const game = new BreakoutGame();
      game.newGame({ variation: 3, players: 1, difficultyA: 'A', difficultyB: 'A' });
      const harness = createHarness({
        onInput: (input, active) => game.setInput(input, active),
        onReleaseInputs: () => game.releaseInputs(),
        onPause: () => game.pause(),
        onTogglePause: () => game.togglePause(),
      });
      key('Space');
      game.placeBall(80, 174, 0, 72);
      game.step(1000 / 60);
      const caught = game.snapshot.ball;

      // act
      if (reason === 'blur') window.dispatchEvent(new Event('blur'));
      else if (reason === 'pause') key('KeyP');
      else {
        const button = document.createElement('button');
        document.body.append(button);
        button.focus();
      }
      key('Space', 'keyup');
      if (reason !== 'focus') key('KeyP');

      // assert
      expect(game.snapshot.status).toBe('playing');
      expect(game.snapshot.ball).toEqual(caught);
      expect(game.snapshot.ball.attachedPaddle).toBe(0);

      // act
      key('Space');
      key('Space', 'keyup');

      // assert
      expect(game.snapshot.ball.attachedPaddle).toBeNull();
      expect(game.snapshot.ball.vy).toBeLessThan(0);
      harness.controller.dispose();
    },
  );

  it('cancels a pointer hold atomically without turning focus loss into a physical release', () => {
    // arrange
    const cancelInputs = vi.fn();
    const harness = createHarness({ onReleaseInputs: cancelInputs });
    harness.canvas.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));

    // act
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new MouseEvent('pointerup'));

    // assert
    expect(cancelInputs).toHaveBeenCalledOnce();
    expect(harness.pointerUp).not.toHaveBeenCalled();
    expect(harness.pause.mock.invocationCallOrder[0]).toBeLessThan(
      cancelInputs.mock.invocationCallOrder[0]!,
    );
    harness.controller.dispose();
  });
});
