/**
 * In-app destinations the main process may open in a renderer window. Settings paths carry the
 * workspace and section as query parameters and are validated by the receiving route.
 *
 * @public
 */
export type DesktopNavigationPath =
  | '/main/home'
  | '/main/inbox'
  | '/main/actions'
  | '/main/board?create=true'
  | '/main/home?notifications=open'
  | `/settings${string}`;
