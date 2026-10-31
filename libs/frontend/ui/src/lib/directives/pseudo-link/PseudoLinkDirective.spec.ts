// @vitest-environment jsdom

// #region Imports

import { ElementRef, Renderer2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PseudoLinkDirective } from './PseudoLinkDirective';

// #endregion

describe('PseudoLinkDirective', () => {
  let anchor: HTMLAnchorElement;
  let directive: PseudoLinkDirective;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  afterAll(() => TestBed.resetTestEnvironment());

  beforeEach(() => {
    TestBed.resetTestingModule();
    anchor = document.createElement('a');
    TestBed.configureTestingModule({
      providers: [
        PseudoLinkDirective,
        { provide: ElementRef, useValue: new ElementRef(anchor) },
        {
          provide: Renderer2,
          useValue: {
            setStyle: (element: HTMLElement, name: string, value: string) => {
              element.style.setProperty(name, value);
            },
          },
        },
      ],
    });
    directive = TestBed.inject(PseudoLinkDirective);
  });

  it('neutralises the user-agent link styling while keeping the anchor a link', () => {
    // arrange
    anchor.href = '#/tickets/1';

    // act
    directive.ngOnInit();

    // assert
    expect(anchor.style.color).toBe('inherit');
    expect(anchor.style.textDecoration).toBe('none');
    expect(anchor.style.cursor).toBe('pointer');
    expect(anchor.getAttribute('href')).toBe('#/tickets/1');
  });
});
