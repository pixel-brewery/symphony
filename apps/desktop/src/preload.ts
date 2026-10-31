// #region Imports

import { contextBridge, ipcRenderer } from 'electron';
import { ZodError } from 'zod';
import {
  channels,
  contractViolationMessage,
  responseEnvelopeSchema,
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
  powerStateSchema,
  speechRecognitionEventSchema,
  updateStateSchema,
  type IDesktopApi,
  type DesktopRequestMethod,
  type DesktopRequestPayload,
  type DesktopResponsePayload,
} from '@symphony/ipc-contracts-desktop';
import { executionEventSchema } from '@symphony/ipc-contracts-execution';
import {
  requestSchemas,
  responseSchemas,
  type IOrchestrationApi,
  type RequestMethod,
  type RequestPayload,
  type ResponsePayload,
} from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Restates a rejected contract in the operator's language.
 *
 * Both sides of every call are validated here, and a validator rejection stringifies to its raw
 * issue array. That JSON reached the operator unchanged, so a contract that had drifted announced
 * itself as a wall of `code` and `inclusive` keys instead of naming the exchange and the field
 * that failed. Anything that is not a contract rejection is the failure the orchestrator already
 * phrased for a person and travels on untouched.
 */
function contractFailure(cause: unknown, exchange: string): unknown {
  if (!(cause instanceof ZodError)) return cause;
  return new Error(contractViolationMessage(cause.issues, `The "${exchange}" exchange`));
}

const desktopApi: IDesktopApi = {
  capabilities: Object.freeze({ speechRecognition: process.platform === 'darwin' }),
  async request<M extends DesktopRequestMethod>(
    method: M,
    payload: DesktopRequestPayload<M>,
  ): Promise<DesktopResponsePayload<M>> {
    try {
      const correlationId = `renderer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const request = desktopRequestEnvelopeSchema.parse({
        correlationId,
        method,
        payload: desktopRequestSchemas[method].parse(payload),
      });
      const response = desktopResponseEnvelopeSchema.parse(
        await ipcRenderer.invoke(desktopChannels.request, request),
      );
      if (response.correlationId !== correlationId) {
        throw new Error('The desktop response did not match the update request.');
      }
      if (!response.ok) throw new Error(response.error.message);
      return desktopResponseSchemas[method].parse(response.data) as DesktopResponsePayload<M>;
    } catch (cause) {
      throw contractFailure(cause, method);
    }
  },
  onUpdateState(listener) {
    const handler = (_event: Electron.IpcRendererEvent, raw: unknown): void => {
      try {
        listener(updateStateSchema.parse(raw));
      } catch (cause) {
        throw contractFailure(cause, 'update state');
      }
    };
    ipcRenderer.on(desktopChannels.updateState, handler);
    return () => ipcRenderer.removeListener(desktopChannels.updateState, handler);
  },
  onPowerState(listener) {
    const handler = (_event: Electron.IpcRendererEvent, raw: unknown): void => {
      try {
        listener(powerStateSchema.parse(raw));
      } catch (cause) {
        throw contractFailure(cause, 'power state');
      }
    };
    ipcRenderer.on(desktopChannels.powerState, handler);
    return () => ipcRenderer.removeListener(desktopChannels.powerState, handler);
  },
  onSpeechRecognitionEvent(listener) {
    const handler = (_event: Electron.IpcRendererEvent, raw: unknown): void => {
      try {
        listener(speechRecognitionEventSchema.parse(raw));
      } catch (cause) {
        throw contractFailure(cause, 'speech recognition event');
      }
    };
    ipcRenderer.on(desktopChannels.speechRecognition, handler);
    return () => ipcRenderer.removeListener(desktopChannels.speechRecognition, handler);
  },
  onNavigate(listener) {
    const handler = (_event: Electron.IpcRendererEvent, raw: unknown): void => {
      if (isDesktopNavigationPath(raw)) listener(raw);
    };
    ipcRenderer.on(desktopChannels.navigate, handler);
    return () => ipcRenderer.removeListener(desktopChannels.navigate, handler);
  },
};

const api: IOrchestrationApi = {
  async request<M extends RequestMethod>(
    method: M,
    payload: RequestPayload<M>,
  ): Promise<ResponsePayload<M>> {
    try {
      const validatedPayload = requestSchemas[method].parse(payload);
      const response = responseEnvelopeSchema.parse(
        await ipcRenderer.invoke(channels.request, {
          correlationId: `renderer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          method,
          payload: validatedPayload,
        }),
      );
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      return responseSchemas[method].parse(response.data) as ResponsePayload<M>;
    } catch (cause) {
      throw contractFailure(cause, method);
    }
  },
  async selectPath(request) {
    try {
      const validatedRequest = pathSelectionRequestSchema.parse(request);
      return pathSelectionResponseSchema.parse(
        await ipcRenderer.invoke(channels.selectPath, validatedRequest),
      );
    } catch (cause) {
      throw contractFailure(cause, 'path selection');
    }
  },
  onExecutionEvent(listener) {
    const handler = (_event: Electron.IpcRendererEvent, raw: unknown): void => {
      try {
        listener(executionEventSchema.parse(raw));
      } catch (cause) {
        throw contractFailure(cause, 'execution event');
      }
    };
    ipcRenderer.on(channels.event, handler);
    return () => ipcRenderer.removeListener(channels.event, handler);
  },
};

if (process.platform === 'darwin') {
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      const isMenuBar = window.location.hash.startsWith('#/menu-bar');
      document.documentElement.setAttribute(
        isMenuBar ? 'data-menu-bar' : 'data-native-vibrancy',
        'true',
      );
    },
    { once: true },
  );
}

contextBridge.exposeInMainWorld('orchestration', api);
contextBridge.exposeInMainWorld('desktop', desktopApi);
