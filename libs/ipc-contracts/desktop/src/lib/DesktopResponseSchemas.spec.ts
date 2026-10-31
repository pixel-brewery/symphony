// #region Imports
import { describe, expect, it } from 'vitest';
import { desktopResponseSchemas } from './DesktopResponseSchemas';
// #endregion

const expectedDesktopResponseMethods = [
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

describe('DesktopResponseSchemas compatibility', () => {
  it('preserves all 14 native methods in their existing order', () => {
    // arrange
    // act
    const methods = Object.keys(desktopResponseSchemas);
    // assert
    expect(methods).toHaveLength(14);
    expect(methods).toEqual(expectedDesktopResponseMethods);
  });
});
