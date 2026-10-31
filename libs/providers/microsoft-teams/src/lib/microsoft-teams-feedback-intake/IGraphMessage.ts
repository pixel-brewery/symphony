export interface IGraphMessage {
  readonly id: string;
  readonly createdDateTime: string;
  readonly webUrl?: string;
  readonly body: { readonly content: string };
  readonly from?: {
    readonly user?: { readonly displayName?: string };
    readonly application?: { readonly displayName?: string };
  } | null;
  readonly mentions: readonly { readonly mentionText: string }[];
  readonly attachments: readonly {
    readonly contentType: string;
    readonly content?: unknown;
  }[];
  readonly replies: readonly IGraphMessage[];
  readonly 'replies@odata.nextLink'?: string;
}
