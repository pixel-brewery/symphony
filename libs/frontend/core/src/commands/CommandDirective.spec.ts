// @vitest-environment jsdom

// #region Imports

import { DestroyRef, ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Command } from './Command';
import { CommandDirective } from './CommandDirective';

// #endregion

describe('CommandDirective', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());

  it('routes the host event through the bound command', () => {
    // arrange
    const button = document.createElement('button');
    const execute = vi.fn<(parameter: unknown) => void>();
    const destroyRef = {
      destroyed: false,
      onDestroy: vi.fn(),
    } as unknown as DestroyRef;
    const directive = TestBed.runInInjectionContext(
      () => new CommandDirective(new ElementRef(button), destroyRef),
    );
    directive.command.set({ click: new Command(execute) });
    TestBed.flushEffects();

    // act
    button.click();

    // assert
    expect(execute).toHaveBeenCalledOnce();
    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent);
  });

  it('accepts a command with a concrete parameter type', () => {
    // arrange
    const button = document.createElement('button');
    const execute = vi.fn<(parameter: string) => void>();
    const destroyRef = {
      destroyed: false,
      onDestroy: vi.fn(),
    } as unknown as DestroyRef;
    const directive = TestBed.runInInjectionContext(
      () => new CommandDirective(new ElementRef(button), destroyRef),
    );
    directive.command.set({ selected: new Command<string>(execute) });
    TestBed.flushEffects();

    // act
    button.dispatchEvent(new CustomEvent<string>('selected', { detail: 'workspace-1' }));

    // assert
    expect(execute).toHaveBeenCalledWith('workspace-1');
  });
});
