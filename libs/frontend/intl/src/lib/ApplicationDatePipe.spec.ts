// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ApplicationDatePipe } from './ApplicationDatePipe';
import type { ApplicationLanguage } from './ApplicationLanguage';
import { ApplicationLocalization } from './ApplicationLocalization';

// #endregion

describe('ApplicationDatePipe', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('changes month names live while retaining the explicit instant timezone and format', () => {
    // arrange
    const language = signal<ApplicationLanguage>('en');
    TestBed.configureTestingModule({
      providers: [{ provide: ApplicationLocalization, useValue: { language } }],
    });
    const pipe = TestBed.runInInjectionContext(() => new ApplicationDatePipe());
    const instant = '2026-03-04T12:30:00Z';
    const english = pipe.transform(instant, 'MMMM d, y HH:mm', '+0000');

    // act
    language.set('de');
    const german = pipe.transform(instant, 'MMMM d, y HH:mm', '+0000');

    // assert
    expect(english).toBe('March 4, 2026 12:30');
    expect(german).toBe('März 4, 2026 12:30');
  });

  it('retains an explicit locale override and absent date semantics', () => {
    // arrange
    const language = signal<ApplicationLanguage>('de');
    TestBed.configureTestingModule({
      providers: [{ provide: ApplicationLocalization, useValue: { language } }],
    });
    const pipe = TestBed.runInInjectionContext(() => new ApplicationDatePipe());

    // act
    const formatted = pipe.transform('2026-03-04T12:30:00Z', 'MMMM', '+0000', 'en-US');
    const absent = pipe.transform(null);

    // assert
    expect(formatted).toBe('March');
    expect(absent).toBeNull();
  });
});
