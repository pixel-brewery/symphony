// #region Imports

import { NOISE_TOKENS } from './NoiseTokens';
import { tokenize } from './tokenize';

// #endregion

export /** Tokens of a locally configured model id; gateway ids carry a `provider/` prefix that is routing, not identity. */
function targetTokens(model: string): readonly string[] {
  const withoutProvider = model.includes('/') ? model.slice(model.indexOf('/') + 1) : model;
  return tokenize(withoutProvider).filter((token) => !NOISE_TOKENS.has(token));
}
