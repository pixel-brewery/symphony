export type AutoUpdateEvent =
  | { readonly kind: 'checking' }
  | { readonly kind: 'available' }
  | { readonly kind: 'not-available' }
  | {
      readonly kind: 'downloaded';
      readonly version: string;
      readonly releaseNotes?: string;
    }
  | { readonly kind: 'error' };
