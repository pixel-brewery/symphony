/**
 * What opening a palette result does. `navigate` opens an existing in-app route (the target
 * screen owns any confirmation it needs); `execute` starts an existing feature flow that needs no
 * confirmation, such as refreshing the GitHub data. The palette closes before either runs.
 *
 * @public
 */
export type PaletteResultAction =
  | {
      readonly kind: 'navigate';
      readonly path: string;
      readonly queryParams?: Readonly<Record<string, string>>;
    }
  | {
      readonly kind: 'execute';
      readonly execute: () => void | Promise<unknown>;
    };
