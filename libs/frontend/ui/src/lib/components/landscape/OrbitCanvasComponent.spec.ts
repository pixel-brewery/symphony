// @vitest-environment jsdom

// #region Imports

import { ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ThemeObserver } from '@pixel-brewery/mosaik-themes';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IOrbitCamera } from './IOrbitCamera';
import type { IOrbitCrewMember } from './IOrbitCrewMember';
import type { IOrbitRendererOptions } from './IOrbitRendererOptions';
import type { IOrbitScene } from './IOrbitScene';
import { OrbitCanvasComponent } from './OrbitCanvasComponent';

// #endregion

const renderers = vi.hoisted(() => ({
  created: [] as Array<{
    options: IOrbitRendererOptions;
    setScene: ReturnType<typeof vi.fn>;
    setCrew: ReturnType<typeof vi.fn>;
    restoreCamera: ReturnType<typeof vi.fn>;
    focusNode: ReturnType<typeof vi.fn>;
    fit: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    setVisible: ReturnType<typeof vi.fn>;
    setPalette: ReturnType<typeof vi.fn>;
  }>,
}));

// The built Angular/Mosaik template is exercised in Electron; this JIT suite owns facade lifecycle only.
vi.mock('@pixel-brewery/mosaik-elements-angular', () => ({
  BadgeComponent: class {},
  ButtonComponent: class {},
  CardComponent: class {},
  TextComponent: class {},
  TypographyDirective: class {},
}));

vi.mock('./OrbitCanvasRenderer', () => ({
  OrbitCanvasRenderer: class {
    public constructor(_canvas: HTMLCanvasElement, options: IOrbitRendererOptions) {
      const changed = (): void =>
        options.cameraChanged({ position: { x: 20, y: 20, z: 20 }, target: { x: 0, y: 0, z: 0 } });
      const renderer = {
        options,
        setScene: vi.fn(changed),
        setCrew: vi.fn(),
        restoreCamera: vi.fn((camera: IOrbitCamera) => options.cameraChanged(camera)),
        focusNode: vi.fn(),
        fit: vi.fn(changed),
        dispose: vi.fn(),
        setVisible: vi.fn(),
        setPalette: vi.fn(),
        setSelected: vi.fn(),
        setPinned: vi.fn(),
        setReducedMotion: vi.fn(),
        resize: vi.fn(),
        zoomBy: vi.fn(),
        zoomTo: vi.fn(),
      };
      renderers.created.push(renderer);
      Object.assign(this, renderer);
    }
  },
}));

describe('OrbitCanvasComponent', () => {
  const themeListeners = new Set<() => void>();
  const scene: IOrbitScene = {
    nodes: [{ id: 'ticket:a', kind: 'ticket', label: 'A', position: { x: 24, y: 0, z: 0 } }],
    rings: [],
    edges: [],
    ticketCount: 1,
  };
  const cameraA: IOrbitCamera = { position: { x: 40, y: 20, z: 60 }, target: { x: 2, y: 3, z: 4 } };
  const cameraB: IOrbitCamera = {
    position: { x: -16, y: 5, z: 12 },
    target: { x: -2, y: 0, z: 1 },
  };
  const create = (): ReturnType<typeof TestBed.createComponent<OrbitCanvasComponent>> => {
    const fixture = TestBed.createComponent(OrbitCanvasComponent);
    const canvas = document.createElement('canvas');
    const viewport = document.createElement('div');
    viewport.getBoundingClientRect = () => ({ width: 736, height: 550 }) as DOMRect;
    Reflect.set(fixture.componentInstance, '_canvas', () => new ElementRef(canvas));
    Reflect.set(fixture.componentInstance, '_viewport', () => new ElementRef(viewport));
    vi.spyOn(fixture.componentInstance, 'scene').mockImplementation(() => scene);
    return fixture;
  };
  const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  beforeEach(() => {
    renderers.created.length = 0;
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0),
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
    TestBed.resetTestingModule();
    themeListeners.clear();
    const changes = {
      subscribe: (callback: () => void) => {
        themeListeners.add(callback);
        return { dispose: () => themeListeners.delete(callback) };
      },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThemeObserver, useValue: { themeChanged: changes, themeModeChanged: changes } },
      ],
    });
    TestBed.overrideComponent(OrbitCanvasComponent, {
      set: { template: '', templateUrl: undefined, styles: [], styleUrl: undefined, imports: [] },
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('restores the captured camera without publishing an intermediate fit and releases the lazy renderer', async () => {
    // arrange
    const fixture = create();
    vi.spyOn(fixture.componentInstance, 'camera').mockImplementation(() => cameraA);
    const emitted = vi.fn();
    fixture.componentInstance.cameraChanged.subscribe(emitted);
    // act
    fixture.detectChanges();
    await settle();
    const renderer = renderers.created[0];
    // assert
    expect(renderer?.restoreCamera).toHaveBeenCalledWith(cameraA);
    expect(emitted).not.toHaveBeenCalled();
    renderer?.options.cameraChanged(cameraB);
    expect(emitted).toHaveBeenCalledExactlyOnceWith(cameraB);
    fixture.destroy();
    expect(renderer?.dispose).toHaveBeenCalledOnce();
  });

  it('atomically restores another scope camera and supports repeating focus on the same ticket', async () => {
    // arrange
    const fixture = create();
    const scope = signal('workspace:a');
    const camera = signal(cameraA);
    const focus = signal<string | undefined>('ticket:a');
    const revision = signal(0);
    vi.spyOn(fixture.componentInstance, 'scopeKey').mockImplementation(() => scope());
    vi.spyOn(fixture.componentInstance, 'camera').mockImplementation(() => camera());
    vi.spyOn(fixture.componentInstance, 'focusId').mockImplementation(() => focus());
    vi.spyOn(fixture.componentInstance, 'focusRevision').mockImplementation(() => revision());
    const emitted = vi.fn();
    fixture.componentInstance.cameraChanged.subscribe(emitted);
    fixture.detectChanges();
    await settle();
    const renderer = renderers.created[0];
    renderer?.focusNode.mockClear();
    renderer?.restoreCamera.mockClear();
    // act
    scope.set('workspace:b');
    camera.set(cameraB);
    fixture.detectChanges();
    // assert
    expect(renderer?.restoreCamera).toHaveBeenCalledWith(cameraB);
    expect(emitted).not.toHaveBeenCalled();
    revision.set(1);
    fixture.detectChanges();
    expect(renderer?.focusNode).toHaveBeenCalledExactlyOnceWith('ticket:a');
    focus.set(undefined);
    fixture.detectChanges();
    focus.set('ticket:a');
    fixture.detectChanges();
    expect(renderer?.focusNode).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });

  it('inherits current theme colours and repaints on theme changes without recreating the renderer', async () => {
    // arrange
    const fixture = create();
    const viewport = document.createElement('div');
    viewport.style.setProperty('--mosaik-scheme-background', '#ffffff');
    viewport.style.setProperty('--mosaik-scheme-foreground', '#0a0a0a');
    document.body.append(viewport);
    Reflect.set(fixture.componentInstance, '_viewport', () => new ElementRef(viewport));
    fixture.detectChanges();
    await settle();
    const renderer = renderers.created[0]!;
    // act
    for (const changed of themeListeners) changed();
    expect(renderer.setPalette).not.toHaveBeenCalled();
    viewport.style.setProperty('--mosaik-scheme-background', '#0a0a0a');
    viewport.style.setProperty('--mosaik-scheme-foreground', '#fafafa');
    await settle();
    // assert
    expect(renderer.options.palette).toMatchObject({
      background: '#ffffff',
      foreground: '#0a0a0a',
    });
    expect(renderer.setPalette).toHaveBeenLastCalledWith(
      expect.objectContaining({ background: '#0a0a0a', foreground: '#fafafa' }),
    );
    expect(renderers.created).toHaveLength(1);
    fixture.destroy();
    viewport.remove();
    expect(themeListeners.size).toBe(0);
  });

  it('suspends hidden documents, resumes visible documents, and removes its visibility listener on disposal', async () => {
    // arrange
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const fixture = create();
    fixture.detectChanges();
    await settle();
    const renderer = renderers.created[0]!;
    renderer.setVisible.mockClear();
    // act
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    // assert
    expect(renderer.setVisible).toHaveBeenCalledExactlyOnceWith(false);
    // act
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    // assert
    expect(renderer.setVisible).toHaveBeenLastCalledWith(true);
    // act
    fixture.destroy();
    renderer.setVisible.mockClear();
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    // assert
    expect(renderer.setVisible).not.toHaveBeenCalled();
  });

  it('reacts to edited project pilots after lazy initialization without resetting the world or camera', async () => {
    // arrange
    const fixture = create();
    const crew = signal<readonly IOrbitCrewMember[]>([{ id: 'paula', name: 'Paula Planung' }]);
    vi.spyOn(fixture.componentInstance, 'crew').mockImplementation(() => crew());
    fixture.detectChanges();
    await settle();
    const renderer = renderers.created[0]!;
    renderer.setCrew.mockClear();
    renderer.setScene.mockClear();
    renderer.fit.mockClear();
    // act
    crew.set([
      {
        id: 'paula',
        name: 'Paula',
        appearance: { figure: 'dot', color: 'rose', accessories: [] },
      },
    ]);
    fixture.detectChanges();
    // assert
    expect(renderer.setCrew).toHaveBeenCalledExactlyOnceWith(crew());
    expect(renderer.setScene).not.toHaveBeenCalled();
    expect(renderer.fit).not.toHaveBeenCalled();
    expect(renderers.created).toHaveLength(1);
    fixture.destroy();
  });
});
