// #region Imports

import {
  channels,
  responseEnvelopeSchema,
  internalCredentialMessageSchema,
  type InternalCredentialMessage,
  type ResponseEnvelope,
} from '@symphony/ipc-contracts-core';
import {
  desktopChannels,
  desktopRequestEnvelopeSchema,
  desktopRequestSchemas,
  desktopResponseEnvelopeSchema,
  desktopResponseSchemas,
  isDesktopNavigationPath,
  pathSelectionRequestSchema,
  pathSelectionResponseSchema,
  updateChannelSchema,
  type DesktopNavigationPath,
  type DesktopRequestMethod,
  type DesktopRequestPayload,
  type DesktopResponsePayload,
  type UpdateChannel,
  type UpdateState,
} from '@symphony/ipc-contracts-desktop';
import {
  requestEnvelopeSchema,
  requestSchemas,
  responseSchemas,
  type RequestMethod,
  type RequestPayload,
  type ResponsePayload,
} from '@symphony/ipc-contracts-composition';
import { utilityEventEnvelopeSchema } from '@symphony/ipc-contracts-execution';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  powerMonitor,
  powerSaveBlocker,
  screen,
  session,
  shell,
  safeStorage,
  Tray,
  utilityProcess,
  type BrowserWindowConstructorOptions,
  type MenuItemConstructorOptions,
  type MessageBoxOptions,
  type MessageBoxReturnValue,
  type TitleBarOverlay,
  type UtilityProcess,
  type WebContents,
} from 'electron';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
  type WriteStream,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ElectronAutoUpdateAdapter } from './ElectronAutoUpdateAdapter';
import { HttpInstallerUpdateAdapter } from './HttpInstallerUpdateAdapter';
import { KeepAwakeCoordinator } from './keep-awake';
import { orchestratorRequestTimeoutMilliseconds } from './orchestratorRequestTimeoutMilliseconds';
import { menuBarStatusIconFileName } from './menuBarStatusIconFileName';
import { handleSquirrelStartup } from './squirrel-startup';
import { UpdateCoordinator } from './update-coordinator';
import { CredentialVault } from './credential-vault';
import { SpeechRecognitionCoordinator } from './speech-recognition';

// #endregion

declare const __SYMPHONY_UPDATE_BASE_URL__: string;

const currentDirectory = fileURLToPath(new URL('.', import.meta.url));
const loadNodeModule = createRequire(import.meta.url);
const pending = new Map<
  string,
  {
    resolve: (response: ResponseEnvelope) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
  }
>();
let mainWindow: BrowserWindow | undefined;
let menuBarWindow: BrowserWindow | undefined;
let menuBarTray: Tray | undefined;
let menuBarStatus: DesktopRequestPayload<'menu-bar.status.set'>['status'] = 'idle';
let orchestrator: UtilityProcess | undefined;
let speechRecognitionCoordinator: SpeechRecognitionCoordinator | undefined;
let orchestratorLogStream: WriteStream | undefined;
let orchestratorRestartTimer: NodeJS.Timeout | undefined;
let updateCheckTimer: NodeJS.Timeout | undefined;
let updateCoordinator: UpdateCoordinator | undefined;
let keepAwakeCoordinator: KeepAwakeCoordinator | undefined;
let keepAwakeRefreshTimer: NodeJS.Timeout | undefined;
let credentialVault: CredentialVault | undefined;
let backgroundReconciliation: Promise<void> | undefined;
let lastPromptedUpdateVersion: string | undefined;
/** Where Electron kept its data before Symphony relocated it, used to find a database to migrate. */
let platformUserDataPath: string | undefined;
const simulatedAdapterEnvironmentVariables = [
  'SYMPHONY_TRACKER_MODE',
  'SYMPHONY_WORKSPACE_MODE',
  'SYMPHONY_AGENT_MODE',
  'SYMPHONY_CONNECTION_MODE',
] as const;
const usesSimulatedAdapters = simulatedAdapterEnvironmentVariables.some(
  (name) => process.env[name] === 'simulated',
);
if (
  usesSimulatedAdapters &&
  !process.env['SYMPHONY_CONFIG_ROOT'] &&
  !process.env['SYMPHONY_DATABASE_PATH']
) {
  process.env['SYMPHONY_CONFIG_ROOT'] = join(tmpdir(), 'symphony-simulated', String(process.pid));
}
app.setName('Symphony');
// Before the single-instance lock, which Chromium scopes to the application-data directory: two
// configuration roots are two installations and must not compete for one lock.
relocateApplicationData();
const handlesSquirrelStartup = handleSquirrelStartup({ quit: () => app.quit() });
const ownsSingleInstanceLock = !handlesSquirrelStartup && app.requestSingleInstanceLock();
let quitConfirmed = handlesSquirrelStartup || !ownsSingleInstanceLock;
let quitPromptActive = false;
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1_000;
const UPDATE_CHANNEL_FILE = 'update-channel.json';
const KEEP_AWAKE_FILE = 'keep-awake.json';
const KEEP_AWAKE_REFRESH_INTERVAL_MS = 15_000;
const ORCHESTRATOR_LOG_MAX_BYTES = 5 * 1024 * 1024;
const MENU_BAR_WINDOW_WIDTH = 328;
const MENU_BAR_WINDOW_HEIGHT = 420;
/** Settings is a route of the main window; `settings.open` adds its location as query parameters. */
const SETTINGS_NAVIGATION_PATH = '/main/settings' satisfies DesktopNavigationPath;
// Soho's `background` scheme role in each mode. Native windows paint it before the renderer's
// first frame, so startup and resizing never flash a colour the theme does not use.
const SOHO_LIGHT_BACKGROUND_COLOR = '#ffffff';
const SOHO_DARK_BACKGROUND_COLOR = '#0a0a0a';
// Soho's `foreground` scheme role: the Windows and Linux window controls draw their symbols in it
// on the toolbar's background.
const SOHO_LIGHT_FOREGROUND_COLOR = '#0a0a0a';
const SOHO_DARK_FOREGROUND_COLOR = '#fafafa';
// Height of the renderer's unified toolbar and of the sidebar header row beside it in the main
// window.
const WINDOW_TOOLBAR_HEIGHT = 52;
// AppKit's window buttons are 16 px tall, so a 18 px top inset centres them in the 52 px sidebar
// header row; 20 px matches the sidebar's leading inset.
const TRAFFIC_LIGHT_POSITION = { x: 20, y: (WINDOW_TOOLBAR_HEIGHT - 16) / 2 } as const;
const rendererRootPath = join(currentDirectory, '../renderer/browser');
const rendererIndexPath = join(rendererRootPath, 'index.html');
const hidesWindowsForE2E = process.env['SYMPHONY_E2E_WINDOW_MODE'] === 'hidden';

function azureDevOpsCredentialReference(connectionId: string): string {
  return `vault:azure-devops:${connectionId}`;
}

function resolveCredentialVault(): CredentialVault {
  credentialVault ??= new CredentialVault(resolvePersistencePaths().configurationRoot, {
    get available() {
      if (!safeStorage.isEncryptionAvailable()) return false;
      if (process.platform !== 'linux') return true;
      return (
        typeof safeStorage.getSelectedStorageBackend === 'function' &&
        safeStorage.getSelectedStorageBackend() !== 'basic_text'
      );
    },
    encrypt: (value) => safeStorage.encryptString(value),
    decrypt: (value) => safeStorage.decryptString(value),
  });
  return credentialVault;
}

function synchronizeCredentialAvailabilityToOrchestrator(): void {
  const target = orchestrator;
  if (!target) return;
  let references: readonly string[] = [];
  try {
    references = resolveCredentialVault().references();
  } catch (cause) {
    orchestratorLogStream?.write(
      `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', component: 'desktop', event: 'credentials.available.failed', error: cause instanceof Error ? cause.message : 'Unknown credential availability failure' })}\n`,
    );
  }
  if (orchestrator !== target) return;
  target.postMessage(
    internalCredentialMessageSchema.parse({
      type: 'credentials.available',
      references,
    }),
  );
}

function resolveCredentialForOrchestrator(
  request: Extract<InternalCredentialMessage, { readonly type: 'credentials.resolve.request' }>,
): void {
  const target = orchestrator;
  if (!target) return;
  let result: Extract<
    InternalCredentialMessage,
    { readonly type: 'credentials.resolve.response' }
  >['result'];
  try {
    const secret = resolveCredentialVault().read(request.reference);
    result = secret ? { status: 'resolved', secret } : { status: 'missing' };
  } catch (cause) {
    result = { status: 'unavailable' };
    orchestratorLogStream?.write(
      `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', component: 'desktop', event: 'credentials.resolve.failed', reference: request.reference, error: cause instanceof Error ? cause.message : 'Unknown credential resolution failure' })}\n`,
    );
  }
  if (orchestrator !== target) return;
  target.postMessage(
    internalCredentialMessageSchema.parse({
      type: 'credentials.resolve.response',
      requestId: request.requestId,
      reference: request.reference,
      result,
    }),
  );
}

function pruneCredentialVault(settingsDocument: unknown): void {
  const parsed = responseSchemas['settings.save'].parse(settingsDocument);
  const retained = new Set(
    parsed.connections.flatMap((connection) =>
      connection.kind === 'azure-devops' && connection.credentialRef?.startsWith('vault:')
        ? [connection.credentialRef]
        : [],
    ),
  );
  resolveCredentialVault().prune(retained);
}

// Simulated adapters mark automated runs; those must never reach the operating-system browser,
// so external links are hard-blocked there and under the explicit SYMPHONY_EXTERNAL_LINKS_MODE
// switch. Blocked targets stay observable for tests via globalThis.blockedExternalUrls.
const externalLinksBlocked =
  process.env['SYMPHONY_EXTERNAL_LINKS_MODE'] === 'blocked' || usesSimulatedAdapters;
const blockedExternalUrls: string[] = [];
(
  globalThis as typeof globalThis & { blockedExternalUrls?: readonly string[] }
).blockedExternalUrls = blockedExternalUrls;

function openExternalLink(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (externalLinksBlocked) {
      blockedExternalUrls.push(url.toString());
      return true;
    }
    void shell.openExternal(url.toString()).catch(() => undefined);
    return true;
  } catch {
    // Malformed and non-external renderer links stay inert.
    return false;
  }
}

function resolveApplicationIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icons', 'png', 'app', 'symphony-256.png')
    : join(currentDirectory, '../../../resources/icons/png/app/symphony-256.png');
}

function resolveMenuBarIconPath(
  status: DesktopRequestPayload<'menu-bar.status.set'>['status'] = menuBarStatus,
): string {
  const fileName = menuBarStatusIconFileName(status);
  return app.isPackaged
    ? join(process.resourcesPath, 'icons', 'png', 'tray', fileName)
    : join(currentDirectory, '../../../resources/icons/png/tray', fileName);
}

function applyMenuBarStatus(status: DesktopRequestPayload<'menu-bar.status.set'>['status']): void {
  menuBarStatus = status;
  if (!menuBarTray) return;
  const icon = nativeImage.createFromPath(resolveMenuBarIconPath(status));
  icon.setTemplateImage(true);
  menuBarTray.setImage(icon);
  menuBarTray.setToolTip(
    status === 'running'
      ? 'Symphony — Run in progress'
      : status === 'failed'
        ? 'Symphony — Latest run failed'
        : 'Symphony',
  );
}

function rendererWindows(): readonly BrowserWindow[] {
  return [mainWindow, menuBarWindow].filter((window): window is BrowserWindow =>
    Boolean(window && !window.isDestroyed()),
  );
}

function isTrustedRenderer(sender: WebContents): boolean {
  return rendererWindows().some((window) => window.webContents === sender);
}

function initializeSpeechRecognition(): void {
  if (process.platform !== 'darwin' || speechRecognitionCoordinator) return;
  const nativeSpeech = loadNodeModule(
    'electron-native-speech',
  ) as typeof import('electron-native-speech');
  speechRecognitionCoordinator = new SpeechRecognitionCoordinator({
    createSession: nativeSpeech.createSpeechSession,
    disposeBackend: nativeSpeech.resetBackend,
    publish: (event) => mainWindow?.webContents.send(desktopChannels.speechRecognition, event),
  });
}

function sendToOrchestrator(request: unknown): Promise<ResponseEnvelope> {
  if (!orchestrator) {
    return Promise.reject(new Error('The Symphony background service is not available.'));
  }
  const parsed = requestEnvelopeSchema.parse(request);
  requestSchemas[parsed.method].parse(parsed.payload);
  return new Promise((resolve, reject) => {
    const timeoutMilliseconds = orchestratorRequestTimeoutMilliseconds(parsed.method);
    const timeout =
      timeoutMilliseconds === undefined
        ? undefined
        : setTimeout(() => {
            pending.delete(parsed.correlationId);
            reject(new Error('The Symphony background service did not respond in time.'));
          }, timeoutMilliseconds);
    pending.set(parsed.correlationId, { resolve, reject, timeout });
    orchestrator?.postMessage(parsed);
  });
}

async function requestOrchestrator<M extends RequestMethod>(
  method: M,
  payload: RequestPayload<M>,
): Promise<ResponsePayload<M>> {
  const response = await sendToOrchestrator({ correlationId: randomUUID(), method, payload });
  if (!response.ok) throw new Error(response.error.message);
  return responseSchemas[method].parse(response.data) as ResponsePayload<M>;
}

function startOrchestrator(): void {
  if (orchestrator || quitConfirmed) return;
  if (orchestratorRestartTimer) {
    clearTimeout(orchestratorRestartTimer);
    orchestratorRestartTimer = undefined;
  }
  const { configurationRoot, databasePath } = resolvePersistencePaths();
  const logDirectory = join(configurationRoot, 'logs');
  const logPath = join(logDirectory, 'orchestrator.jsonl');
  mkdirSync(logDirectory, { recursive: true, mode: 0o700 });
  chmodSync(logDirectory, 0o700);
  if (existsSync(logPath) && statSync(logPath).size >= ORCHESTRATOR_LOG_MAX_BYTES) {
    const previousLogPath = `${logPath}.previous`;
    copyFileSync(logPath, previousLogPath);
    chmodSync(previousLogPath, 0o600);
    writeFileSync(logPath, '', { encoding: 'utf8', mode: 0o600 });
  }
  appendFileSync(logPath, '', { encoding: 'utf8', mode: 0o600 });
  chmodSync(logPath, 0o600);
  orchestratorLogStream?.end();
  orchestratorLogStream = createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });
  orchestratorLogStream.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', component: 'desktop', event: 'orchestrator.started' })}\n`,
  );
  orchestrator = utilityProcess.fork(join(currentDirectory, '../orchestrator/main.mjs'), [], {
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: process.env['SYMPHONY_CONFIG_ROOT'] ?? configurationRoot,
      SYMPHONY_DATABASE_PATH: databasePath,
      SYMPHONY_BROWSER_DATA_PATH:
        process.env['SYMPHONY_BROWSER_DATA_PATH'] ?? app.getPath('userData'),
      SYMPHONY_MOBILE_ASSETS_PATH:
        process.env['SYMPHONY_MOBILE_ASSETS_PATH'] ?? join(currentDirectory, '../mobile/browser'),
    },
    serviceName: 'Symphony background service',
    stdio: 'pipe',
  });
  orchestrator.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(`[symphony-service] ${data.toString()}`);
    orchestratorLogStream?.write(data);
  });
  orchestrator.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[symphony-service] ${data.toString()}`);
    orchestratorLogStream?.write(data);
  });
  orchestrator.on('message', (message: unknown) => {
    const internalCredentialMessage = internalCredentialMessageSchema.safeParse(message);
    if (
      internalCredentialMessage.success &&
      internalCredentialMessage.data.type === 'credentials.resolve.request'
    ) {
      resolveCredentialForOrchestrator(internalCredentialMessage.data);
      return;
    }
    if (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === 'orchestrator.ready'
    ) {
      synchronizeCredentialAvailabilityToOrchestrator();
      return;
    }
    const response = responseEnvelopeSchema.safeParse(message);
    if (response.success) {
      const waiter = pending.get(response.data.correlationId);
      if (waiter) {
        if (waiter.timeout) clearTimeout(waiter.timeout);
        pending.delete(response.data.correlationId);
        waiter.resolve(response.data);
      }
      return;
    }
    const event = utilityEventEnvelopeSchema.safeParse(message);
    if (event.success) {
      for (const window of rendererWindows()) {
        window.webContents.send(channels.event, event.data.event);
      }
    }
  });
  orchestrator.on('exit', (code) => {
    orchestratorLogStream?.write(
      `${JSON.stringify({ timestamp: new Date().toISOString(), level: code === 0 ? 'info' : 'error', component: 'desktop', event: 'orchestrator.exited', code })}\n`,
    );
    orchestratorLogStream?.end();
    orchestratorLogStream = undefined;
    const error = new Error(
      `The Symphony background service exited with code ${code ?? 'unknown'}.`,
    );
    for (const waiter of pending.values()) {
      if (waiter.timeout) clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
    pending.clear();
    orchestrator = undefined;
    keepAwakeCoordinator?.reportActiveTasks(0);
    if (!quitConfirmed) {
      orchestratorRestartTimer = setTimeout(() => startOrchestrator(), 1_000);
    }
  });
}

function reconcileBackgroundExecutions(): Promise<void> {
  if (backgroundReconciliation) return backgroundReconciliation;
  backgroundReconciliation = requestOrchestrator('lifecycle.reconcile', {})
    .then(() => undefined)
    .catch(() => {
      // The supervised orchestrator performs the same recovery as soon as it is available again.
    })
    .finally(() => {
      backgroundReconciliation = undefined;
    });
  return backgroundReconciliation;
}

function resolvePersistencePaths(): { configurationRoot: string; databasePath: string } {
  const explicitDatabasePath = process.env['SYMPHONY_DATABASE_PATH'];
  const configurationRoot =
    process.env['SYMPHONY_CONFIG_ROOT'] ??
    (explicitDatabasePath ? dirname(explicitDatabasePath) : join(homedir(), '.symphony'));
  mkdirSync(configurationRoot, { recursive: true, mode: 0o700 });
  chmodSync(configurationRoot, 0o700);
  if (explicitDatabasePath) {
    return { configurationRoot, databasePath: explicitDatabasePath };
  }

  const databasePath = join(configurationRoot, 'state.sqlite');
  const currentPath = join(platformUserDataPath ?? app.getPath('userData'), 'symphony.sqlite');
  const legacyPath = join(
    app.getPath('appData'),
    'local-orchestration-desktop',
    'orchestration.sqlite',
  );
  if (!existsSync(databasePath)) {
    const migrationSource = [currentPath, legacyPath].find((path) => existsSync(path));
    if (migrationSource) copyFileSync(migrationSource, databasePath);
  }
  return { configurationRoot, databasePath };
}

/**
 * Everything Symphony persists belongs to its configuration root. Chromium would otherwise keep
 * caches, cookies, storage, and crash dumps in the platform's application-data directory, outside
 * the folder a user can inspect, back up, or remove as a whole. Relocating has to happen before the
 * first session exists, and the previous location stays known so an older database is still found.
 */
function relocateApplicationData(): void {
  platformUserDataPath = app.getPath('userData');
  const { configurationRoot } = resolvePersistencePaths();
  const applicationData = join(configurationRoot, 'app-data');
  mkdirSync(applicationData, { recursive: true, mode: 0o700 });
  app.setPath('userData', applicationData);
  app.setPath('sessionData', applicationData);
  app.setPath('crashDumps', join(applicationData, 'crash-dumps'));
  app.setPath('logs', join(configurationRoot, 'logs'));
}

function readUpdateChannel(configurationRoot: string): UpdateChannel {
  const path = join(configurationRoot, UPDATE_CHANNEL_FILE);
  if (!existsSync(path)) return 'stable';
  try {
    const value = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    return updateChannelSchema.parse(
      typeof value === 'object' && value !== null
        ? (value as { channel?: unknown }).channel
        : value,
    );
  } catch {
    return 'stable';
  }
}

function writeUpdateChannel(configurationRoot: string, channel: UpdateChannel): void {
  const validatedChannel = updateChannelSchema.parse(channel);
  const path = join(configurationRoot, UPDATE_CHANNEL_FILE);
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify({ version: 1, channel: validatedChannel }, undefined, 2)}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, path);
}

function readKeepAwake(configurationRoot: string): boolean {
  const path = join(configurationRoot, KEEP_AWAKE_FILE);
  if (!existsSync(path)) return false;
  try {
    const value = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as { keepAwakeWhileBusy?: unknown }).keepAwakeWhileBusy === true
    );
  } catch {
    return false;
  }
}

function writeKeepAwake(configurationRoot: string, enabled: boolean): void {
  const path = join(configurationRoot, KEEP_AWAKE_FILE);
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify({ version: 1, keepAwakeWhileBusy: enabled }, undefined, 2)}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, path);
}

function initializeKeepAwake(): void {
  const { configurationRoot } = resolvePersistencePaths();
  keepAwakeCoordinator = new KeepAwakeCoordinator({
    blocker: powerSaveBlocker,
    enabled: readKeepAwake(configurationRoot),
    persist: (enabled) => writeKeepAwake(configurationRoot, enabled),
  });
  keepAwakeCoordinator.subscribe((state) => {
    for (const window of rendererWindows()) {
      window.webContents.send(desktopChannels.powerState, state);
    }
  });
  scheduleActiveTaskRefresh(0);
}

// The orchestrator owns the truth about running work, so the assertion is re-derived from it on a
// steady cadence instead of from events: a missed event would otherwise keep the Mac awake forever.
function scheduleActiveTaskRefresh(delayMilliseconds = KEEP_AWAKE_REFRESH_INTERVAL_MS): void {
  if (keepAwakeRefreshTimer) clearTimeout(keepAwakeRefreshTimer);
  keepAwakeRefreshTimer = undefined;
  if (!keepAwakeCoordinator?.snapshot().keepAwakeWhileBusy) return;
  keepAwakeRefreshTimer = setTimeout(() => {
    void refreshActiveTaskCount().finally(() => scheduleActiveTaskRefresh());
  }, delayMilliseconds);
}

async function refreshActiveTaskCount(): Promise<void> {
  if (!keepAwakeCoordinator || !orchestrator) return;
  try {
    const active = await requestOrchestrator('lifecycle.active-operations.get', {});
    keepAwakeCoordinator.reportActiveTasks(
      active.executions.length +
        active.issueDrafts.length +
        active.verifications.length +
        active.localCiRuns.length +
        active.runtimeDependencyInstallations.length,
    );
  } catch {
    // A transient service failure must not drop the assertion mid-run; the next poll re-reads it.
  }
}

function initializeUpdates(): void {
  const { configurationRoot } = resolvePersistencePaths();
  updateCoordinator = new UpdateCoordinator({
    adapter: new ElectronAutoUpdateAdapter(),
    installerAdapter: new HttpInstallerUpdateAdapter(globalThis.fetch, {
      openPath: (path) => shell.openPath(path),
    }),
    currentVersion: app.getVersion(),
    channel: readUpdateChannel(configurationRoot),
    updateBaseUrl: __SYMPHONY_UPDATE_BASE_URL__,
    platform: process.platform,
    architecture: process.arch,
    packaged: app.isPackaged,
    quitApplication: () => app.quit(),
  });
  updateCoordinator.subscribe((state) => {
    for (const window of rendererWindows()) {
      window.webContents.send(desktopChannels.updateState, state);
    }
    if (state.kind === 'ready' && state.targetVersion !== lastPromptedUpdateVersion) {
      lastPromptedUpdateVersion = state.targetVersion;
      void promptForReadyUpdate(state);
    }
  });
  updateCoordinator.start();
}

function scheduleNextUpdateCheck(delayMilliseconds = UPDATE_CHECK_INTERVAL_MS): void {
  if (updateCheckTimer) clearTimeout(updateCheckTimer);
  if (!updateCoordinator || updateCoordinator.snapshot().kind === 'disabled') return;
  updateCheckTimer = setTimeout(() => {
    void updateCoordinator?.check().finally(() => scheduleNextUpdateCheck());
  }, delayMilliseconds);
}

async function promptForReadyUpdate(state: Extract<UpdateState, { kind: 'ready' }>): Promise<void> {
  const result = await showLifecycleMessageBox({
    type: 'info',
    title: 'Symphony update ready',
    message: `Symphony ${state.targetVersion} is ready to install.`,
    detail: 'Restart Symphony now to use the new version, or install it on a later restart.',
    buttons: ['Restart and update', 'Later'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (result.response === 0) await coordinateUpdateInstall();
}

async function coordinateUpdateInstall(): Promise<DesktopResponsePayload<'updates.install'>> {
  if (updateCoordinator?.snapshot().kind !== 'ready') return { outcome: 'not-ready' };
  try {
    const active = await requestOrchestrator('lifecycle.active-operations.get', {});
    const executionCount = active.executions.length;
    const draftCount = active.issueDrafts.length;
    const verificationCount = active.verifications.length;
    const localCiCount = active.localCiRuns.length;
    const installationCount = active.runtimeDependencyInstallations.length;
    if (executionCount + draftCount + verificationCount + localCiCount + installationCount > 0) {
      const canPause =
        draftCount === 0 &&
        verificationCount === 0 &&
        localCiCount === 0 &&
        installationCount === 0 &&
        executionCount > 0;
      const result = await showLifecycleMessageBox({
        type: 'warning',
        title: 'Tasks are still running',
        message: 'Symphony must stop its active tasks before installing the update.',
        detail: canPause
          ? 'Pause the active executions and resume them automatically after Symphony restarts.'
          : 'Active Issue Creator, local verification, local CI, or developer-tool installation cannot resume after restart. Keep Symphony open or cancel the active tasks before updating.',
        buttons: canPause
          ? ['Pause tasks and update', 'Later']
          : ['Cancel tasks and update', 'Later'],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
      });
      if (result.response !== 0) return { outcome: 'deferred' };
      if (canPause) await requestOrchestrator('lifecycle.active-operations.pause', {});
      else await requestOrchestrator('lifecycle.active-operations.cancel', {});
    }
  } catch (cause) {
    await showLifecycleMessageBox({
      type: 'error',
      title: 'Update restart is not safe yet',
      message: 'Symphony could not verify its active background tasks.',
      detail:
        cause instanceof Error
          ? `${cause.message}\n\nThe downloaded update will remain ready for a later restart.`
          : 'The downloaded update will remain ready for a later restart.',
      buttons: ['Keep Symphony open'],
      defaultId: 0,
      noLink: true,
    });
    return { outcome: 'deferred' };
  }

  quitConfirmed = true;
  if (orchestratorRestartTimer) clearTimeout(orchestratorRestartTimer);
  if (updateCheckTimer) clearTimeout(updateCheckTimer);
  if (await updateCoordinator.install()) return { outcome: 'installing' };
  quitConfirmed = false;
  scheduleNextUpdateCheck();
  return { outcome: 'not-ready' };
}

async function handleDesktopRequest(
  method: DesktopRequestMethod,
  payload: unknown,
): Promise<DesktopResponsePayload<DesktopRequestMethod>> {
  switch (method) {
    case 'updates.get': {
      if (!updateCoordinator) throw new Error('The Symphony update service is not available.');
      desktopRequestSchemas[method].parse(payload);
      return updateCoordinator.snapshot();
    }
    case 'updates.check':
      if (!updateCoordinator) throw new Error('The Symphony update service is not available.');
      desktopRequestSchemas[method].parse(payload);
      return updateCoordinator.check();
    case 'updates.download': {
      if (!updateCoordinator) throw new Error('The Symphony update service is not available.');
      desktopRequestSchemas[method].parse(payload);
      if (updateCoordinator.download()) {
        // The person started this download and watches its progress where they started it, which
        // then offers `Restart to update`; the ready prompt is for silent native downloads.
        const state = updateCoordinator.snapshot();
        if (state.kind === 'downloading' && state.targetVersion) {
          lastPromptedUpdateVersion = state.targetVersion;
        }
        return { outcome: 'started' };
      }
      // Fallback for an available installer Symphony cannot download itself.
      const downloadUrl = updateCoordinator.availableDownloadUrl();
      return {
        outcome: downloadUrl && openExternalLink(downloadUrl) ? 'opened' : 'not-available',
      };
    }
    case 'updates.channel.set': {
      if (!updateCoordinator) throw new Error('The Symphony update service is not available.');
      const request = desktopRequestSchemas[method].parse(payload);
      const state = updateCoordinator.setChannel(request.channel);
      writeUpdateChannel(resolvePersistencePaths().configurationRoot, request.channel);
      scheduleNextUpdateCheck(1_000);
      return state;
    }
    case 'updates.install':
      desktopRequestSchemas[method].parse(payload);
      return coordinateUpdateInstall();
    case 'window.show': {
      const request = desktopRequestSchemas[method].parse(payload);
      await showMainWindowAt(
        request.route === 'current' ? undefined : mainWindowDestination(request.route),
      );
      return { completed: true };
    }
    case 'settings.open': {
      const request = desktopRequestSchemas[method].parse(payload);
      await showMainWindowAt(settingsNavigationPath(request.parameters));
      return { completed: true };
    }
    case 'menu-bar.resize': {
      const request = desktopRequestSchemas[method].parse(payload);
      if (menuBarWindow && !menuBarWindow.isDestroyed()) {
        menuBarWindow.setSize(MENU_BAR_WINDOW_WIDTH, request.height, false);
        if (menuBarWindow.isVisible()) positionMenuBarWindow();
      }
      return { completed: true };
    }
    case 'menu-bar.status.set': {
      const request = desktopRequestSchemas[method].parse(payload);
      applyMenuBarStatus(request.status);
      return { completed: true };
    }
    case 'power.get': {
      if (!keepAwakeCoordinator) throw new Error('The Symphony power service is not available.');
      desktopRequestSchemas[method].parse(payload);
      return keepAwakeCoordinator.snapshot();
    }
    case 'power.keep-awake.set': {
      if (!keepAwakeCoordinator) throw new Error('The Symphony power service is not available.');
      const request = desktopRequestSchemas[method].parse(payload);
      const state = keepAwakeCoordinator.setEnabled(request.enabled);
      scheduleActiveTaskRefresh(0);
      return state;
    }
    case 'speech.start': {
      if (!speechRecognitionCoordinator) {
        throw new Error('Native speech recognition is unavailable on this computer.');
      }
      const request = desktopRequestSchemas[method].parse(payload);
      await speechRecognitionCoordinator.start(request.locale);
      return { started: true };
    }
    case 'speech.stop':
      desktopRequestSchemas[method].parse(payload);
      await speechRecognitionCoordinator?.stop();
      return { stopped: true };
    case 'speech.cancel':
      desktopRequestSchemas[method].parse(payload);
      await speechRecognitionCoordinator?.cancel();
      return { cancelled: true };
    case 'app.quit':
      desktopRequestSchemas[method].parse(payload);
      menuBarWindow?.hide();
      setImmediate(() => app.quit());
      return { accepted: true };
  }
}

async function createMenuBarWindow(): Promise<void> {
  if (process.platform !== 'darwin' || menuBarWindow) return;
  menuBarWindow = new BrowserWindow({
    width: MENU_BAR_WINDOW_WIDTH,
    height: MENU_BAR_WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    transparent: false,
    // The panel follows the system appearance; `applyNativeThemeToWindows` keeps it current.
    backgroundColor: themeBackgroundColor(),
    roundedCorners: true,
    hasShadow: true,
    alwaysOnTop: true,
    webPreferences: rendererWebPreferences(),
  });
  menuBarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  menuBarWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalLink(url);
    return { action: 'deny' };
  });
  menuBarWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== menuBarWindow?.webContents.getURL()) {
      event.preventDefault();
      openExternalLink(url);
    }
  });
  menuBarWindow.on('blur', () => {
    if (!menuBarWindow?.webContents.isDevToolsOpened()) menuBarWindow?.hide();
  });
  menuBarWindow.on('closed', () => {
    menuBarWindow = undefined;
  });
  await loadRendererRoute(menuBarWindow, '/menu-bar');
}

/**
 * Loads the one renderer bundle into a window, optionally at a hash route such as `/menu-bar`: from
 * the development server when `SYMPHONY_RENDERER_URL` is set, otherwise from the packaged files.
 */
async function loadRendererRoute(window: BrowserWindow, hash?: string): Promise<void> {
  const developmentUrl = process.env['SYMPHONY_RENDERER_URL'];
  if (developmentUrl) {
    if (!hash) {
      await window.loadURL(developmentUrl);
      return;
    }
    const url = new URL(developmentUrl);
    url.hash = hash;
    await window.loadURL(url.toString());
  } else {
    await window.loadFile(rendererIndexPath, hash ? { hash } : undefined);
  }
}

/** The renderer isolation every Symphony window uses. */
function rendererWebPreferences(): Electron.WebPreferences {
  return {
    preload: join(currentDirectory, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
  };
}

/** Keeps a window on its renderer page: new windows and navigation open externally or not at all. */
function guardRendererNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalLink(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
      openExternalLink(url);
    }
  });
}

/** Reloads the packaged renderer index when a file URL below it failed to load (reload on a route). */
function recoverRendererFileLoads(window: BrowserWindow): void {
  window.webContents.on(
    'did-fail-load',
    (_event, errorCode, _errorDescription, validatedUrl, isMainFrame) => {
      if (errorCode !== -6 || !isMainFrame || process.env['SYMPHONY_RENDERER_URL']) return;
      try {
        const failedUrl = new URL(validatedUrl);
        const failedPath = fileURLToPath(failedUrl);
        if (failedUrl.protocol !== 'file:' || !failedPath.startsWith(rendererRootPath)) return;
        const route = failedUrl.hash.slice(1);
        if (window.isDestroyed()) return;
        void window
          .loadFile(rendererIndexPath, route ? { hash: route } : undefined)
          .catch(() => undefined);
      } catch {
        // Ignore malformed or unrelated failed URLs; navigation remains denied.
      }
    },
  );
}

function themeBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? SOHO_DARK_BACKGROUND_COLOR : SOHO_LIGHT_BACKGROUND_COLOR;
}

/** Windows and Linux window controls, drawn over the right end of the 52 px toolbar. */
function windowControlsOverlay(): TitleBarOverlay {
  return {
    color: themeBackgroundColor(),
    symbolColor: nativeTheme.shouldUseDarkColors
      ? SOHO_DARK_FOREGROUND_COLOR
      : SOHO_LIGHT_FOREGROUND_COLOR,
    height: WINDOW_TOOLBAR_HEIGHT,
  };
}

/**
 * Platform chrome of the main window. macOS keeps its traffic lights inside the
 * sidebar's header row over a vibrant sidebar material; Windows and Linux keep their native
 * window controls as a Window Controls Overlay at the right of the toolbar, which reserves
 * `env(titlebar-area-*)` for them. Frameless windows never draw a menu bar there.
 */
function applicationWindowChrome(): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return {
      backgroundColor: '#00000000',
      transparent: true,
      vibrancy: 'sidebar',
      visualEffectState: 'followWindow',
      frame: false,
      titleBarStyle: 'hiddenInset',
      titleBarOverlay: true,
      trafficLightPosition: TRAFFIC_LIGHT_POSITION,
    };
  }
  return {
    backgroundColor: themeBackgroundColor(),
    frame: false,
    // `hiddenInset` exists only on macOS; the overlay controls need `hidden` on Windows and Linux.
    titleBarStyle: 'hidden',
    titleBarOverlay: windowControlsOverlay(),
    autoHideMenuBar: true,
  };
}

/** Repaints native window surfaces after the system switches between light and dark. */
function applyNativeThemeToWindows(): void {
  if (menuBarWindow && !menuBarWindow.isDestroyed()) {
    menuBarWindow.setBackgroundColor(themeBackgroundColor());
  }
  if (process.platform === 'darwin' || !mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setBackgroundColor(themeBackgroundColor());
  mainWindow.setTitleBarOverlay(windowControlsOverlay());
}

function positionMenuBarWindow(): void {
  if (!menuBarTray || !menuBarWindow) return;
  const trayBounds = menuBarTray.getBounds();
  const windowBounds = menuBarWindow.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: Math.round(trayBounds.x + trayBounds.width / 2),
    y: Math.round(trayBounds.y + trayBounds.height),
  });
  const x = Math.min(
    Math.max(
      Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2),
      display.workArea.x + 8,
    ),
    display.workArea.x + display.workArea.width - windowBounds.width - 8,
  );
  const y = Math.min(
    Math.round(trayBounds.y + trayBounds.height + 4),
    display.workArea.y + display.workArea.height - windowBounds.height - 8,
  );
  menuBarWindow.setPosition(x, y, false);
}

function toggleMenuBarWindow(): void {
  if (!menuBarWindow) return;
  if (menuBarWindow.isVisible()) {
    menuBarWindow.hide();
    return;
  }
  positionMenuBarWindow();
  menuBarWindow.show();
  menuBarWindow.focus();
}

async function createMenuBarIntegration(): Promise<void> {
  if (process.platform !== 'darwin') return;
  await createMenuBarWindow();
  if (hidesWindowsForE2E) return;
  const icon = nativeImage.createFromPath(resolveMenuBarIconPath());
  icon.setTemplateImage(true);
  menuBarTray = new Tray(icon, '4c5dad4c-9cc8-4e67-93ae-67851cb31397');
  applyMenuBarStatus(menuBarStatus);
  menuBarTray.on('click', toggleMenuBarWindow);
  menuBarTray.on('right-click', toggleMenuBarWindow);
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    show: false,
    minWidth: 400,
    minHeight: 270,
    title: 'Symphony',
    icon: resolveApplicationIconPath(),
    ...applicationWindowChrome(),
    webPreferences: rendererWebPreferences(),
  });
  guardRendererNavigation(mainWindow);
  recoverRendererFileLoads(mainWindow);
  mainWindow.on('closed', () => {
    void speechRecognitionCoordinator?.dispose();
    mainWindow = undefined;
  });
  await loadRendererRoute(mainWindow);
}

/** Brings Symphony to the front on macOS, also when it ran only as a menu-bar extra. */
async function activateApplication(): Promise<void> {
  if (process.platform !== 'darwin') return;
  app.setActivationPolicy('regular');
  await app.dock?.show();
  app.focus({ steal: true });
}

async function showMainWindow(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    await createWindow();
  }
  const window = mainWindow;
  if (!window || window.isDestroyed()) return;
  if (hidesWindowsForE2E) return;
  await activateApplication();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

/** Shows the main window and, when given, opens an in-app destination in it. */
async function showMainWindowAt(destination?: DesktopNavigationPath): Promise<void> {
  menuBarWindow?.hide();
  await showMainWindow();
  if (destination && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(desktopChannels.navigate, destination);
  }
}

function mainWindowDestination(
  route: Exclude<DesktopRequestPayload<'window.show'>['route'], 'current'>,
): DesktopNavigationPath {
  switch (route) {
    case 'settings':
      return SETTINGS_NAVIGATION_PATH;
    case 'actions':
      return '/main/actions';
    case 'inbox':
      return '/main/inbox';
    case 'notifications':
      return '/main/home?notifications=open';
    case 'new-work-item':
      return '/main/board?create=true';
  }
}

/**
 * The main-window Settings route for a requested location: `/main/settings` without parameters,
 * otherwise `/main/settings?<key>=<value>&…`. The contract restricts keys and values to URL
 * unreserved characters; `encodeURIComponent` keeps `~` literal where `URLSearchParams` would not.
 * A composed path the navigation allowlist rejects falls back to the Settings route itself, so
 * Settings still opens.
 */
function settingsNavigationPath(
  parameters: Readonly<Record<string, string>> | undefined,
): DesktopNavigationPath {
  const query = Object.entries(parameters ?? {})
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  if (!query) return SETTINGS_NAVIGATION_PATH;
  const path = `${SETTINGS_NAVIGATION_PATH}?${query}`;
  return isDesktopNavigationPath(path) ? path : SETTINGS_NAVIGATION_PATH;
}

function configureApplicationMenu(): void {
  const settings: MenuItemConstructorOptions = {
    label: 'Settings…',
    accelerator: 'CmdOrCtrl+,',
    click: () => void showMainWindowAt(SETTINGS_NAVIGATION_PATH),
  };
  const newWorkItem: MenuItemConstructorOptions = {
    label: 'New Work Item…',
    accelerator: 'CmdOrCtrl+N',
    click: () => void showMainWindowAt('/main/board?create=true'),
  };
  if (process.platform !== 'darwin') {
    // Windows and Linux windows are frameless, so this menu is never drawn as a menu bar; it
    // carries the shortcuts and the roles of Electron's default menu, which it replaces.
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'File',
          submenu: [newWorkItem, settings, { type: 'separator' }, { role: 'quit' }],
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
      ]),
    );
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          settings,
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      { label: 'File', submenu: [newWorkItem, { type: 'separator' }, { role: 'close' }] },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      { role: 'help' },
    ]),
  );
}

function confirmQuit(): void {
  quitConfirmed = true;
  app.quit();
}

function showLifecycleMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue> {
  const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  return parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options);
}

async function coordinateQuit(): Promise<void> {
  try {
    const active = await requestOrchestrator('lifecycle.active-operations.get', {});
    const executionCount = active.executions.length;
    const draftCount = active.issueDrafts.length;
    const verificationCount = active.verifications.length;
    const localCiCount = active.localCiRuns.length;
    const installationCount = active.runtimeDependencyInstallations.length;
    const total =
      executionCount + draftCount + verificationCount + localCiCount + installationCount;
    if (total === 0) {
      confirmQuit();
      return;
    }

    const breakdown = [
      executionCount
        ? `${executionCount} analysis or implementation ${executionCount === 1 ? 'run' : 'runs'}`
        : undefined,
      draftCount ? `${draftCount} AI issue ${draftCount === 1 ? 'draft' : 'drafts'}` : undefined,
      verificationCount
        ? `${verificationCount} local verification ${verificationCount === 1 ? 'run' : 'runs'}`
        : undefined,
      localCiCount ? `${localCiCount} local CI ${localCiCount === 1 ? 'run' : 'runs'}` : undefined,
      installationCount
        ? `${installationCount} developer-tool ${installationCount === 1 ? 'installation' : 'installations'}`
        : undefined,
    ]
      .filter(Boolean)
      .join(' and ');
    const canQuitAndResume =
      draftCount === 0 &&
      verificationCount === 0 &&
      localCiCount === 0 &&
      installationCount === 0 &&
      executionCount > 0;
    const buttons = canQuitAndResume
      ? [
          'Keep running in background',
          'Quit and resume later',
          'Cancel tasks and quit',
          "Don't quit",
        ]
      : ['Keep running in background', 'Cancel tasks and quit', "Don't quit"];
    const result = await showLifecycleMessageBox({
      type: 'warning',
      title: 'Tasks are still running',
      message: `${total} background ${total === 1 ? 'task is' : 'tasks are'} still running.`,
      detail: canQuitAndResume
        ? `${breakdown} will be interrupted if Symphony exits. Keep the live process running, pause it safely and resume from its durable Codex session later, or cancel it before quitting.`
        : `${breakdown} will be interrupted if Symphony exits. Keep Symphony running in the background to preserve non-resumable work, or cancel it before quitting.`,
      buttons,
      defaultId: 0,
      cancelId: buttons.length - 1,
      noLink: true,
    });

    if (result.response === 0) {
      mainWindow?.hide();
      return;
    }
    if (canQuitAndResume && result.response === 1) {
      await requestOrchestrator('lifecycle.active-operations.pause', {});
      confirmQuit();
      return;
    }
    const cancelResponse = canQuitAndResume ? 2 : 1;
    if (result.response === cancelResponse) {
      await requestOrchestrator('lifecycle.active-operations.cancel', {});
      confirmQuit();
      return;
    }
    await showMainWindow();
  } catch (cause) {
    const result = await showLifecycleMessageBox({
      type: 'error',
      title: 'Background tasks could not be verified',
      message: 'Symphony could not safely verify or stop its background tasks.',
      detail:
        cause instanceof Error
          ? `${cause.message}\n\nKeep Symphony open unless you intentionally want to force quit.`
          : 'Keep Symphony open unless you intentionally want to force quit.',
      buttons: ["Don't quit", 'Force quit'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (result.response === 1) confirmQuit();
    else await showMainWindow();
  } finally {
    if (!quitConfirmed) quitPromptActive = false;
  }
}

app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disk-cache-size', String(32 * 1024 * 1024));
if (process.platform === 'win32') app.setAppUserModelId('com.squirrel.symphony.Symphony');
if (!ownsSingleInstanceLock) app.quit();

app.whenReady().then(async () => {
  if (!ownsSingleInstanceLock) return;
  if (process.platform === 'darwin') {
    app.setActivationPolicy(hidesWindowsForE2E ? 'accessory' : 'regular');
  }
  configureApplicationMenu();
  nativeTheme.on('updated', applyNativeThemeToWindows);
  initializeSpeechRecognition();
  await Promise.all([
    session.defaultSession.clearCache(),
    session.defaultSession.clearCodeCaches({}),
    session.defaultSession.clearStorageData({ storages: ['cachestorage', 'serviceworkers'] }),
  ]);
  // Refresh the Dock from this build even when macOS retains an older bundle icon.
  if (process.platform === 'darwin') {
    app.dock?.setIcon(resolveApplicationIconPath());
  }
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://avatars.githubusercontent.com; font-src 'self' data:; connect-src 'self' http://127.0.0.1:4200 ws://127.0.0.1:4200",
        ],
      },
    });
  });
  startOrchestrator();
  initializeUpdates();
  initializeKeepAwake();
  powerMonitor.on('resume', () => {
    void reconcileBackgroundExecutions();
    void updateCoordinator?.check();
    scheduleActiveTaskRefresh(0);
  });
  powerMonitor.on('unlock-screen', () => {
    void reconcileBackgroundExecutions();
    void updateCoordinator?.check();
  });
  ipcMain.handle(channels.request, async (event, request: unknown) => {
    if (!isTrustedRenderer(event.sender)) {
      return {
        correlationId: randomUUID(),
        ok: false,
        error: {
          code: 'UNTRUSTED_RENDERER',
          message: 'Request did not originate from the app window.',
        },
      };
    }
    try {
      const parsedRequest = requestEnvelopeSchema.parse(request);
      const azureDevOpsLogin =
        parsedRequest.method === 'azure-devops.login.start'
          ? requestSchemas['azure-devops.login.start'].parse(parsedRequest.payload)
          : undefined;
      const credentialReference = azureDevOpsLogin
        ? azureDevOpsCredentialReference(azureDevOpsLogin.connectionId)
        : undefined;
      const previousCredential = credentialReference
        ? resolveCredentialVault().read(credentialReference)
        : undefined;
      if (azureDevOpsLogin && credentialReference) {
        resolveCredentialVault().save(credentialReference, azureDevOpsLogin.token);
      }
      let response: ResponseEnvelope;
      try {
        response = await sendToOrchestrator(parsedRequest);
      } catch (cause) {
        if (credentialReference) {
          if (previousCredential)
            resolveCredentialVault().save(credentialReference, previousCredential);
          else resolveCredentialVault().remove(credentialReference);
        }
        throw cause;
      }
      if (credentialReference && !response.ok) {
        if (previousCredential)
          resolveCredentialVault().save(credentialReference, previousCredential);
        else resolveCredentialVault().remove(credentialReference);
      }
      if (parsedRequest.method === 'azure-devops.logout' && response.ok) {
        const input = requestSchemas['azure-devops.logout'].parse(parsedRequest.payload);
        resolveCredentialVault().remove(azureDevOpsCredentialReference(input.connectionId));
      }
      if (
        response.ok &&
        (parsedRequest.method === 'settings.save' || parsedRequest.method === 'workspaces.delete')
      ) {
        pruneCredentialVault(response.data);
      }
      if (parsedRequest.method === 'codex.login.start' && response.ok) {
        const result = responseSchemas['codex.login.start'].parse(response.data);
        if (result.authorizationUrl) openExternalLink(result.authorizationUrl);
      }
      if (parsedRequest.method === 'claude.login.start' && response.ok) {
        const result = responseSchemas['claude.login.start'].parse(response.data);
        if (result.authorizationUrl) openExternalLink(result.authorizationUrl);
      }
      return response;
    } catch (cause) {
      const correlationId =
        requestEnvelopeSchema.safeParse(request).data?.correlationId ?? randomUUID();
      return {
        correlationId,
        ok: false,
        error: {
          code: 'IPC_BRIDGE_FAILED',
          message: cause instanceof Error ? cause.message : 'Unknown IPC bridge failure',
        },
      };
    }
  });
  ipcMain.handle(channels.selectPath, async (event, request: unknown) => {
    // Repository and workspace folders are chosen in the main window, Settings included.
    const owner =
      mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents
        ? mainWindow
        : undefined;
    if (!owner) {
      throw new Error('Path selection did not originate from the app window.');
    }

    const validatedRequest = pathSelectionRequestSchema.parse(request);
    const result = await dialog.showOpenDialog(owner, {
      title: validatedRequest.title,
      defaultPath: validatedRequest.defaultPath,
      filters:
        validatedRequest.kind === 'file'
          ? validatedRequest.filters?.map((filter) => ({
              name: filter.name,
              extensions: [...filter.extensions],
            }))
          : undefined,
      properties:
        validatedRequest.kind === 'directory' ? ['openDirectory', 'createDirectory'] : ['openFile'],
    });

    return pathSelectionResponseSchema.parse({
      canceled: result.canceled,
      paths: result.filePaths,
    });
  });
  ipcMain.handle(desktopChannels.request, async (event, request: unknown) => {
    const correlationId =
      desktopRequestEnvelopeSchema.safeParse(request).data?.correlationId ?? randomUUID();
    if (!isTrustedRenderer(event.sender)) {
      return desktopResponseEnvelopeSchema.parse({
        correlationId,
        ok: false,
        error: {
          code: 'UNTRUSTED_RENDERER',
          message: 'Request did not originate from the app window.',
        },
      });
    }
    try {
      const parsedRequest = desktopRequestEnvelopeSchema.parse(request);
      const data = await handleDesktopRequest(parsedRequest.method, parsedRequest.payload);
      desktopResponseSchemas[parsedRequest.method].parse(data);
      return desktopResponseEnvelopeSchema.parse({ correlationId, ok: true, data });
    } catch (cause) {
      return desktopResponseEnvelopeSchema.parse({
        correlationId,
        ok: false,
        error: {
          code: 'DESKTOP_REQUEST_FAILED',
          message: cause instanceof Error ? cause.message : 'Unknown desktop request failure',
        },
      });
    }
  });
  await createWindow();
  await createMenuBarIntegration();
  await showMainWindow();
  scheduleNextUpdateCheck(process.argv.includes('--squirrel-firstrun') ? 10_000 : 15_000);
  app.on('activate', () => {
    void showMainWindow();
  });
});

app.on('second-instance', () => {
  if (app.isReady()) void showMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
  if (quitConfirmed) {
    if (orchestratorRestartTimer) clearTimeout(orchestratorRestartTimer);
    if (updateCheckTimer) clearTimeout(updateCheckTimer);
    if (keepAwakeRefreshTimer) clearTimeout(keepAwakeRefreshTimer);
    updateCoordinator?.dispose();
    keepAwakeCoordinator?.dispose();
    void speechRecognitionCoordinator?.dispose();
    orchestrator?.kill();
    orchestratorLogStream?.end();
    orchestratorLogStream = undefined;
    return;
  }
  event.preventDefault();
  if (quitPromptActive) return;
  quitPromptActive = true;
  void coordinateQuit();
});
