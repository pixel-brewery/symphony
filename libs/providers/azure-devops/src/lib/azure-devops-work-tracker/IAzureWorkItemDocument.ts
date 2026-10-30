export interface IAzureWorkItemDocument {
  readonly id: number;
  readonly rev: number;
  readonly url?: string;
  readonly fields?: Readonly<Record<string, unknown>>;
  readonly _links?: { readonly html?: { readonly href?: string } };
}
