// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { convertToParamMap, type ParamMap } from '@angular/router';
import { SettingsHostSession, type ISettingsRouteContext } from '@symphony/frontend-setting';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeSetupSettingsRoute } from './initializeSetupSettingsRoute';

// #endregion

function arrange(query: Record<string, string>) {
  const parameters = signal<ParamMap>(convertToParamMap(query));
  const openEditor = vi.fn();
  const context: ISettingsRouteContext = {
    parameters,
    session: new SettingsHostSession(),
    openEditor,
  };
  runInInjectionContext(TestBed.inject(Injector), () => initializeSetupSettingsRoute(context));
  TestBed.tick();
  return { parameters, openEditor };
}

describe('initializeSetupSettingsRoute', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('opens the setup sheet once for ?sheet=setup with its workspace', () => {
    // arrange
    const { parameters, openEditor } = arrange({ sheet: 'setup', workspace: 'flamox' });

    // act
    parameters.set(convertToParamMap({ sheet: 'setup', workspace: 'flamox' }));
    TestBed.tick();

    // assert
    expect(openEditor).toHaveBeenCalledExactlyOnceWith({ kind: 'setup', workspaceId: 'flamox' });
  });

  it('ignores other Settings locations and opens again after leaving the sheet location', () => {
    // arrange
    const { parameters, openEditor } = arrange({ section: 'system' });

    // act
    parameters.set(convertToParamMap({ sheet: 'setup' }));
    TestBed.tick();
    parameters.set(convertToParamMap({ section: 'workspaces' }));
    TestBed.tick();
    parameters.set(convertToParamMap({ sheet: 'setup' }));
    TestBed.tick();

    // assert
    expect(openEditor).toHaveBeenCalledTimes(2);
    expect(openEditor).toHaveBeenLastCalledWith({ kind: 'setup' });
  });
});
