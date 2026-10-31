// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { VIEW_PRESENTER } from '@symphony/frontend-core';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CommandPaletteView } from './CommandPaletteView';

// #endregion

describe('CommandPaletteView', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it.each([
    ['ArrowDown', 'moveSelectionCommand', 'next'],
    ['ArrowUp', 'moveSelectionCommand', 'previous'],
    ['Enter', 'openCommand', undefined],
    ['Escape', 'closeCommand', undefined],
  ] as const)('turns %s into the presenter’s %s', (key, command, parameter) => {
    // arrange
    const { view, presenter } = setup();
    const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
    const stopPropagation = vi.spyOn(event, 'stopPropagation');

    // act
    view.onKeydown(event);

    // assert
    expect(event.defaultPrevented).toBe(true);
    expect(presenter[command].execute).toHaveBeenCalledExactlyOnceWith(
      ...(parameter ? [parameter] : []),
    );
    expect(stopPropagation).toHaveBeenCalledTimes(key === 'Escape' ? 1 : 0);
  });

  it('leaves typing to the search field and keeps Tab inside the palette', () => {
    // arrange
    const { view, presenter } = setup();
    const typing = new KeyboardEvent('keydown', { key: 'r', cancelable: true });
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });

    // act
    view.onKeydown(typing);
    view.onKeydown(tab);

    // assert
    expect(typing.defaultPrevented).toBe(false);
    expect(tab.defaultPrevented).toBe(true);
    expect(presenter.moveSelectionCommand.execute).not.toHaveBeenCalled();
    expect(presenter.openCommand.execute).not.toHaveBeenCalled();
    expect(presenter.closeCommand.execute).not.toHaveBeenCalled();
  });

  it('returns focus to where it was, but not to the toolbar field that opens the palette', () => {
    // arrange
    const card = document.createElement('button');
    const launcher = document.createElement('button');
    launcher.setAttribute('aria-haspopup', 'dialog');
    document.body.append(card, launcher);
    card.focus();
    const first = setup();
    launcher.focus();

    // act
    first.fixture.destroy();
    const restored = document.activeElement;
    launcher.focus();
    const second = setup();
    card.focus();
    second.fixture.destroy();

    // assert
    expect(restored).toBe(card);
    expect(document.activeElement).toBe(card);
  });
});

function setup() {
  const presenter = {
    initialize: vi.fn(),
    dispose: vi.fn(),
    selectedIndex: signal(0),
    moveSelectionCommand: { execute: vi.fn() },
    openCommand: { execute: vi.fn() },
    closeCommand: { execute: vi.fn() },
  };
  TestBed.resetTestingModule();
  TestBed.overrideComponent(CommandPaletteView, {
    set: {
      template: '',
      templateUrl: undefined,
      styles: [],
      styleUrl: undefined,
      imports: [],
      providers: [{ provide: VIEW_PRESENTER, useValue: presenter }],
    },
  });
  const fixture = TestBed.createComponent(CommandPaletteView);
  fixture.detectChanges();
  const view = fixture.componentInstance as unknown as { onKeydown(event: KeyboardEvent): void };
  return { fixture, view, presenter };
}
