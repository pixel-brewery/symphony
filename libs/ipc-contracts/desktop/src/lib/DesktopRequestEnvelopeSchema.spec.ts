// #region Imports
import { describe, expect, it } from 'vitest';
import { desktopRequestEnvelopeSchema } from './DesktopRequestEnvelopeSchema';
// #endregion

describe('desktopRequestEnvelopeSchema', () => {
  it('admits the bounded menu-bar desktop methods', () => {
    // arrange
    const resize = {
      correlationId: 'menu-bar-resize',
      method: 'menu-bar.resize',
      payload: { height: 420 },
    };
    const status = {
      correlationId: 'menu-bar-status',
      method: 'menu-bar.status.set',
      payload: { status: 'running' },
    };

    // act
    const resizeEnvelope = desktopRequestEnvelopeSchema.parse(resize);
    const statusEnvelope = desktopRequestEnvelopeSchema.parse(status);

    // assert
    expect(resizeEnvelope.method).toBe('menu-bar.resize');
    expect(statusEnvelope.method).toBe('menu-bar.status.set');
  });
});

const expectedDesktopEnvelopeMethods = [
  'updates.get',
  'updates.check',
  'updates.download',
  'updates.channel.set',
  'updates.install',
  'window.show',
  'menu-bar.resize',
  'menu-bar.status.set',
  'app.quit',
  'power.get',
  'power.keep-awake.set',
  'speech.start',
  'speech.stop',
  'speech.cancel',
];

describe('DesktopRequestEnvelopeSchema compatibility', () => {
  it('preserves all 14 native methods in their existing order', () => {
    // arrange
    // act
    const methods = desktopRequestEnvelopeSchema.shape.method.options;
    // assert
    expect(methods).toHaveLength(14);
    expect(methods).toEqual(expectedDesktopEnvelopeMethods);
  });
});
