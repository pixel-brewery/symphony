// #region Imports

import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { provideZonelessChangeDetection, type ApplicationConfig } from '@angular/core';
import { provideSignalFormsConfig, type SignalFormsConfig } from '@angular/forms/signals';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import {
  provideAnimate,
  provideAppComponent,
  provideAutoCompleteBoxComponent,
  provideBreakpoints,
  provideCalendarComponent,
  provideChatComponent,
  provideComboComponent,
  provideCookiesConsentComponent,
  provideDataTableComponent,
  provideDateBoxComponent,
  provideDefaultIconSet,
  provideDialogs,
  provideDrawers,
  provideFileBoxComponent,
  provideFileUploadComponent,
  provideForms,
  provideIcons,
  provideIconSet,
  provideListComponent,
  provideMessageBoxComponent,
  provideMessageBoxes,
  provideNumberBoxComponent,
  providePaginatorComponent,
  providePasswordBoxComponent,
  providePromptBoxComponent,
  provideSchedulerComponent,
  provideSearchBoxComponent,
  provideSelectComponent,
  provideSheets,
  provideTableColumnEditorComponent,
  provideTableComponent,
  provideTextBoxComponent,
  provideTheme,
  provideTimeUpdates,
  provideToasts,
  withDialogBreakpointBehavior,
  withDrawerBreakpointBehavior,
  withDrawerDefaultBehavior,
  withDrawerStackBehavior,
  withSheetBreakpointBehavior,
  withToastStackBehavior,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  Animation,
  EaseIn,
  EaseInOut,
  EaseOut,
  ThemeService as MosaikThemeService,
  type IAnimationReferenceMetadata,
} from '@pixel-brewery/mosaik-elements-foundation';
import { ReiconAliases } from '@pixel-brewery/mosaik-elements-foundation/icons/reicon';
import { diAzuredevopsPlain } from '@pixel-brewery/mosaik-icons/devicon/plain';
import {
  reiconAdd,
  reiconAlertCircle,
  reiconArrowRightCircle,
  reiconArrowUpRightSquare,
  reiconBranchUp,
  reiconCheck,
  reiconCheckCircle,
  reiconChevronLeft,
  reiconChevronRight,
  reiconClipboardCheck,
  reiconCloudUpload,
  reiconComment,
  reiconCopy,
  reiconCpu,
  reiconDownload,
  reiconEdit,
  reiconEye,
  reiconFilter,
  reiconFolder,
  reiconFolderOpen,
  reiconGamepad,
  reiconHierarchySquare,
  reiconHome,
  reiconInfoCircle,
  reiconKanban,
  reiconLinkOff,
  reiconMic,
  reiconMoon,
  reiconPlay,
  reiconPlayCircle,
  reiconPuzzlePiece,
  reiconRefresh,
  reiconSave,
  reiconSearch,
  reiconSettings,
  reiconSidebar,
  reiconSidebar2,
  reiconSidebarLeft,
  reiconSidebarRight,
  reiconSparkle,
  reiconSun,
  reiconTickCircle,
  reiconTrophy,
  reiconTrash,
  reiconUser,
  reiconWarning,
  reiconX,
} from '@pixel-brewery/mosaik-icons/reicon';
import { simpleClaude, simpleGithub } from '@pixel-brewery/mosaik-icons/simple-icons';
import { svglOpenai } from '@pixel-brewery/mosaik-icons/svgl';
import { SohoTheme, type ThemeMode } from '@pixel-brewery/mosaik-themes';
import { provideNavigation, readThemePreference, resolveThemeMode } from '@symphony/frontend-core';
import { provideNotifications } from '@symphony/frontend-notification';
import { presentationRoutes } from '@symphony/frontend-presentation';
import { provideSearch } from '@symphony/frontend-search';
import { provideQuickCreate } from '@symphony/frontend-quick-create';
import { provideWidget } from '@symphony/frontend-widget';
import { provideSettings, settingsRoutes } from '@symphony/frontend-setting';
import { withPowerSettings } from '@symphony/frontend-interaction';
import { provideUpdate, withUpdateSettings } from '@symphony/frontend-update';
import { applicationThemeOverrides } from '@symphony/frontend-ui';
import { applicationProductComposition } from './ApplicationProductComposition';

// #endregion

const SIGNAL_FORM_STATUS_CLASSES: SignalFormsConfig['classes'] = {
  'ng-touched': (state) => state.state().touched(),
  'ng-untouched': (state) => !state.state().touched(),
  'ng-dirty': (state) => state.state().dirty(),
  'ng-pristine': (state) => !state.state().dirty(),
  'ng-valid': (state) => state.state().valid(),
  'ng-invalid': (state) => state.state().invalid(),
  'ng-pending': (state) => state.state().pending(),
};

function resolveInitialThemeMode(): ThemeMode {
  if (window.location.hash === '#/menu-bar') return 'dark';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return resolveThemeMode(readThemePreference(window.localStorage), prefersDark);
}

const initialThemeMode = resolveInitialThemeMode();

MosaikThemeService.configure({ defaultThemeMode: initialThemeMode });

export const shellConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideUpdate(),
    provideSettings(withUpdateSettings(), withPowerSettings()),
    ...applicationProductComposition.flatMap((feature) => feature.providers),
    provideQuickCreate(),
    provideWidget(),
    provideSearch(),
    provideNavigation(),
    provideRouter(
      presentationRoutes([
        ...applicationProductComposition.flatMap((feature) => feature.routes),
        ...settingsRoutes,
      ]),
      withHashLocation(),
      withComponentInputBinding(),
    ),
    { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
    provideTheme({
      theme: SohoTheme.SOHO_THEME,
      mode: initialThemeMode,
      overrides: applicationThemeOverrides,
    }),
    provideAppComponent({ hasHeader: true, hasNav: false }),
    provideBreakpoints(),
    provideAnimate({
      animations: {
        fadeSlideInUp: {
          initial: { opacity: 0, transform: 'translateY(16px)' },
          steps: [{ opacity: 1, transform: 'translateY(0)' }],
          options: { delay: 0, duration: 1_000, easing: EaseInOut.Quad },
        } satisfies IAnimationReferenceMetadata,
        fadeSlideInDown: {
          initial: { opacity: 0, transform: 'translateY(-16px)' },
          steps: [{ opacity: 1, transform: 'translateY(0)' }],
          options: { delay: 0, duration: 1_000, easing: EaseInOut.Quad },
        } satisfies IAnimationReferenceMetadata,
        fadeSlideInLeft: {
          initial: { opacity: 0, transform: 'translateX(-16px)' },
          steps: [{ opacity: 1, transform: 'translateX(0)' }],
          options: { delay: 0, duration: 1_000, easing: EaseInOut.Quad },
        } satisfies IAnimationReferenceMetadata,
        fadeSlideInRight: {
          initial: { opacity: 0, transform: 'translateX(16px)' },
          steps: [{ opacity: 1, transform: 'translateX(0)' }],
          options: { delay: 0, duration: 1_000, easing: EaseInOut.Quad },
        } satisfies IAnimationReferenceMetadata,
        homeTileExit: {
          initial: { opacity: 1, transform: 'scale3d(1, 1, 1)' },
          steps: [{ opacity: 0, transform: 'scale3d(0, 0.55, 1)' }],
          options: { delay: 0, duration: 600, easing: EaseOut.Cubic, fill: 'forwards' },
        } satisfies IAnimationReferenceMetadata,
        homeTileEnter: {
          initial: { opacity: 0, transform: 'scale3d(0.85, 0.85, 1)' },
          steps: [{ opacity: 1, transform: 'scale3d(1, 1, 1)' }],
          options: { delay: 0, duration: 1_500, easing: EaseIn.Cubic, fill: 'forwards' },
        } satisfies IAnimationReferenceMetadata,
      },
    }),
    provideToasts(withToastStackBehavior({})),
    provideNotifications(),
    provideTextBoxComponent({ appearance: 'outline', variant: 'primary' }),
    provideDateBoxComponent({ appearance: 'outline', variant: 'primary' }),
    provideAutoCompleteBoxComponent({ appearance: 'outline', variant: 'primary' }),
    provideCalendarComponent({ appearance: 'outline', variant: 'primary' }),
    provideChatComponent(),
    provideComboComponent({ appearance: 'outline', variant: 'primary' }),
    provideCookiesConsentComponent(),
    provideDataTableComponent(),
    provideFileBoxComponent({
      appearance: 'outline',
      variant: 'primary',
      isClearable: true,
    }),
    provideFileUploadComponent(),
    provideListComponent(),
    provideMessageBoxComponent(),
    provideNumberBoxComponent({ appearance: 'outline', variant: 'primary' }),
    providePaginatorComponent(),
    providePasswordBoxComponent({ appearance: 'outline', variant: 'primary' }),
    providePromptBoxComponent({ appearance: 'outline', variant: 'primary' }),
    provideSchedulerComponent(),
    provideSearchBoxComponent({ appearance: 'outline', variant: 'primary' }),
    provideSelectComponent({ appearance: 'outline', variant: 'primary' }),
    provideTableComponent(),
    provideTableColumnEditorComponent(),
    provideDrawers(
      withDrawerDefaultBehavior({
        position: 'right',
        enter: Animation.slideInRight,
        exit: Animation.slideOutRight,
        size: { width: '70%' },
        hasBackdrop: true,
        closeable: true,
        pressEscapeToClose: true,
        clickOutsideToClose: true,
      }),
      withDrawerStackBehavior(),
      withDrawerBreakpointBehavior({
        breakpoints: [
          { breakpoint: 'xs', size: { height: '100%', width: '100%' } },
          { breakpoint: 'sm', size: { height: '100%', width: '100%' } },
        ],
      }),
    ),
    provideDialogs(
      withDialogBreakpointBehavior({
        breakpoints: [
          { breakpoint: 'xs', size: { height: '100%', width: '100%' } },
          { breakpoint: 'sm', size: { height: '100%', width: '100%' } },
        ],
      }),
    ),
    provideSheets(
      withSheetBreakpointBehavior({
        breakpoints: [
          { breakpoint: 'xs', size: { height: '50dvh', width: '100%' } },
          { breakpoint: 'sm', size: { height: '50dvh', width: '100%' } },
        ],
      }),
    ),
    provideMessageBoxes(),
    provideForms(),
    provideTimeUpdates(),
    provideSignalFormsConfig({ classes: SIGNAL_FORM_STATUS_CLASSES }),
    provideIconSet('reicon', ReiconAliases),
    provideDefaultIconSet('reicon'),
    provideIcons({
      arrowRight: reiconArrowRightCircle,
      cloudArrowRight: reiconCloudUpload,
      bot: reiconCpu,
      add: reiconAdd,
      board: reiconKanban,
      branch: reiconBranchUp,
      checkCircle: reiconCheckCircle,
      checkmarkCircle: reiconTickCircle,
      checkmark: reiconCheck,
      chevronLeft: reiconChevronLeft,
      chevronRight: reiconChevronRight,
      clipboardTask: reiconClipboardCheck,
      clear: reiconX,
      comment: reiconComment,
      copy: reiconCopy,
      delete: reiconTrash,
      disconnect: reiconLinkOff,
      download: reiconDownload,
      edit: reiconEdit,
      eyeShow: reiconEye,
      error: reiconAlertCircle,
      errorCircle: reiconAlertCircle,
      executionOutline: reiconPlayCircle,
      filter: reiconFilter,
      flow: reiconHierarchySquare,
      folder: reiconFolder,
      folderOpen: reiconFolderOpen,
      games: reiconGamepad,
      homeOutline: reiconHome,
      info: reiconInfoCircle,
      leaderboard: reiconTrophy,
      mic: reiconMic,
      open: reiconArrowUpRightSquare,
      save: reiconSave,
      panelLeft: reiconSidebarLeft,
      panelLeftContract: reiconSidebar,
      panelRight: reiconSidebarRight,
      panelRightContract: reiconSidebar2,
      person: reiconUser,
      play: reiconPlay,
      search: reiconSearch,
      settings: reiconSettings,
      skills: reiconPuzzlePiece,
      sparkle: reiconSparkle,
      sync: reiconRefresh,
      weatherMoon: reiconMoon,
      weatherSunny: reiconSun,
      warning: reiconWarning,
      azureDevOps: diAzuredevopsPlain,
      claude: simpleClaude,
      github: simpleGithub,
      openai: svglOpenai,
    }),
  ],
};
