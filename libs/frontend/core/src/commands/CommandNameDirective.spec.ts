// @vitest-environment jsdom

// #region Imports
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Command } from './Command';
import { CommandDirective } from './CommandDirective';
import { CommandNameDirective } from './CommandNameDirective';
import { CommandProxy } from './CommandProxy';
// #endregion

@Component({
  standalone: true,
  imports: [CommandDirective, CommandNameDirective],
  template: '<button [commandName]="{ click: \'workspace.refresh\' }">Refresh</button>',
})
class CommandNameDirectiveTestView {}

describe('CommandNameDirective', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());

  it('resolves a named command and binds it to the declared host event', () => {
    // arrange
    const execute = vi.fn();
    TestBed.inject(CommandProxy).registerNamed('workspace.refresh', new Command(execute));
    const fixture = TestBed.createComponent(CommandNameDirectiveTestView);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    // act
    button.click();

    // assert
    expect(execute).toHaveBeenCalledOnce();
  });
});
