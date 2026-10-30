export type ProjectFieldValue =
  | { fieldId: string; type: 'text' | 'date'; value: string }
  | { fieldId: string; type: 'number'; value: number | null }
  | { fieldId: string; type: 'single-select' | 'iteration'; value: string | null }
  | { fieldId: string; type: 'multi-select'; value: readonly string[] };
