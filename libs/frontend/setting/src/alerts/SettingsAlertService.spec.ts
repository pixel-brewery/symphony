// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DialogService, type ICancel } from '@pixel-brewery/mosaik-elements-angular';
import { Subject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SettingsAlertSheetView } from '../views/SettingsAlertSheetView';
import { SettingsAlertService } from './SettingsAlertService';

// #endregion

function arrange() {
  const closed = new Subject<ICancel<boolean>>();
  const setAttribute = vi.fn();
  const show = vi.fn(() => ({
    closed: closed.asObservable(),
    element: { setAttribute },
  }));
  TestBed.configureTestingModule({
    providers: [{ provide: DialogService, useValue: { show } }],
  });
  return { service: TestBed.inject(SettingsAlertService), closed, show };
}

const removeMachine = {
  id: 'remove-machine',
  header: 'Remove this machine?',
  message: 'symphony-runner-legacy and its disk will be deleted.',
  confirmLabel: 'Remove machine',
  cancelLabel: 'Keep machine',
  destructive: true,
} as const;

describe('SettingsAlertService', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shows the alert as a sheet and resolves the primary answer', async () => {
    // arrange
    const { service, closed, show } = arrange();

    // act
    const answer = service.confirm(removeMachine);
    await vi.waitFor(() => expect(show).toHaveBeenCalledOnce());
    closed.next({ reason: 'positive', result: true });

    // assert
    await expect(answer).resolves.toBe(true);
    expect(show).toHaveBeenCalledWith(
      SettingsAlertSheetView,
      expect.objectContaining({ data: removeMachine, pressEscapeToClose: true }),
    );
  });

  it('resolves false when the sheet closes with the secondary button or Escape', async () => {
    // arrange
    const { service, closed, show } = arrange();

    // act
    const answer = service.confirm(removeMachine);
    await vi.waitFor(() => expect(show).toHaveBeenCalledOnce());
    closed.next({ reason: 'negative' });

    // assert
    await expect(answer).resolves.toBe(false);
  });
});
