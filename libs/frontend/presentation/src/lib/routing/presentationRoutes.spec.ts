// @vitest-environment jsdom

// #region Imports
import '@angular/compiler';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter, Router, RouterOutlet, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { presentationRoutes } from './presentationRoutes';
// #endregion

@Component({ template: '' })
class IncludedPage {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class PresenterLayout {}

function routesFor(children: Routes): Routes {
  return presentationRoutes(children).map((route) =>
    route.path === 'main' ? { ...route, loadComponent: async () => PresenterLayout } : route,
  );
}

describe('presentationRoutes', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('navigates root, main and unknown paths to an actually included page when Home is omitted', async () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [provideRouter(routesFor([{ path: 'board', component: IncludedPage }]))],
    });
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    // act / assert
    for (const path of ['/', '/main', '/missing', '/main/orbit']) {
      await harness.navigateByUrl(path);
      expect(router.url).toBe('/main/board');
    }
  });

  it('ignores compatibility redirects when selecting a valid default and rejects a composition without a page', async () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          routesFor([
            { path: 'former', redirectTo: 'skills' },
            { path: 'skills', component: IncludedPage },
          ]),
        ),
      ],
    });
    const harness = await RouterTestingHarness.create();
    // act
    await harness.navigateByUrl('/');
    // assert
    expect(TestBed.inject(Router).url).toBe('/main/skills');
    expect(() => presentationRoutes([])).toThrow('at least one feature page');
  });
});
