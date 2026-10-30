// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_CLIENT } from '../ports/WorkspaceClientToken';
import { NotificationService } from '@symphony/frontend-notification';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import { WORKSPACE_PROJECTION } from '../ports/WorkspaceProjectionToken';
import { WORKSPACE_REFRESH } from '../ports/WorkspaceRefreshToken';
import { WORK_SELECTION } from '@symphony/frontend-core/work';
import { WorkspaceStore } from './WorkspaceStore';

// #endregion

describe('WorkspaceStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it.each([true, false])(
    'completes deletion without refresh participants when Work selection is included: %s',
    async (includeWork) => {
      // arrange
      const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
      const refresh = vi.fn(async () => undefined);
      const refreshConfiguration = vi.fn(async () => undefined);
      const notifications = { showSuccess: vi.fn(), showError: vi.fn() };
      const resetId = vi.fn();
      const applySettings = vi.fn();
      TestBed.configureTestingModule({
        providers: [
          WorkspaceStore,
          ...(includeWork ? [{ provide: WORK_SELECTION, useValue: { resetId } }] : []),
          { provide: WORKSPACE_PROJECTION, useValue: { applySettings } },
          { provide: WORKSPACE_CLIENT, useValue: { request: vi.fn(async () => settings) } },
          { provide: NotificationService, useValue: notifications },
          {
            provide: WORKSPACE_CONFIGURATION,
            useValue: { clearProviderConfiguration: vi.fn(), refreshConfiguration },
          },
          { provide: WORKSPACE_REFRESH, useValue: { refresh } },
        ],
      });
      const store = TestBed.inject(WorkspaceStore);

      // act
      const deleted = await store.deleteWorkspace('workspace');

      // assert
      expect(deleted).toBe(true);
      if (includeWork) expect(resetId).toHaveBeenCalledOnce();
      else expect(resetId).not.toHaveBeenCalled();
      expect(applySettings).toHaveBeenCalledExactlyOnceWith(settings);
      expect(refresh).toHaveBeenCalledOnce();
      expect(refreshConfiguration).toHaveBeenCalledOnce();
      expect(notifications.showError).not.toHaveBeenCalled();
    },
  );
});
