// #region Imports
import { describe, expect, it } from 'vitest';
import { desktopRequestSchemas } from './DesktopRequestSchemas';
// #endregion

describe('desktopRequestSchemas', () => {
  it('bounds native menu-bar resizing and status updates', () => {
    // arrange
    const resize = { height: 420 };
    const status = { status: 'failed' as const };

    // act
    const parsedResize = desktopRequestSchemas['menu-bar.resize'].parse(resize);
    const parsedStatus = desktopRequestSchemas['menu-bar.status.set'].parse(status);

    // assert
    expect(parsedResize).toEqual(resize);
    expect(parsedStatus).toEqual(status);
    expect(() => desktopRequestSchemas['menu-bar.resize'].parse({ height: 900 })).toThrow();
    expect(() =>
      desktopRequestSchemas['menu-bar.status.set'].parse({ status: 'warning' }),
    ).toThrow();
  });
});

const expectedDesktopRequestMethods = [
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

describe('DesktopRequestSchemas compatibility', () => {
  it('preserves all 14 native methods in their existing order', () => {
    // arrange
    // act
    const methods = Object.keys(desktopRequestSchemas);
    // assert
    expect(methods).toHaveLength(14);
    expect(methods).toEqual(expectedDesktopRequestMethods);
  });
});
