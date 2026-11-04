// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ApplicationDecimalPipe } from './ApplicationDecimalPipe';
import type { ApplicationLanguage } from './ApplicationLanguage';
import { ApplicationLocalization } from './ApplicationLocalization';

// #endregion

describe('ApplicationDecimalPipe', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('updates separators live without changing the requested decimal precision', () => {
    // arrange
    const language = signal<ApplicationLanguage>('en');
    TestBed.configureTestingModule({
      providers: [{ provide: ApplicationLocalization, useValue: { language } }],
    });
    const pipe = TestBed.runInInjectionContext(() => new ApplicationDecimalPipe());
    const english = pipe.transform(1234.5, '1.2-2');

    // act
    language.set('de');
    const german = pipe.transform(1234.5, '1.2-2');

    // assert
    expect(english).toBe('1,234.50');
    expect(german).toBe('1.234,50');
  });
});
