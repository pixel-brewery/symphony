// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { WORK_CONNECTION_OPERATIONS } from '@symphony/frontend-core/work';
import { NotificationService } from '@symphony/frontend-notification';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SourceConnectionStore } from '../state/SourceConnectionStore';
import { provideWorkConnections } from './provideWorkConnections';

// #endregion

describe('provideWorkConnections', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shares one source owner and keeps the common exclusion active until both authentication and a settings write finish', async () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
    let finishSave: ((value: ApplicationSettingsDto) => void) | undefined;
    const pendingSave = new Promise<ApplicationSettingsDto>((resolve) => {
      finishSave = resolve;
    });
    const accounts: ResponsePayload<'connections.get'> = {
      azureDevOps: { accounts: [] },
      github: { cliAvailable: true, accounts: [] },
      codex: { cliAvailable: false, accounts: [] },
      claude: { cliAvailable: false, accounts: [] },
    };
    const request = vi.fn(async (method: string): Promise<unknown> => {
      if (method === 'settings.save') return pendingSave;
      if (method === 'github.login.start') return { status: 'completed', message: 'Completed' };
      if (method === 'connections.get') return accounts;
      throw new Error(`Unavailable: ${method}`);
    });
    TestBed.configureTestingModule({
      providers: [
        ...provideWorkConnections(),
        { provide: ORCHESTRATION_CLIENT, useValue: { request } },
        {
          provide: NotificationService,
          useValue: { showSuccess: vi.fn(), showInfo: vi.fn(), showError: vi.fn() },
        },
      ],
    });
    const configuration = TestBed.inject(ConfigurationStore);
    const source = TestBed.inject(SourceConnectionStore);

    // act
    const save = configuration.saveSettings(settings, false);
    const login = source.connectGitHub({
      mode: 'browser',
      hostname: 'github.com',
      gitProtocol: 'https',
    });
    const loginResult = await login;
    const writerStillBusy = configuration.configurationBusy();
    finishSave?.(settings);
    const saveResult = await save;

    // assert
    expect(TestBed.inject(WORK_CONNECTION_OPERATIONS)).toBe(source);
    expect(loginResult).toBe(true);
    expect(saveResult).toBe(true);
    expect(source.connectionBusy()).toBe(false);
    expect(writerStillBusy).toBe(true);
    expect(configuration.configurationBusy()).toBe(false);
    expect(configuration.connections()).toBe(accounts);
  });
});
