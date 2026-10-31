// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SettingsAlertSheetViewPresenter } from './SettingsAlertSheetViewPresenter';

// #endregion

function arrange() {
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      SettingsAlertSheetViewPresenter,
      { provide: DIALOG_REF, useValue: { close } },
      {
        provide: DIALOG_REF_DATA,
        useValue: { id: 'trash', header: 'Move to trash?', message: 'x', confirmLabel: 'Move' },
      },
    ],
  });
  return { close, presenter: TestBed.inject(SettingsAlertSheetViewPresenter) };
}

describe('SettingsAlertSheetViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('answers positively with the primary button and negatively with the secondary one', () => {
    // arrange
    const { close, presenter } = arrange();

    // act
    presenter.confirmCommand.execute();
    presenter.cancelCommand.execute();

    // assert
    expect(presenter.alert.header).toBe('Move to trash?');
    expect(close.mock.calls.map(([result]) => result.reason)).toEqual(['positive', 'negative']);
    expect(close.mock.calls[0]?.[0].result).toBe(true);
  });
});
