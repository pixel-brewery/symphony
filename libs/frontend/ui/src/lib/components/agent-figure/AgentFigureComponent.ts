// #region Imports

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  defaultAgentAppearance,
  type IAgentAppearance,
  type IAgentActivity,
  type IAgentWork,
} from '@symphony/domain-team';
import { agentFigureSource } from './agentFigureSource';
import { AgentSpriteAssets } from './AgentSpriteAssets';
import { AgentFigurePointer } from './AgentFigurePointer';
import { AGENT_SPRITE_ATLAS } from './AgentSpriteAtlas';
import { agentSpriteAnimation } from './agentSpriteAnimation';
import { agentSpriteFramePosition } from './agentSpriteFramePosition';
import { agentSpriteLookFrame } from './agentSpriteLookFrame';
import { projectAgentSpriteState } from './projectAgentSpriteState';
import type { IAgentSpriteFrame } from './IAgentSpriteFrame';

// #endregion

/** FLAMOX sprite playback and attention gestures, bound to real Symphony activity. */
@Component({
  selector: 'symphony-agent-figure',
  host: {
    '[style.width.px]': 'extent()',
    '[style.height.px]': 'extent()',
  },
  templateUrl: './AgentFigureComponent.html',
  styleUrl: './AgentFigureComponent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentFigureComponent implements AfterViewInit {
  // #region Fields

  private readonly _element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _destroy = inject(DestroyRef);
  private readonly _document = inject(DOCUMENT);
  private readonly _assets = inject(AgentSpriteAssets);
  private readonly _pointer = inject(AgentFigurePointer);
  private readonly _frame = signal<IAgentSpriteFrame>({
    rowIndex: 0,
    columnIndex: 0,
    frameDurationMs: 0,
  });
  private readonly _greeting = signal(false);
  private readonly _celebrated = signal(false);
  private _completionKey = '';
  private readonly _resting = computed(
    () => this.state() === 'idle' || (this.state() === 'completed' && this._celebrated()),
  );
  private readonly _documentVisible = signal(true);
  /** @public */
  public readonly agentId = input.required<string>();
  /** @public */
  public readonly name = input('');
  /** @public */
  public readonly appearance = input<IAgentAppearance>();
  /** @public */
  public readonly state = input<IAgentActivity['state']>('idle');
  /** Actual assignments supply the role of the currently running phase. @public */
  public readonly work = input<readonly IAgentWork[]>([]);
  /** Bounded mobile projection of the actual running role. @public */
  public readonly activeRole = input<string>();
  /** Catalogue thumbnails remain still; custom images keep their original PNG. @public */
  public readonly animated = input(true);
  /** Allows parent-owned selection controls without manufacturing work events. @public */
  public readonly interactive = input(true);
  /** @public */
  public readonly size = input(96);
  /** @public */
  public readonly extent = computed(() => Math.max(24, Math.min(512, this.size())));
  /** @public */
  public readonly visible = signal(true);
  /** @public */
  public readonly reducedMotion = signal(false);
  /** Decoded and geometry-checked sprite, or the original PNG while loading. @public */
  public readonly sprite = signal<string | null>(null);
  /** Asset failure retains the locally bundled identity image. @public */
  public readonly unavailable = signal(false);
  /** @public */
  public readonly identity = computed(
    () => this.appearance() ?? defaultAgentAppearance(this.agentId()),
  );
  /** @public */
  public readonly source = computed(() => agentFigureSource(this.identity()));
  /** @public */
  public readonly pose = computed(() =>
    this._greeting() && this._resting()
      ? 'waving'
      : this.state() === 'completed' && this._celebrated()
        ? 'idle'
        : projectAgentSpriteState(this.state(), this.work(), this.activeRole()),
  );
  /** @public */
  public readonly stationary = computed(
    () =>
      this.reducedMotion() ||
      !this.visible() ||
      !this._documentVisible() ||
      ['paused', 'blocked', 'failed', 'stale'].includes(this.state()),
  );
  /** Idle figures look towards the pointer; work and decisions keep their own poses. @public */
  public readonly look = computed(() => {
    const target = this._pointer.target();
    return target &&
      this.sprite() &&
      this.interactive() &&
      this._resting() &&
      !this._greeting() &&
      !this.stationary()
      ? agentSpriteLookFrame(this._element.nativeElement.getBoundingClientRect(), target)
      : null;
  });
  /** @public */
  public readonly frame = computed(() => this.look() ?? this._frame());
  /** @public */
  public readonly backgroundPosition = computed(() => agentSpriteFramePosition(this.frame()));
  /** @public */
  public readonly backgroundSize = `${AGENT_SPRITE_ATLAS.columns * 100}% ${AGENT_SPRITE_ATLAS.rows * 100}%`;

  // #endregion

  // #region Ctor

  /** Adapts FLAMOX's asset, motion-preference and finite-gesture lifecycle. @public */
  public constructor() {
    effect((onCleanup) => {
      const source = this.source();
      const custom = this.identity().image;
      const animated = this.animated();
      this.sprite.set(null);
      this.unavailable.set(false);
      if (custom || !animated) return;
      let active = true;
      void this._assets.load(source.replace(/\.png$/u, '-v2.png')).then(
        (sprite) => {
          if (active) this.sprite.set(sprite);
        },
        () => {
          if (active) this.unavailable.set(true);
        },
      );
      onCleanup(() => {
        active = false;
      });
    });
    effect((onCleanup) => {
      const browser = this._document.defaultView;
      if (!browser) return;
      const query = browser.matchMedia('(prefers-reduced-motion: reduce)');
      const motion = (): void => {
        this.reducedMotion.set(query.matches);
      };
      const visibility = (): void => {
        this._documentVisible.set(!this._document.hidden);
      };
      motion();
      visibility();
      query.addEventListener('change', motion);
      this._document.addEventListener('visibilitychange', visibility);
      onCleanup(() => {
        query.removeEventListener('change', motion);
        this._document.removeEventListener('visibilitychange', visibility);
      });
    });
    effect((onCleanup) => {
      if (!this.sprite() && !this._greeting()) return;
      const pose = this.pose();
      const animation = agentSpriteAnimation(pose, this.reducedMotion(), this.stationary());
      const browser = this._document.defaultView;
      const greeting = this._greeting();
      let index = 0;
      let timer: number | undefined;
      this._frame.set(animation.frames[0]!);
      const advance = (): void => {
        timer = browser?.setTimeout(() => {
          const next = index + 1;
          if (
            pose === 'jumping' &&
            this.state() === 'completed' &&
            next === animation.loopStartIndex
          ) {
            this._celebrated.set(true);
            return;
          }
          if (greeting && next === animation.loopStartIndex) {
            this._greeting.set(false);
            return;
          }
          if (next >= animation.frames.length) {
            if (animation.loopStartIndex === null) return;
            index = animation.loopStartIndex;
          } else index = next;
          this._frame.set(animation.frames[index]!);
          advance();
        }, animation.frames[index]!.frameDurationMs);
      };
      if (animation.frames.length > 1) advance();
      onCleanup(() => {
        if (timer !== undefined) browser?.clearTimeout(timer);
      });
    });
    effect(() => {
      if (!this._resting() || !this.interactive() || this.reducedMotion())
        this._greeting.set(false);
    });
    effect(() => {
      const work = this.work().find((item) => item.state === 'completed');
      const key =
        this.state() === 'completed'
          ? `${this.agentId()}:${work?.executionId ?? work?.workItemId ?? ''}:${work?.updatedAt ?? ''}`
          : '';
      if (key !== this._completionKey) {
        this._completionKey = key;
        this._celebrated.set(false);
      }
    });
  }

  // #endregion

  // #region Methods

  /** A bounded greeting changes only the pose, never the execution state. @public */
  public greet(): void {
    if (this.interactive() && this._resting() && !this.stationary()) this._greeting.set(true);
  }

  /** Stops CSS movement when the actor leaves the visible surface. @public */
  public ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      this.visible.set(entry?.isIntersecting ?? false),
    );
    observer.observe(this._element.nativeElement);
    this._destroy.onDestroy(() => observer.disconnect());
  }

  // #endregion
}
