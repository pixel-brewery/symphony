// #region Imports
import { describe, expect, it, vi } from 'vitest';
import { OrchestratorRequestProcessor } from './OrchestratorRequestProcessor';
// #endregion

describe('OrchestratorRequestProcessor', () => {
  it('silently ignores malformed envelopes', async () => {
    // arrange
    const execute = vi.fn();
    const postMessage = vi.fn();
    const processor = new OrchestratorRequestProcessor({
      registry: { execute },
      logger: { info: vi.fn(), error: vi.fn() },
      beforeDispatch: vi.fn(),
      postMessage,
    });
    // act
    await processor.handleMessage({ method: 'unknown', correlationId: 'bad', payload: {} });
    // assert
    expect(execute).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('keeps correlation and the original answer while preflighting the selected method', async () => {
    // arrange
    const data = { retained: true };
    const beforeDispatch = vi.fn();
    const postMessage = vi.fn();
    const processor = new OrchestratorRequestProcessor({
      registry: {
        execute: async (_method, _payload, before) => {
          before();
          return data;
        },
      },
      logger: { info: vi.fn(), error: vi.fn() },
      beforeDispatch,
      postMessage,
    });
    // act
    await processor.handleMessage({
      method: 'snapshot.get',
      correlationId: 'request-1',
      payload: {},
    });
    // assert
    expect(beforeDispatch).toHaveBeenCalledWith('snapshot.get');
    expect(postMessage).toHaveBeenCalledWith({ correlationId: 'request-1', ok: true, data });
  });

  it('projects registry failures through the unchanged error envelope', async () => {
    // arrange
    const postMessage = vi.fn();
    const error = vi.fn();
    const processor = new OrchestratorRequestProcessor({
      registry: {
        execute: async () => {
          throw new Error('Unavailable feature');
        },
      },
      logger: { info: vi.fn(), error },
      beforeDispatch: vi.fn(),
      postMessage,
    });
    // act
    await processor.handleMessage({
      method: 'snapshot.get',
      correlationId: 'request-2',
      payload: {},
    });
    // assert
    expect(postMessage).toHaveBeenCalledWith({
      correlationId: 'request-2',
      ok: false,
      error: { code: 'ORCHESTRATION_REQUEST_FAILED', message: 'Unavailable feature' },
    });
    expect(error).toHaveBeenCalledWith({
      event: 'request.failed',
      correlationId: 'request-2',
      method: 'snapshot.get',
      error: 'Unavailable feature',
    });
  });
});
