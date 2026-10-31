// #region Imports

import { delimiter } from 'node:path';
import { toolchainDirectories } from './toolchainDirectories';

// #endregion

/** The PATH handed to subprocesses so nested tool calls resolve the same way Symphony does. */
export function toolchainSearchPath(environment: NodeJS.ProcessEnv = process.env): string {
  return toolchainDirectories(environment).join(delimiter);
}
