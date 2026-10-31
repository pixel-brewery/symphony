// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DIALOG_REF, DIALOG_REF_DATA, IconRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WorkspaceAvatarDialogViewPresenter } from './WorkspaceAvatarDialogViewPresenter';

// #endregion

function arrange() {
  const workspace = { shortCode: 'OLD', color: '#123456' };
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      WorkspaceAvatarDialogViewPresenter,
      { provide: DIALOG_REF_DATA, useValue: workspace },
      { provide: DIALOG_REF, useValue: { close } },
      { provide: IconRegistry, useValue: { resolve: () => ({}) } },
    ],
  });
  return { presenter: TestBed.inject(WorkspaceAvatarDialogViewPresenter), close, workspace };
}

describe('WorkspaceAvatarDialogViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('confirms a normalized monogram and color without mutating the supplied workspace', () => {
    // arrange
    const { presenter, close, workspace } = arrange();
    presenter.setMonogramCommand.execute(' é7 ');
    presenter.selectColorCommand.execute('#aabbcc');

    // act
    presenter.applyCommand.execute();

    // assert
    expect(close).toHaveBeenCalledOnce();
    expect(close.mock.calls[0]?.[0].reason).toBe('positive');
    expect(close.mock.calls[0]?.[0].result).toEqual({
      avatar: { kind: 'monogram', value: 'É7' },
      color: '#AABBCC',
    });
    expect(workspace).toEqual({ shortCode: 'OLD', color: '#123456' });
  });

  it('rejects invalid glyphs before confirmation and accepts one joined emoji', () => {
    // arrange
    const { presenter, close } = arrange();
    presenter.setMonogramCommand.execute('ABC');

    // act
    presenter.applyCommand.execute();

    // assert
    expect(presenter.error()).toBe('monogram');
    expect(close).not.toHaveBeenCalled();

    // act
    presenter.selectKindCommand.execute('emoji');
    presenter.selectEmojiCommand.execute('🚀🌱');
    presenter.applyCommand.execute();

    // assert
    expect(presenter.error()).toBe('emoji');
    expect(close).not.toHaveBeenCalled();

    // act
    presenter.selectEmojiCommand.execute(' 👩🏽‍💻 ');
    presenter.applyCommand.execute();

    // assert
    expect(close).toHaveBeenCalledOnce();
    expect(close.mock.calls[0]?.[0].reason).toBe('positive');
    expect(close.mock.calls[0]?.[0].result).toEqual({
      avatar: { kind: 'emoji', value: '👩🏽‍💻' },
      color: '#123456',
    });
  });

  it('retains tab drafts but returns no selection when cancelled', () => {
    // arrange
    const { presenter, close, workspace } = arrange();
    presenter.setMonogramCommand.execute('FX');
    presenter.selectKindCommand.execute('emoji');
    presenter.selectEmojiCommand.execute('🇩🇪');
    presenter.selectKindCommand.execute('monogram');

    // act
    presenter.closeCommand.execute();

    // assert
    expect(presenter.monogram()).toBe('FX');
    expect(presenter.emoji()).toBe('🇩🇪');
    expect(close).toHaveBeenCalledOnce();
    expect(close.mock.calls[0]?.[0].reason).toBe('negative');
    expect(close.mock.calls[0]?.[0].result).toBeUndefined();
    expect(workspace).toEqual({ shortCode: 'OLD', color: '#123456' });
  });

  it('does not accept unavailable icons or non RGB colors from an event', () => {
    // arrange
    const { presenter, close } = arrange();
    presenter.selectKindCommand.execute('icon');
    presenter.selectIconCommand.execute('unregistered-workspace-icon');

    // act
    presenter.selectColorCommand.execute('#ffffff00');
    presenter.selectColorCommand.execute({ color: '#abcdef' });
    presenter.applyCommand.execute();

    // assert
    expect(presenter.color()).toBe('#123456');
    expect(presenter.error()).toBe('icon');
    expect(close).not.toHaveBeenCalled();
  });
});
