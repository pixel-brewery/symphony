// #region Imports
import { describe, expect, it } from 'vitest';
import { desktopResponseSchemas } from './DesktopResponseSchemas';
// #endregion

describe('desktopResponseSchemas', () => {
  it('distinguishes an in-app update download from the browser fallback', () => {
    // arrange
    const outcomes = ['started', 'opened', 'not-available'];

    // act
    const parsed = outcomes.map(
      (outcome) => desktopResponseSchemas['updates.download'].parse({ outcome }).outcome,
    );

    // assert
    expect(parsed).toEqual(outcomes);
    expect(() =>
      desktopResponseSchemas['updates.download'].parse({ outcome: 'downloading' }),
    ).toThrow();
  });

  it('acknowledges opened Settings without returning window details', () => {
    // arrange
    const response = { completed: true };

    // act
    const parsed = desktopResponseSchemas['settings.open'].parse(response);

    // assert
    expect(parsed).toEqual(response);
    expect(() => desktopResponseSchemas['settings.open'].parse({ completed: false })).toThrow();
  });
});

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
  'settings.open',
];

describe('DesktopResponseSchemas compatibility', () => {
  it('preserves the 14 existing native methods in their order and appends Settings', () => {
    // arrange
    // act
    const methods = Object.keys(desktopResponseSchemas);
    // assert
    expect(methods).toHaveLength(15);
    expect(methods).toEqual(expectedDesktopResponseMethods);
  });
});
