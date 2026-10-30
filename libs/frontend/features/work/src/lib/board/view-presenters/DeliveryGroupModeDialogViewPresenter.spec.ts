// @vitest-environment jsdom
// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DIALOG_REF } from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DeliveryGroupModeDialogViewPresenter } from './DeliveryGroupModeDialogViewPresenter';

vi.mock('@pixel-brewery/mosaik-elements-angular', async () => {
  const { InjectionToken } = await import('@angular/core');
  return {
    Cancel: { negative: () => undefined, positive: (value: unknown) => value },
    DIALOG_REF: new InjectionToken('DIALOG_REF'),
  };
});

vi.mock('@symphony/frontend-core', () => ({
  ViewPresenter: class ViewPresenterStub {},
}));

// #endregion

describe('DeliveryGroupModeDialogViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());

  it('takes the grouping path that the radio group reports', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        DeliveryGroupModeDialogViewPresenter,
        { provide: DIALOG_REF, useValue: { close: vi.fn() } },
      ],
    });
    const presenter = TestBed.inject(DeliveryGroupModeDialogViewPresenter);

    // act
    presenter.changeMode({ value: 'analyzer' });

    // assert
    expect(presenter.mode()).toBe('analyzer');
  });
});
