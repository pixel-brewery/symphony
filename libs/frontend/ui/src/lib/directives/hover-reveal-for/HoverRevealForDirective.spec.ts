// @vitest-environment jsdom

// #region Imports

import { ElementRef, Renderer2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HoverRevealForDirective } from './HoverRevealForDirective';

// #endregion

describe('HoverRevealForDirective', () => {
  let action: HTMLButtonElement;
  let directive: HoverRevealForDirective;
  let outside: HTMLButtonElement;
  let target: HTMLDivElement;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  afterAll(() => TestBed.resetTestEnvironment());

  beforeEach(() => {
    TestBed.resetTestingModule();
    action = document.createElement('button');
    outside = document.createElement('button');
    target = document.createElement('div');
    target.append(action);

    TestBed.configureTestingModule({
      providers: [
        HoverRevealForDirective,
        { provide: ElementRef, useValue: new ElementRef(action) },
        {
          provide: Renderer2,
          useValue: {
            listen: (element: HTMLElement, name: string, listener: EventListener) => {
              element.addEventListener(name, listener);
              return () => element.removeEventListener(name, listener);
            },
            setStyle: (element: HTMLElement, name: string, value: string) => {
              element.style.setProperty(name, value);
            },
          },
        },
      ],
    });
    directive = TestBed.inject(HoverRevealForDirective);
    Object.defineProperty(directive, 'for', { value: () => target });
    directive.ngOnInit();
    directive.ngAfterViewInit();
  });

  it('keeps the contextual action focusable while hiding it at rest', () => {
    // assert
    expect(action.style.opacity).toBe('0');
    expect(action.style.pointerEvents).toBe('none');
    expect(action.tabIndex).toBe(0);
  });

  it('reveals and hides the action with pointer movement', () => {
    // act
    // arrange
    target.dispatchEvent(new MouseEvent('mouseenter'));
    // assert
    expect(action.style.opacity).toBe('1');
    expect(action.style.pointerEvents).toBe('auto');

    target.dispatchEvent(new MouseEvent('mouseleave'));
    expect(action.style.opacity).toBe('0');
    expect(action.style.pointerEvents).toBe('none');
  });

  it('stays revealed while focus moves within the target and hides after focus leaves', () => {
    // act
    // arrange
    action.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    // assert
    expect(action.style.opacity).toBe('1');

    action.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: target }));
    expect(action.style.opacity).toBe('1');

    target.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    expect(action.style.opacity).toBe('0');
    expect(action.style.pointerEvents).toBe('none');
  });
});
