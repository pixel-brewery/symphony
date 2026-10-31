// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { IWidgetDefinition } from '../models/IWidgetDefinition';
import { SmallFirstWidgetPlacements } from '../models/SmallFirstWidgetPlacements';
import { provideWidget } from './provideWidget';
import { WIDGET_VIEW_SLOT } from './WidgetViewSlot';
import { withWidgetItems } from './withWidgetItems';

// #endregion

describe('provideWidget', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('uses the native Mosaik registry to order included feature configuration without copying its data', () => {
    // arrange
    const later = definition('later', 20);
    const earlier = definition('earlier', 10);
    TestBed.configureTestingModule({
      providers: [
        provideWidget(withWidgetItems({ id: 'included', widgets: [() => later, () => earlier] })),
      ],
    });

    // act
    const views = TestBed.inject(ViewSlotRegistry).getViews(WIDGET_VIEW_SLOT)();

    // assert
    expect(views.map((view) => view.id)).toEqual(['earlier', 'later']);
    expect(views[0]).toEqual(
      expect.objectContaining({ tiles: earlier.tiles, placements: earlier.placements }),
    );
  });

  it('supports no widget contributions and rejects duplicate native view identities', () => {
    // arrange
    TestBed.configureTestingModule({ providers: [provideWidget()] });
    const empty = TestBed.inject(ViewSlotRegistry).getViews(WIDGET_VIEW_SLOT)();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWidget(
          withWidgetItems({
            id: 'ambiguous',
            widgets: [() => definition('duplicate', 10), () => definition('duplicate', 20)],
          }),
        ),
      ],
    });

    // act
    const resolve = () => TestBed.inject(ViewSlotRegistry).getViews(WIDGET_VIEW_SLOT)();

    // assert
    expect(empty).toEqual([]);
    expect(resolve).toThrow('Duplicate widget id');
  });
});

function definition(id: string, order: number): IWidgetDefinition {
  return {
    id,
    order,
    label: id,
    testId: id,
    tilesTestId: `${id}-tiles`,
    empty: '',
    tiles: signal([]),
    placements: SmallFirstWidgetPlacements,
  };
}
