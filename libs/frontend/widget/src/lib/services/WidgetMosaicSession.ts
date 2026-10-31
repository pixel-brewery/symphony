// #region Imports

import {
  computed,
  DestroyRef,
  Inject,
  inject,
  Injectable,
  signal,
  type Signal,
} from '@angular/core';
import { ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { QuickCreateManager } from '@symphony/frontend-quick-create';
import type { IWidgetCategory } from '../models/IWidgetCategory';
import type { IWidgetDefinition } from '../models/IWidgetDefinition';
import type { IWidgetTile } from '../models/IWidgetTile';
import type { IWidgetTilePlacement } from '../models/IWidgetTilePlacement';
import type { IWidgetTileSlot } from '../models/IWidgetTileSlot';
import { isWidgetDefinition } from '../models/isWidgetDefinition';
import { rotateWidgetTileOrder } from '../projections/rotateWidgetTileOrder';
import { WIDGET_VIEW_SLOT } from '../provider/WidgetViewSlot';

// #endregion

const WIDGET_TILE_SLOT_COUNT = 10;
const WIDGET_TILE_ROTATION_INTERVAL_MS = 5_000;

interface IWidgetTileRotation {
  readonly categoryId: string;
  readonly order: readonly string[];
  readonly remainingExits: Set<string>;
}

/**
 * Owns one mounted panorama's existing slot order, protected positions and animation handoff.
 *
 * @public
 */
@Injectable()
export class WidgetMosaicSession {
  // #region Fields

  private readonly _definitions: Signal<readonly IWidgetDefinition[]>;
  private readonly _quickCreate: Pick<QuickCreateManager, 'getItemForNavigation'>;
  private readonly _slotOrders = signal<Readonly<Record<string, readonly string[]>>>({});
  private readonly _exitingTileSlots = signal<ReadonlySet<string>>(new Set());
  private _rotationCategoryIndex = 0;
  private _pendingRotation: IWidgetTileRotation | undefined;

  // #endregion

  // #region Ctor

  /**
   * Connects native widget definitions and releases the existing timer with its owning host.
   *
   * @public
   */
  public constructor(
    @Inject(ViewSlotRegistry)
    registry: Pick<ViewSlotRegistry, 'getViews'> = inject(ViewSlotRegistry),
    @Inject(DestroyRef) destroyRef: DestroyRef = inject(DestroyRef),
    @Inject(QuickCreateManager)
    quickCreate: Pick<QuickCreateManager, 'getItemForNavigation'> = inject(QuickCreateManager),
  ) {
    const views = registry.getViews(WIDGET_VIEW_SLOT);
    this._definitions = computed(() => views().filter(isWidgetDefinition));
    this._quickCreate = quickCreate;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const rotationTimer = window.setInterval(
      () => this.rotateTiles(),
      WIDGET_TILE_ROTATION_INTERVAL_MS,
    );
    destroyRef.onDestroy(() => window.clearInterval(rotationTimer));
  }

  // #endregion

  // #region Properties

  /** Fixed mosaic slot protected by pointer hover. @public @readonly */
  public readonly hoveredTileSlot = signal<string | undefined>(undefined);
  /** Fixed mosaic slot protected by keyboard focus. @public @readonly */
  public readonly focusedTileSlot = signal<string | undefined>(undefined);
  /** The included feature categories with their current fixed-slot presentation. @public @readonly */
  public readonly categories = computed<readonly IWidgetCategory[]>(() =>
    this._definitions().map((definition) => {
      const tiles = definition.tiles();
      const action = this._quickCreate.getItemForNavigation(definition.id);
      return {
        id: definition.id,
        label: definition.label,
        testId: definition.testId,
        tilesTestId: definition.tilesTestId,
        slots: this.tileSlots(definition.id, tiles, definition.placements),
        isEmpty: tiles.length === 0,
        empty: definition.empty,
        ...(action ? { action } : {}),
      };
    }),
  );

  // #endregion

  // #region Methods

  private tileSlots(
    categoryId: string,
    tiles: readonly IWidgetTile[],
    placements: readonly IWidgetTilePlacement[],
  ): IWidgetTileSlot[] {
    const orderedTiles = new Map(tiles.map((tile) => [tile.id, tile]));
    const order = this.resolvedTileOrder(categoryId, tiles);
    return [...Array(WIDGET_TILE_SLOT_COUNT).keys()].map((index) => {
      const tile = orderedTiles.get(order[index] ?? '');
      const placement = placements[index]!;
      const slotKey = `${categoryId}:${index}`;
      const isExiting = this._exitingTileSlots().has(slotKey);
      return {
        index,
        ...placement,
        animationKey: `${categoryId}:${index}:${tile?.id ?? 'empty'}:${isExiting ? 'exit' : 'enter'}`,
        isExiting,
        animation: isExiting
          ? { name: 'homeTileExit', onFinished: () => this.completeTileExit(slotKey) }
          : { name: 'homeTileEnter' },
        ...(tile ? { tile } : {}),
        showsEmptyFrame: index < 5,
      };
    });
  }

  private resolvedTileOrder(categoryId: string, tiles: readonly IWidgetTile[]): readonly string[] {
    const tileIds = new Set(tiles.map((tile) => tile.id));
    const retained = (this._slotOrders()[categoryId] ?? []).filter((id) => tileIds.has(id));
    const retainedIds = new Set(retained);
    return [...retained, ...tiles.map((tile) => tile.id).filter((id) => !retainedIds.has(id))];
  }

  private rotateTiles(): void {
    if (this._pendingRotation) return;

    const definitions = this._definitions();
    for (let offset = 0; offset < definitions.length; offset += 1) {
      const categoryIndex = (this._rotationCategoryIndex + offset) % definitions.length;
      const definition = definitions[categoryIndex]!;
      const categoryId = definition.id;
      const order = this.resolvedTileOrder(categoryId, definition.tiles());
      const hoveredTileSlot = this.hoveredTileSlot();
      const focusedTileSlot = this.focusedTileSlot();
      const hoveredSlots = new Set(
        [...Array(Math.min(order.length, WIDGET_TILE_SLOT_COUNT)).keys()].filter((index) =>
          [hoveredTileSlot, focusedTileSlot].includes(`${categoryId}:${index}`),
        ),
      );
      const rotated = rotateWidgetTileOrder(order, hoveredSlots);
      if (rotated === order) continue;

      const exitingTileSlots = new Set(
        [...Array(Math.min(order.length, WIDGET_TILE_SLOT_COUNT)).keys()]
          .filter((index) => order[index] !== rotated[index])
          .map((index) => `${categoryId}:${index}`),
      );
      this._pendingRotation = {
        categoryId,
        order: rotated,
        remainingExits: new Set(exitingTileSlots),
      };
      this._exitingTileSlots.set(exitingTileSlots);
      this._rotationCategoryIndex = (categoryIndex + 1) % definitions.length;
      return;
    }
  }

  private completeTileExit(slotKey: string): void {
    const pendingRotation = this._pendingRotation;
    if (!pendingRotation) return;

    pendingRotation.remainingExits.delete(slotKey);
    if (pendingRotation.remainingExits.size) return;

    this._slotOrders.update((orders) => ({
      ...orders,
      [pendingRotation.categoryId]: pendingRotation.order,
    }));
    this._pendingRotation = undefined;
    this._exitingTileSlots.set(new Set());
  }

  // #endregion
}
