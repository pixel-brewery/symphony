export type SquirrelStartupAction =
  | {
      readonly kind: 'run-update';
      readonly executable: string;
      readonly arguments: readonly string[];
    }
  | { readonly kind: 'quit' };
