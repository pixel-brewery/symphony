// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { Component, inject, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  provideViewSlot,
  VIEW_SLOT_CONTEXT,
  ViewSlotOutletComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { provideSettings } from '../provider/provideSettings';
import type { ISettingsWorkspaceSelection } from './ISettingsWorkspaceSelection';
import { SETTINGS_WORKSPACE_CONTEXT } from './SettingsWorkspaceContextToken';
import { SettingsWorkspaceContextDirective } from './SettingsWorkspaceContextDirective';

// #endregion

@Component({
  selector: 'symphony-settings-context-test-card',
  template: '{{ context.workspaceId() }}',
})
class SettingsContextCard {
  // #region Fields

  public readonly context = inject(SETTINGS_WORKSPACE_CONTEXT);
  public readonly nativeContext = inject(VIEW_SLOT_CONTEXT);

  // #endregion
}

@Component({
  selector: 'symphony-settings-context-test-host',
  imports: [ViewSlotOutletComponent, SettingsWorkspaceContextDirective],
  template: `
    <mosaik-view-slot-outlet
      [slot]="slot"
      [symphonySettingsWorkspace]="workspaceId()"
      [symphonySettingsSection]="sectionId()"
    />
  `,
})
class SettingsContextHost {
  // #region Fields

  public readonly slot = SettingsViewSlot.Workspace;
  public readonly workspaceId = signal<string | null>('workspace-a');
  public readonly sectionId = signal<string | null>('team');

  // #endregion
}

async function render(fixture: ComponentFixture<SettingsContextHost>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function card(fixture: ComponentFixture<SettingsContextHost>): SettingsContextCard | undefined {
  return fixture.debugElement
    .query(By.directive(SettingsContextCard))
    ?.injector.get(SettingsContextCard);
}

function configureWithCard(): ComponentFixture<SettingsContextHost> {
  TestBed.configureTestingModule({
    imports: [SettingsContextHost],
    providers: [
      provideSettings(),
      provideViewSlot<ISettingsWorkspaceSelection>(SettingsViewSlot.Workspace, [
        {
          id: 'team-settings',
          component: SettingsContextCard,
          canActivate: (selection) => selection?.sectionId === 'team',
        },
      ]),
    ],
  });
  return TestBed.createComponent(SettingsContextHost);
}

describe('SettingsWorkspaceContextDirective', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('updates workspace context and native activation selection without recreating the mounted card', async () => {
    // arrange
    const fixture = configureWithCard();
    await render(fixture);
    const mounted = card(fixture);
    expect(mounted).toBeDefined();

    // act
    fixture.componentInstance.workspaceId.set('workspace-b');
    await render(fixture);

    // assert
    expect(card(fixture)).toBe(mounted);
    expect(mounted?.context.workspaceId()).toBe('workspace-b');
    expect(mounted?.context.sectionId()).toBe('team');
    expect(mounted?.nativeContext.selection()).toEqual({
      workspaceId: 'workspace-b',
      sectionId: 'team',
    });
  });

  it.each([
    { workspaceId: null, sectionId: 'team' },
    { workspaceId: 'workspace-a', sectionId: null },
    { workspaceId: 'workspace-a', sectionId: 'services' },
  ])(
    'deactivates the old card when the host no longer selects its workspace section: %j',
    async (selection) => {
      // arrange
      const fixture = configureWithCard();
      await render(fixture);
      expect(card(fixture)).toBeDefined();

      // act
      fixture.componentInstance.workspaceId.set(selection.workspaceId);
      fixture.componentInstance.sectionId.set(selection.sectionId);
      await render(fixture);

      // assert
      expect(card(fixture)).toBeUndefined();
    },
  );

  it('renders an empty host safely when the product omits all workspace contributions', async () => {
    // arrange
    TestBed.configureTestingModule({
      imports: [SettingsContextHost],
      providers: [provideSettings()],
    });
    const fixture = TestBed.createComponent(SettingsContextHost);

    // act
    await render(fixture);

    // assert
    expect(card(fixture)).toBeUndefined();
  });
});
