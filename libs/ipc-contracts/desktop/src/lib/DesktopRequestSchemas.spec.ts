// #region Imports
import { describe, expect, it } from 'vitest';
import { desktopRequestSchemas } from './DesktopRequestSchemas';
// #endregion

describe('desktopRequestSchemas', () => {
  it('bounds native menu-bar resizing and status updates', () => {
    // arrange
    const resize = { height: 420 };
    const tallestPanel = { height: 760 };
    const status = { status: 'failed' as const };

    // act
    const parsedResize = desktopRequestSchemas['menu-bar.resize'].parse(resize);
    const parsedTallestPanel = desktopRequestSchemas['menu-bar.resize'].parse(tallestPanel);
    const parsedStatus = desktopRequestSchemas['menu-bar.status.set'].parse(status);

    // assert
    expect(parsedResize).toEqual(resize);
    expect(parsedTallestPanel).toEqual(tallestPanel);
    expect(parsedStatus).toEqual(status);
    expect(() => desktopRequestSchemas['menu-bar.resize'].parse({ height: 761 })).toThrow();
    expect(() => desktopRequestSchemas['menu-bar.resize'].parse({ height: 179 })).toThrow();
    expect(() =>
      desktopRequestSchemas['menu-bar.status.set'].parse({ status: 'warning' }),
    ).toThrow();
  });

  it('admits only the known main-window destinations and defaults to the current view', () => {
    // arrange
    const routes = ['current', 'settings', 'actions', 'inbox', 'notifications', 'new-work-item'];

    // act
    const parsedRoutes = routes.map(
      (route) => desktopRequestSchemas['window.show'].parse({ route }).route,
    );
    const defaultRoute = desktopRequestSchemas['window.show'].parse({}).route;

    // assert
    expect(parsedRoutes).toEqual(routes);
    expect(defaultRoute).toBe('current');
    expect(() => desktopRequestSchemas['window.show'].parse({ route: 'board' })).toThrow();
  });

  it('opens Settings at an optional location of at most eight bounded parameters', () => {
    // arrange
    const location = {
      parameters: { workspace: 'flamox365', section: 'repositories', repository: 'repo-1' },
    };
    const nineParameters = Object.fromEntries(
      Array.from({ length: 9 }, (_, index) => [`key${String.fromCharCode(97 + index)}`, 'value']),
    );

    // act
    const parsedLocation = desktopRequestSchemas['settings.open'].parse(location);
    const parsedDefault = desktopRequestSchemas['settings.open'].parse({});

    // assert
    expect(parsedLocation).toEqual(location);
    expect(parsedDefault).toEqual({});
    expect(() =>
      desktopRequestSchemas['settings.open'].parse({ parameters: nineParameters }),
    ).toThrow();
    for (const parameters of [
      { Section: 'skills' },
      { '1section': 'skills' },
      { section: '' },
      { section: '../system' },
      { section: 'a b' },
      { workspace: 'a%2Fb' },
      { workspace: 'w'.repeat(201) },
    ]) {
      expect(() => desktopRequestSchemas['settings.open'].parse({ parameters })).toThrow();
    }
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
  'settings.open',
];

describe('DesktopRequestSchemas compatibility', () => {
  it('preserves the 14 existing native methods in their order and appends Settings', () => {
    // arrange
    // act
    const methods = Object.keys(desktopRequestSchemas);
    // assert
    expect(methods).toHaveLength(15);
    expect(methods).toEqual(expectedDesktopRequestMethods);
  });
});
