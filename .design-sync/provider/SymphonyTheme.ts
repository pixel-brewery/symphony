// Reproduces Symphony's runtime theme wiring for design-system previews.
//
// The renderer applies the Soho theme deep-merged with Symphony's own
// application theme overrides, in the mode the user last chose
// (apps/renderer/src/configuration/ShellConfig.ts -> provideTheme).
// Without the overrides the previews would render as stock Mosaik, so this
// module rebuilds the same merged theme object for the React previews and
// exposes it as SYMPHONY_THEME for cfg.provider to hand to <Theme2 global>.

import { createElement, useEffect, type ReactNode } from 'react';

import { ThemeService } from '@pixel-brewery/mosaik-elements-foundation';
import { ReiconAliases } from '@pixel-brewery/mosaik-elements-foundation/icons/reicon';
import { IconRegistry } from '@pixel-brewery/mosaik-icons';
import { Theme2 } from '@pixel-brewery/mosaik-elements-react';
import { SohoTheme } from '@pixel-brewery/mosaik-themes';

import { applicationThemeOverrides } from '../../libs/frontend/ui/src/lib/theme/ApplicationThemeOverrides';
import { SYMPHONY_ICONS } from './SymphonyIcons';

type Plain = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Mirrors the deepMerge the Angular provideTheme() uses: overrides win, and
// nested objects merge key by key rather than replacing the whole branch.
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : (override as T);
  }

  const result: Plain = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in base ? deepMerge((base as Plain)[key], value) : value;
  }

  return result as T;
}

export const SYMPHONY_THEME = deepMerge(SohoTheme.SOHO_THEME, applicationThemeOverrides);

// The host page's data-theme ("light" or "dark", as tokens.json names the
// themes) picks the mode unless the provider is given one.
const documentMode = (): 'light' | 'dark' =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';

// Writing the CSS variables is only half of theming. Every Mosaik element
// carries one stylesheet per theme (joy / memphis / soho / cosmopolitan) and picks
// between them by subscribing to ThemeService.themeChanged: until the service
// publishes a theme, themeName stays '' and the element adopts no stylesheet at
// all, rendering as a bare shadow-DOM <button> in Times. Symphony's renderer
// configures the service at startup (ShellConfig.ts) and Angular's provideTheme
// initializes it; previews have neither, so this module does both.
// Mosaik ships no icons by default -- an <Icon name="..."> only resolves if the
// name was registered first. Symphony installs ReiconAliases as its default
// system set before adding its product aliases, so previews reproduce the same
// registration order; without it built-in control affordances render as nothing.
IconRegistry.instance.registerSet('reicon', ReiconAliases);
IconRegistry.instance.setDefaultSet('reicon');
IconRegistry.instance.register(SYMPHONY_ICONS);

ThemeService.configure({
  defaultTheme: SYMPHONY_THEME,
  defaultThemeMode: documentMode(),
  autoInitialize: false,
});

ThemeService.instance.initialize();

/**
 * Wraps every preview so it renders the way Symphony does.
 *
 * <Theme2 global> alone is not enough. ThemeService publishes the active theme
 * through a plain event emitter with no replay, while each element subscribes
 * to it in its own connectedCallback -- which runs after this module has
 * already initialized the service. The elements therefore miss the only
 * notification, keep themeName = '' and adopt no themed stylesheet.
 *
 * Re-applying the theme once from an effect fixes the ordering: by then every
 * element below is connected and subscribed, so the emit reaches all of them.
 *
 * The theme is applied under a scope named after the theme itself. ThemeService
 * emits the *scope* name on themeChanged, while Themeable reads that value as
 * the *theme* name to pick its stylesheet from the element's themes map
 * ({ joy, memphis, soho, cosmopolitan }). Applying to the default (unnamed) scope
 * therefore hands every element an empty name and it adopts nothing.
 */
const THEME_SCOPE = SYMPHONY_THEME.name;

/**
 * `mode` mirrors Symphony's light/dark preference and defaults to the host
 * page's data-theme. ThemeService resolves the scheme from the document's
 * `theme-mode` attribute, so it is set before the theme is applied.
 */
export const SymphonyThemeProvider = ({
  children,
  mode = documentMode(),
}: {
  children?: ReactNode;
  mode?: 'light' | 'dark';
}) => {
  useEffect(() => {
    document.documentElement.setAttribute('theme-mode', mode);
    ThemeService.instance.applyTheme(SYMPHONY_THEME, THEME_SCOPE);

    // Learning the theme name is not enough either: an element only re-adopts
    // its stylesheet when the theme observer fires, and that observer is a
    // MutationObserver on the document's theme attributes. Those were set at
    // module load, before any element existed, so re-setting them here is what
    // actually makes the Soho stylesheet take hold.
    document.documentElement.setAttribute('theme', THEME_SCOPE);
    document.documentElement.setAttribute('theme-mode', mode);
  }, [mode]);

  return createElement(
    Theme2,
    { global: true, name: THEME_SCOPE, theme: SYMPHONY_THEME },
    children,
  );
};
