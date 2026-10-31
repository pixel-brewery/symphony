// #region Imports

import {
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  type ApplicationConfig,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideBreakpoints,
  provideIcons,
  provideTheme,
  ThemeService,
} from '@pixel-brewery/mosaik-elements-angular';
import { ThemeService as MosaikThemeService } from '@pixel-brewery/mosaik-elements-foundation';
import { SohoTheme, type ThemeMode } from '@pixel-brewery/mosaik-themes';
import { readThemePreference, resolveThemeMode } from '@symphony/frontend-core/mobile';
import {
  provideMobileBrowserFeature,
  MOBILE_THEME_APPLIER,
} from '@symphony/frontend-feature-mobile/browser';
import { provideMobileWorkNavigation } from '@symphony/frontend-feature-work/mobile';
import { provideMobileDeliveryNavigation } from '@symphony/frontend-feature-delivery/mobile';
import { provideMobilePresentationNavigation } from '@symphony/frontend-presentation/mobile';
import { applicationThemeOverrides, mobileNavigationIcons } from '@symphony/frontend-ui/mobile';
import { appRoutes } from './AppRoutes';

// #endregion

function resolveInitialThemeMode(): ThemeMode {
  const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  try {
    return resolveThemeMode(readThemePreference(globalThis.localStorage), prefersDark);
  } catch {
    return resolveThemeMode(undefined, prefersDark);
  }
}

const initialThemeMode = resolveInitialThemeMode();

MosaikThemeService.configure({ defaultThemeMode: initialThemeMode });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideMobileBrowserFeature(),
    provideRouter(appRoutes),
    provideTheme({
      theme: SohoTheme.SOHO_THEME,
      mode: initialThemeMode,
      overrides: applicationThemeOverrides,
    }),
    {
      provide: MOBILE_THEME_APPLIER,
      useFactory: () => {
        const themeService = inject(ThemeService);
        return (mode: ThemeMode): void => themeService.applyTheme(mode);
      },
    },
    provideBreakpoints(),
    provideIcons(mobileNavigationIcons),
    provideMobileWorkNavigation(),
    provideMobileDeliveryNavigation(),
    provideMobilePresentationNavigation(),
  ],
};
