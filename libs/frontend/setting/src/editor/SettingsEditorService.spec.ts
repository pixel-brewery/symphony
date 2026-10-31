// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { ApplicationRef, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DrawerService, type ICancel } from '@pixel-brewery/mosaik-elements-angular';
import { Subject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ISettingsEditorDefinition } from './ISettingsEditorDefinition';
import type { ISettingsEditorResult } from './ISettingsEditorResult';
import { SettingsEditorRegistry } from './SettingsEditorRegistry';
import { SettingsEditorService } from './SettingsEditorService';

// #endregion

class FirstEditor {}
class FollowupEditor {}
function arrange(editors: readonly ISettingsEditorDefinition[]) {
  const closed = new Subject<ICancel<ISettingsEditorResult>>();
  const requestAttention = vi.fn();
  const show = vi.fn(() => ({ closed: closed.asObservable(), requestAttention }));
  const isShown = vi.fn(() => true);
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  TestBed.configureTestingModule({
    providers: [
      SettingsEditorService,
      { provide: SettingsEditorRegistry, useValue: new SettingsEditorRegistry(editors) },
      { provide: DrawerService, useValue: { show, isShown } },
    ],
  });
  const application = TestBed.inject(ApplicationRef);
  const tick = vi.spyOn(application, 'tick').mockImplementation(() => undefined);
  return {
    service: TestBed.inject(SettingsEditorService),
    closed,
    show,
    requestAttention,
    frames,
    tick,
  };
}

describe('SettingsEditorService', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('coalesces concurrent lazy openings and draws attention to the existing active editor', async () => {
    // arrange
    let finish: (component: Type<unknown>) => void = () => {
      throw new Error('Editor load was not started.');
    };
    const loadComponent = vi.fn(
      () =>
        new Promise<Type<unknown>>((resolve) => {
          finish = resolve;
        }),
    );
    const { service, show, requestAttention } = arrange([
      { id: 'first', kind: 'first', isRequest: () => true, loadComponent },
    ]);

    // act
    const first = service.open({ kind: 'first' });
    await service.open({ kind: 'first' });
    finish(FirstEditor);
    await first;
    await service.open({ kind: 'first' });

    // assert
    expect(loadComponent).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledOnce();
    expect(requestAttention).toHaveBeenCalledOnce();
  });

  it('opens a validated follow-up after close and applies its contributed navigation metadata', async () => {
    // arrange
    const { service, show, closed, frames, tick } = arrange([
      { id: 'first', kind: 'first', isRequest: () => true, loadComponent: async () => FirstEditor },
      {
        id: 'followup',
        kind: 'followup',
        workspaceSection: 'services',
        isRequest: (request) => request.workspaceId === 'workspace-a',
        loadComponent: async () => FollowupEditor,
      },
    ]);
    const onSection = vi.fn();
    await service.open({ kind: 'first' }, onSection);

    // act
    frames.shift()?.(0);
    frames.shift()?.(0);
    closed.next({
      reason: 'positive',
      result: { next: { kind: 'followup', workspaceId: 'workspace-a' } },
    });
    await vi.waitFor(() => expect(show).toHaveBeenCalledTimes(2));

    // assert
    expect(tick).toHaveBeenCalledTimes(2);
    expect(onSection).toHaveBeenCalledExactlyOnceWith('workspace-a', 'services');
    expect(show).toHaveBeenLastCalledWith(FollowupEditor, {
      data: { kind: 'followup', workspaceId: 'workspace-a' },
    });
  });

  it('releases the opening guard after a component load failure so another editor can open', async () => {
    // arrange
    const { service, show } = arrange([
      {
        id: 'failed',
        kind: 'failed',
        isRequest: () => true,
        loadComponent: async () => {
          throw new Error('Load failed');
        },
      },
      {
        id: 'available',
        kind: 'available',
        isRequest: () => true,
        loadComponent: async () => FirstEditor,
      },
    ]);
    await expect(service.open({ kind: 'failed' })).rejects.toThrow('Load failed');

    // act
    await service.open({ kind: 'available' });

    // assert
    expect(show).toHaveBeenCalledExactlyOnceWith(FirstEditor, { data: { kind: 'available' } });
  });
});
