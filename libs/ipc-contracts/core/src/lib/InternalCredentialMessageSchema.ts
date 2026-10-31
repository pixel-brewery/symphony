// #region Imports

import { z } from 'zod';
import { azureDevOpsCredentialReferenceSchema } from './AzureDevOpsCredentialReferenceSchema';

// #endregion

const credentialReferencesSchema = z
  .array(azureDevOpsCredentialReferenceSchema)
  .max(200)
  .readonly();
const credentialRequestIdSchema = z.string().uuid();
const credentialResolutionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('resolved'), secret: z.string().min(1).max(512) }),
  z.object({ status: z.literal('missing') }),
  z.object({ status: z.literal('unavailable') }),
]);

/** Bidirectional Main/Utility-Process credential message, never accepted from a renderer channel. */
export const internalCredentialMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('credentials.available'),
    references: credentialReferencesSchema,
  }),
  z.object({
    type: z.literal('credentials.resolve.request'),
    requestId: credentialRequestIdSchema,
    reference: azureDevOpsCredentialReferenceSchema,
  }),
  z.object({
    type: z.literal('credentials.resolve.response'),
    requestId: credentialRequestIdSchema,
    reference: azureDevOpsCredentialReferenceSchema,
    result: credentialResolutionSchema,
  }),
]);
