// #region Imports

import { z } from 'zod';
import { runnerImageArchitectures } from '@symphony/domain-core';

// #endregion

/** Pinned guest image definition resolved from a selected GitHub runner image release. */
export const runnerImageDefinitionSchema = z
  .object({
    releaseTag: z.string().min(1).max(128),
    architecture: z.enum(runnerImageArchitectures),
    ubuntuVersion: z.string().regex(/^\d{2}\.\d{2}$/u),
    ubuntuCodename: z.string().regex(/^[a-z]{3,32}$/u),
    cloudImageRelease: z.string().regex(/^\d{8}(?:\.\d+)?$/u),
    cloudImageFile: z.string().min(1).max(128),
    cloudImageSha256: z.string().length(64),
    aptPackages: z.array(z.string().regex(/^[a-z0-9][a-z0-9.+-]{0,127}$/u)).max(512),
    nodeVersion: z.string().regex(/^\d+\.\d+\.\d+$/u),
    nodeArchive: z.string().min(1).max(128),
    nodeSha256: z.string().length(64),
    environment: z.record(z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/u), z.string().max(2_048)),
    resolvedAt: z.iso.datetime(),
  })
  .strict();
