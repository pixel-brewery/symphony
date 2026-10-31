// #region Imports

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, _electron as electron } from '@playwright/test';

// #endregion

test('pairs the packaged mobile surface through desktop approval', async ({ browser }) => {
  // arrange
  test.setTimeout(120_000);
  const workspace = resolve('.');
  const outputDirectory = resolve('output/playwright');
  const configurationRoot = resolve(outputDirectory, `mobile-pairing-${process.pid}`);
  mkdirSync(outputDirectory, { recursive: true });
  rmSync(configurationRoot, { force: true, recursive: true });
  const app = await electron.launch({
    args: ['.'],
    cwd: workspace,
    env: {
      ...process.env,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(configurationRoot, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(configurationRoot, 'legacy-skills'),
      SYMPHONY_MOBILE_ASSETS_PATH: resolve('dist/apps/mobile/browser'),
      SYMPHONY_MOBILE_HOST: '127.0.0.1',
      SYMPHONY_MOBILE_PORT_START: '49351',
      SYMPHONY_MOBILE_PORT_END: '49351',
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      SYMPHONY_AGENT_MODE: 'simulated',
    },
  });

  // act
  try {
    const desktop = await app.firstWindow();
    const desktopErrors: string[] = [];
    desktop.on('pageerror', (error) => desktopErrors.push(error.stack ?? error.message));
    await expect(desktop.getByTestId('orbit-view')).toBeVisible();
    await desktop.getByTestId('global-workspace-filter').click();
    await desktop.getByTestId('workspace-menu-settings').click();
    await desktop.getByTestId('global-settings-section-mobile').click();
    const accessToggle = desktop.getByTestId('mobile-access-toggle');
    await expect(accessToggle).toHaveJSProperty('isChecked', false);
    await accessToggle.click();
    await expect(accessToggle).toHaveJSProperty('isChecked', true);
    await expect(desktop.getByTestId('create-mobile-pairing')).toBeVisible();
    await desktop.getByTestId('create-mobile-pairing').click();
    const pairingAddress = await desktop
      .getByTestId('mobile-pairing-address')
      .evaluate((element) => (element as HTMLElement & { value: string }).value);
    expect(pairingAddress).toMatch(/^http:\/\/127\.0\.0\.1:49351\/pair#pair=/u);
    const desktopPairingGeometry = await desktop
      .getByTestId('mobile-pairing-code')
      .evaluate((container) => {
        const qrCode = container.querySelector('mosaik-qrcode');
        const pairingAddressControl = container.querySelector('[test-id="mobile-pairing-address"]');
        if (!qrCode || !pairingAddressControl) throw new Error('Pairing controls are missing.');
        const containerBox = container.getBoundingClientRect();
        const qrCodeBox = qrCode.getBoundingClientRect();
        const pairingAddressBox = pairingAddressControl.getBoundingClientRect();
        return {
          addressBelowQrCode: pairingAddressBox.top >= qrCodeBox.bottom,
          addressWithinContainer:
            pairingAddressBox.left >= containerBox.left &&
            pairingAddressBox.right <= containerBox.right,
        };
      });
    expect(desktopPairingGeometry).toEqual({
      addressBelowQrCode: true,
      addressWithinContainer: true,
    });
    await desktop.screenshot({
      path: resolve(outputDirectory, 'desktop-mobile-pairing.png'),
      fullPage: true,
    });

    const mobile = await browser.newPage({
      viewport: { width: 393, height: 852 },
      colorScheme: 'dark',
    });
    const mobileConsoleErrors: string[] = [];
    const mobileApiResponses: { readonly pathname: string; readonly status: number }[] = [];
    mobile.on('console', (message) => {
      if (message.type() === 'error') mobileConsoleErrors.push(message.text());
    });
    mobile.on('response', (response) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith('/api/mobile/')) {
        mobileApiResponses.push({ pathname: url.pathname, status: response.status() });
      }
    });
    let interruptSnapshot = true;
    await mobile.route('**/api/mobile/v1/snapshot', async (route) => {
      if (!interruptSnapshot) {
        await route.continue();
        return;
      }
      interruptSnapshot = false;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'MOBILE_RESPONSE_INVALID',
          message: 'Symphony could not prepare the mobile data.',
        }),
      });
    });
    await mobile.goto(pairingAddress, { waitUntil: 'domcontentloaded' });
    await expect(mobile.getByTestId('mobile-verification-code')).toBeVisible();

    // assert
    const pairingGeometry = await mobile.getByTestId('mobile-symphony-mark').evaluate((mark) => {
      const image = mark as HTMLImageElement;
      const markBox = mark.getBoundingClientRect();
      const section = mark.closest('section');
      const sectionStyle = section ? getComputedStyle(section) : undefined;
      return {
        markWidth: markBox.width,
        markHeight: markBox.height,
        markLoaded: image.complete && image.naturalWidth > 0,
        paddingLeft: sectionStyle?.paddingLeft,
        paddingRight: sectionStyle?.paddingRight,
        stylesheetMedia: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
          .map((link) => link.media)
          .join(','),
      };
    });
    expect(pairingGeometry).toEqual({
      markWidth: 48,
      markHeight: 48,
      markLoaded: true,
      paddingLeft: '24px',
      paddingRight: '24px',
      stylesheetMedia: '',
    });
    const themeVariableNames = [
      '--soho-font-family',
      '--soho-layout-radius',
      '--soho-layout-space',
      '--soho-layout-thickness',
      '--soho-typography-body1-font-size',
      '--soho-scheme-dark-background',
      '--soho-scheme-dark-foreground',
      '--soho-scheme-light-background',
      '--soho-scheme-light-foreground',
      '--soho-color-dark-primary-500',
      '--soho-color-light-primary-500',
    ];
    const desktopThemeVariables = await desktop.evaluate((variableNames) => {
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(
        variableNames.map((variableName) => [variableName, style.getPropertyValue(variableName)]),
      );
    }, themeVariableNames);
    const mobileThemeVariables = await mobile.evaluate((variableNames) => {
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(
        variableNames.map((variableName) => [variableName, style.getPropertyValue(variableName)]),
      );
    }, themeVariableNames);
    expect(mobileThemeVariables).toEqual(desktopThemeVariables);
    expect(mobileThemeVariables).toEqual({
      '--soho-font-family': "'Inter', ui-sans-serif, system-ui, sans-serif",
      '--soho-layout-radius': '10px',
      '--soho-layout-space': '8px',
      '--soho-layout-thickness': '1px',
      '--soho-typography-body1-font-size': '16px',
      '--soho-scheme-dark-background': '#0a0a0a',
      '--soho-scheme-dark-foreground': '#fafafa',
      '--soho-scheme-light-background': '#ffffff',
      '--soho-scheme-light-foreground': '#0a0a0a',
      '--soho-color-dark-primary-500': '#e5e5e5',
      '--soho-color-light-primary-500': '#171717',
    });
    await expect
      .poll(() => mobile.evaluate(() => document.documentElement.getAttribute('theme-mode')))
      .toBe('dark');
    await mobile.screenshot({
      path: resolve(outputDirectory, 'mobile-pairing-ready.png'),
      fullPage: true,
    });
    const verificationCode = await mobile
      .getByTestId('mobile-verification-code')
      .evaluate((element) => (element as HTMLElement & { text: string }).text.trim());
    expect(verificationCode).toMatch(/^\d{6}$/u);
    const pairingRequest = desktop.locator('[test-id^="mobile-pairing-request-"]');
    await expect(pairingRequest).toContainText(`Verification code ${verificationCode}`);
    await pairingRequest.getByRole('button', { name: 'Approve' }).click();
    const connectionError = mobile.getByTestId('mobile-connection-error');
    await expect(connectionError).toBeVisible();
    await expect(mobile.getByTestId('mobile-symphony-mark')).toBeVisible();
    await expect(connectionError).toContainText('Symphony could not prepare the mobile data.');
    const connectionScrollTop = await mobile
      .locator('[test-id="mobile-presenter-view"] > main')
      .evaluate((main) => main.scrollTop);
    expect(connectionScrollTop).toBe(0);
    const errorGeometry = await connectionError.evaluate((message) => {
      return {
        clientHeight: message.clientHeight,
        scrollHeight: message.scrollHeight,
      };
    });
    expect(errorGeometry.scrollHeight).toBeLessThanOrEqual(errorGeometry.clientHeight + 1);
    expect(mobileApiResponses).toContainEqual({
      pathname: '/api/mobile/v1/snapshot',
      status: 500,
    });
    expect(mobileConsoleErrors).toEqual([
      'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
    ]);
    await mobile.screenshot({
      path: resolve(outputDirectory, 'mobile-pairing-error.png'),
      fullPage: true,
    });
    mobileConsoleErrors.length = 0;
    await mobile.getByTestId('retry-mobile-connection').click();
    await expect(mobile.getByTestId('mobile-home-view')).toBeVisible({ timeout: 30_000 });
    await expect(mobile.getByTestId('mobile-connection-error')).toHaveCount(0);
    await expect.poll(() => mobile.url()).not.toContain('#pair=');
    expect(mobileApiResponses).toEqual(
      expect.arrayContaining([
        { pathname: '/api/mobile/v1/pairing/propose', status: 202 },
        { pathname: '/api/mobile/v1/pairing/status', status: 200 },
        { pathname: '/api/mobile/v1/snapshot', status: 200 },
      ]),
    );
    expect(mobileConsoleErrors).toEqual([]);
    expect(desktopErrors).toEqual([]);
    await mobile.screenshot({
      path: resolve(outputDirectory, 'mobile-pairing-connected.png'),
      fullPage: true,
    });
    await mobile.getByTestId('mobile-employees').scrollIntoViewIfNeeded();
    const employeeImage = mobile.locator('symphony-agent-figure [data-figure-sprite]').first();
    await expect(employeeImage).toHaveCSS(
      'background-image',
      /figures\/(blue|mint|orange|purple|gold|rose)-v2\.png/u,
    );
    expect(
      await employeeImage.evaluate(async (element) => {
        const image = new Image();
        image.src = (element as HTMLElement).style.backgroundImage.slice(5, -2);
        await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      }),
    ).toEqual([1536, 2288]);
    await mobile.emulateMedia({ reducedMotion: 'no-preference' });
    const employeeButton = mobile.locator('[test-id^="mobile-employee-"]').first();
    const employeeFigure = employeeButton.locator('[data-figure]');
    await employeeButton.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await expect(employeeFigure).toHaveAttribute('data-motion', 'true');
    const employeeBounds = (await employeeImage.boundingBox())!;
    const navigationBounds = (await mobile
      .getByRole('navigation', { name: 'Main navigation' })
      .boundingBox())!;
    expect(employeeBounds.y + employeeBounds.height).toBeLessThan(navigationBounds.y);
    await expect(employeeFigure).toHaveAttribute('data-state', 'idle');
    await employeeButton.click();
    await expect(employeeFigure).toHaveAttribute('data-animation', 'waving');
    await expect(employeeImage).toHaveAttribute('data-row', '3');
    await mobile.emulateMedia({ reducedMotion: 'reduce' });
    await expect(employeeFigure).toHaveAttribute('data-static', 'true');
    await expect(employeeImage).toHaveAttribute('data-row', '0');
    await mobile.screenshot({
      path: resolve(outputDirectory, 'mobile-employees-opendots.png'),
      fullPage: true,
    });
    await mobile.close();
  } finally {
    await app.close();
    rmSync(configurationRoot, { force: true, recursive: true });
  }
});
