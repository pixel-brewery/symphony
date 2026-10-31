// #region Imports

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Inject,
  Injector,
  NgZone,
  afterNextRender,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  ButtonComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { ThemeObserver } from '@pixel-brewery/mosaik-themes';
import type { IOrbitCamera } from './IOrbitCamera';
import type { IOrbitScene } from './IOrbitScene';
import type { IOrbitRenderFrame } from './IOrbitRenderFrame';
import type { IOrbitPalette } from './IOrbitPalette';
import type { IOrbitCrewMember } from './IOrbitCrewMember';
import type { OrbitCanvasRenderer } from './OrbitCanvasRenderer';
import { orbitNodeVariant } from './orbitNodeVariant';

// #endregion

/** Accessible ticket and delivery labels over a lazily loaded WebGL world. @public */
@Component({
  selector: 'symphony-orbit-canvas',
  imports: [ButtonComponent, TextComponent, TypographyDirective],
  templateUrl: './OrbitCanvasComponent.html',
  styleUrl: './OrbitCanvasComponent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrbitCanvasComponent implements AfterViewInit {
  // #region Fields

  /** Full immutable world projection, including every filtered ticket. @public */
  public readonly scene = input.required<IOrbitScene>();
  /** Saved project identities for passive, finite shuttle flights. @public */
  public readonly crew = input<readonly IOrbitCrewMember[]>([]);
  /** Stable selected world object. @public */
  public readonly selectedId = input<string>();
  /** Changing this input focuses the supplied world object. @public */
  public readonly focusId = input<string>();
  /** Explicit focus commands can repeat the same stable object ID. @public */
  public readonly focusRevision = input(0);
  /** Restorable world camera, scoped by the owning workspace view. @public */
  public readonly camera = input<IOrbitCamera>();
  /** Resets world navigation when repository/workspace context changes. @public */
  public readonly scopeKey = input('');
  /** Native mesh and DOM label selection share the same IDs. @public */
  public readonly selected = output<string>();
  /** Emitted on a settled user camera action. @public */
  public readonly cameraChanged = output<IOrbitCamera>();
  /** Last completed GPU projection. @public */
  public readonly frame = signal<IOrbitRenderFrame | undefined>(undefined);
  /** Meaningful renderer state for fallback and acceptance surfaces. @public */
  public readonly renderState = signal<
    'loading' | 'ready' | 'animating' | 'paused' | 'unavailable' | 'context-lost'
  >('loading');
  /** Rendering follows finite scene visibility. @public */
  public readonly visible = signal(true);
  /** A retry receives a fresh native context rather than reusing a lost canvas. @public */
  public readonly canvasKey = signal(0);
  /** Shared semantic colour mapping for labels and GPU instances. @public */
  public readonly nodeVariant = orbitNodeVariant;
  private readonly _canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('webgl');
  private readonly _viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private _renderer?: OrbitCanvasRenderer;
  private _destroyed = false;
  private _initializing = false;
  private _syncingCamera = false;
  private _resizeObserver?: ResizeObserver;
  private _intersectionObserver?: IntersectionObserver;
  private _motion?: MediaQueryList;
  private _scope?: string;
  private _focus?: string;
  private _lastCamera?: string;
  private _themeFrame = 0;
  private readonly _listeners = new AbortController();

  // #endregion

  // #region Ctor

  /** Owns only renderer lifecycle and derived scene display state. @public */
  public constructor(
    @Inject(ElementRef) private readonly _element: ElementRef<HTMLElement>,
    @Inject(NgZone) private readonly _zone: NgZone,
    @Inject(Injector) private readonly _injector: Injector,
    @Inject(DestroyRef) destroy: DestroyRef,
    @Inject(DOCUMENT) private readonly _document: Document,
    @Inject(ThemeObserver) themeObserver: ThemeObserver,
  ) {
    const themeSubscriptions = [
      themeObserver.themeChanged.subscribe(() => this.refreshPalette()),
      themeObserver.themeModeChanged.subscribe(() => this.refreshPalette()),
    ];
    effect(() => {
      const scene = this.scene();
      const scope = this.scopeKey();
      const renderer = this._renderer;
      if (!renderer) return;
      const changedScope = this._scope !== undefined && scope !== this._scope;
      this._scope = scope;
      if (changedScope) {
        const cachedCamera = this.camera();
        this._focus = this.focusId() ? `${this.focusId()}:${this.focusRevision()}` : undefined;
        this._lastCamera = undefined;
        this._syncingCamera = true;
        try {
          renderer.setPinned(undefined);
          renderer.setCrew([]);
          renderer.setScene(scene);
          renderer.fit(false);
          if (cachedCamera) renderer.restoreCamera(cachedCamera);
          renderer.setCrew(this.crew());
        } finally {
          this._syncingCamera = false;
        }
      } else renderer.setScene(scene);
    });
    effect(() => {
      const crew = this.crew();
      this._renderer?.setCrew(crew);
    });
    effect(() => {
      this._renderer?.setSelected(this.selectedId());
    });
    effect(() => {
      const camera = this.camera();
      const key = camera ? JSON.stringify(camera) : undefined;
      if (camera && key !== this._lastCamera) {
        this._lastCamera = key;
        this._renderer?.restoreCamera(camera);
      }
    });
    effect(() => {
      const focus = this.focusId();
      const key = focus ? `${focus}:${this.focusRevision()}` : undefined;
      if (!focus) this._focus = undefined;
      const state = this.renderState();
      if (
        focus &&
        key !== this._focus &&
        this._renderer &&
        state !== 'unavailable' &&
        state !== 'context-lost'
      ) {
        this._focus = key;
        this._renderer.focusNode(focus);
      }
    });
    destroy.onDestroy(() => {
      this._destroyed = true;
      this._listeners.abort();
      cancelAnimationFrame(this._themeFrame);
      for (const subscription of themeSubscriptions) subscription.dispose();
      this._resizeObserver?.disconnect();
      this._intersectionObserver?.disconnect();
      this._motion?.removeEventListener('change', this._onMotionChange);
      this._renderer?.dispose();
      this._renderer = undefined;
    });
  }

  // #endregion

  // #region Methods

  /** Starts WebGL after the native canvas exists; Three never enters the mobile entry point. @public */
  public ngAfterViewInit(): void {
    this._motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._motion.addEventListener('change', this._onMotionChange);
    this._document.addEventListener('visibilitychange', this._onVisibilityChange, {
      signal: this._listeners.signal,
    });
    this._zone.runOutsideAngular(() => {
      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(() => this.resize());
        this._resizeObserver.observe(this._viewport().nativeElement);
      }
      if (typeof IntersectionObserver !== 'undefined') {
        this._intersectionObserver = new IntersectionObserver((entries) => {
          const entry = entries[0];
          if (!entry) return;
          this._zone.run(() => this.visible.set(entry.isIntersecting));
          this._renderer?.setVisible(entry.isIntersecting && !this._document.hidden);
        });
        this._intersectionObserver.observe(this._element.nativeElement);
      }
      void this.initialize();
    });
  }

  /** Fits every retained object. @public */
  public fit(): void {
    this._renderer?.fit();
  }

  /** Public toolbar zoom in world units. @public */
  public zoomBy(factor: number): void {
    this._renderer?.zoomBy(factor);
  }

  /** Public finder and keyboard navigation focus the same world IDs as raycasting. @public */
  public focusNode(id: string): void {
    this._renderer?.focusNode(id);
  }

  /** Stable label selection does not relocate the keyboard focus to another object. @public */
  public selectNode(id: string): void {
    this._renderer?.setSelected(id);
    this.selected.emit(id);
  }

  /** Keeps the focused label represented during a snapshot/camera refresh. @public */
  public pinNode(id: string): void {
    this._renderer?.setPinned(id);
  }

  /** Native keyboard focus can enter the scene without a pointer gesture. @public */
  public labelKeydown(event: KeyboardEvent, id: string): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.focusNode(id);
    }
  }

  /** Allows recovery after driver/device availability changes. @public */
  public retry(): void {
    this._renderer?.dispose();
    this._renderer = undefined;
    this.renderState.set('loading');
    this.canvasKey.update((key) => key + 1);
    afterNextRender(
      () => {
        this._zone.runOutsideAngular(() => {
          void this.initialize();
        });
      },
      { injector: this._injector },
    );
  }

  /** @private */
  private async initialize(): Promise<void> {
    if (this._destroyed || this._initializing) return;
    this._initializing = true;
    try {
      const { OrbitCanvasRenderer: Renderer } = await import('./OrbitCanvasRenderer');
      if (this._destroyed) return;
      const scope = this.scopeKey();
      const cachedCamera = this.camera();
      const renderer = new Renderer(this._canvas().nativeElement, {
        palette: this.palette(),
        reducedMotion: this._motion?.matches ?? false,
        frame: (frame) =>
          this._zone.run(() => {
            this.frame.set(frame);
            this.renderState.set(frame.state);
          }),
        selected: (id) => this._zone.run(() => this.selected.emit(id)),
        cameraChanged: (camera) =>
          this._zone.run(() => {
            this._lastCamera = JSON.stringify(camera);
            if (!this._initializing && !this._syncingCamera) this.cameraChanged.emit(camera);
          }),
        failed: () => this._zone.run(() => this.renderState.set('unavailable')),
      });
      this._renderer = renderer;
      this._scope = scope;
      renderer.setScene(this.scene());
      renderer.setCrew(this.crew());
      renderer.setSelected(this.selectedId());
      this.resize();
      if (cachedCamera) renderer.restoreCamera(cachedCamera);
      const focus = this.focusId();
      const focusKey = focus ? `${focus}:${this.focusRevision()}` : undefined;
      if (focus && focusKey !== this._focus) {
        this._focus = focusKey;
        renderer.focusNode(focus);
      }
      renderer.setVisible(this.visible() && !this._document.hidden);
    } catch {
      this._renderer?.dispose();
      this._renderer = undefined;
      this._zone.run(() => this.renderState.set('unavailable'));
    } finally {
      this._initializing = false;
    }
  }

  /** @private */
  private refreshPalette(): void {
    if (this._destroyed || !this._renderer) return;
    cancelAnimationFrame(this._themeFrame);
    // Mosaik's mode event precedes stylesheet application. Read the resolved tokens at the next frame.
    this._zone.runOutsideAngular(() => {
      this._themeFrame = requestAnimationFrame(() => {
        this._themeFrame = 0;
        if (!this._destroyed) this._renderer?.setPalette(this.palette());
      });
    });
  }

  /** @private */
  private palette(): IOrbitPalette {
    const style = getComputedStyle(this._viewport().nativeElement);
    const colour = (name: string, fallback: string): string =>
      style.getPropertyValue(name).trim() || fallback;
    const foreground = colour('--mosaik-scheme-foreground', 'black');
    const neutral = colour('--mosaik-color-neutral-500', foreground);
    return {
      background: colour('--mosaik-scheme-background', 'white'),
      foreground,
      neutral,
      primary: colour('--mosaik-color-primary-400', foreground),
      secondary: colour('--mosaik-color-secondary-400', neutral),
      info: colour('--mosaik-color-info-400', foreground),
      warning: colour('--mosaik-color-warning-400', foreground),
      danger: colour('--mosaik-color-danger-400', foreground),
      success: colour('--mosaik-color-success-400', foreground),
      highlight: colour('--mosaik-color-highlight-400', foreground),
    };
  }

  /** @private */
  private resize(): void {
    if (this._destroyed) return;
    const bounds = this._viewport().nativeElement.getBoundingClientRect();
    this._renderer?.resize(bounds.width, bounds.height);
  }

  /** @private */
  private readonly _onMotionChange = (): void => {
    this._renderer?.setReducedMotion(this._motion?.matches ?? false);
  };
  /** @private */
  private readonly _onVisibilityChange = (): void => {
    // Hidden Electron acceptance windows still receive one native frame. No autonomous loop remains active.
    this._renderer?.setVisible(this.visible() && !this._document.hidden);
  };

  // #endregion
}
