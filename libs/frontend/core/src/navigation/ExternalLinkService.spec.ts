// @vitest-environment jsdom

// #region Imports

import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ExternalLinkService } from './ExternalLinkService';

// #endregion

describe('ExternalLinkService', () => {
  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  afterAll(() => TestBed.resetTestEnvironment());

  it('opens external URLs in a new, isolated browsing context', () => {
    // arrange
    const open = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: { open } } }],
    });

    const service = TestBed.inject(ExternalLinkService);
    service.open('https://github.com/example/repo/actions/runs/1');
    // act
    service.open(undefined);

    // assert
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      'https://github.com/example/repo/actions/runs/1',
      '_blank',
      'noopener,noreferrer',
    );
  });
});
