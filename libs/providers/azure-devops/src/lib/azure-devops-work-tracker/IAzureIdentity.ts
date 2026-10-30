export interface IAzureIdentity {
  readonly id?: string;
  readonly displayName?: string;
  readonly uniqueName?: string;
  readonly imageUrl?: string;
  readonly _links?: { readonly avatar?: { readonly href?: string } };
}
