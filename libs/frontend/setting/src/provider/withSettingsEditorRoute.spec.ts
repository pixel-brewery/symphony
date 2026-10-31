// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { convertToParamMap, DefaultUrlSerializer, Router } from '@angular/router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SettingsHostSession } from '../context/SettingsHostSession';
import { SETTINGS_ROUTE_INITIALIZERS } from '../routing/SettingsRouteInitializersToken';
import { withSettingsEditorRoute } from './withSettingsEditorRoute';

// #endregion

function arrange(known: readonly string[]) {
  const serializer = new DefaultUrlSerializer();
  const parameters = signal(
    convertToParamMap({ workspace: 'personal', section: 'services', account: 'codex' }),
  );
  const router = {
    url: '/settings?workspace=personal&section=services&account=codex',
    parseUrl: (url: string) => serializer.parse(url),
    navigateByUrl: vi.fn(async () => true),
  };
  const openEditor = vi.fn();
  const feature = withSettingsEditorRoute({
    id: 'ai-account-route',
    section: 'services',
    parameter: 'account',
    resolve: () => (value, workspaceId) =>
      known.includes(value) && workspaceId
        ? { kind: 'ai-account', workspaceId, connectionId: value }
        : undefined,
  });
  TestBed.configureTestingModule({
    providers: [...feature.provide(), { provide: Router, useValue: router }],
  });
  const [initializer] = TestBed.inject(SETTINGS_ROUTE_INITIALIZERS);
  TestBed.runInInjectionContext(() =>
    initializer!.initialize({ parameters, session: new SettingsHostSession(), openEditor }),
  );
  return { parameters, router, openEditor };
}

describe('withSettingsEditorRoute', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('opens the editor once, removes the key and opens it again for a repeated request', () => {
    // arrange
    const { parameters, router, openEditor } = arrange(['codex']);
    TestBed.tick();
    parameters.set(convertToParamMap({ workspace: 'personal', section: 'services' }));
    TestBed.tick();

    // act
    parameters.set(
      convertToParamMap({ workspace: 'personal', section: 'services', account: 'codex' }),
    );
    TestBed.tick();

    // assert
    expect(openEditor).toHaveBeenCalledTimes(2);
    expect(openEditor).toHaveBeenLastCalledWith({
      kind: 'ai-account',
      workspaceId: 'personal',
      connectionId: 'codex',
    });
    const consumed = router.navigateByUrl.mock.calls[0] as unknown as [
      { queryParams: Record<string, string> },
      { replaceUrl: boolean },
    ];
    expect(consumed[0].queryParams).toEqual({ workspace: 'personal', section: 'services' });
    expect(consumed[1]).toEqual({ replaceUrl: true });
  });

  it('ignores the key in another section and an item the resolver does not know', () => {
    // arrange
    const { parameters, openEditor } = arrange([]);

    // act
    TestBed.tick();
    parameters.set(convertToParamMap({ workspace: 'personal', section: 'team', account: 'codex' }));
    TestBed.tick();

    // assert
    expect(openEditor).not.toHaveBeenCalled();
  });
});
