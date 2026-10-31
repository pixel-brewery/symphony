// #region Imports

import type { BoxingContenderId } from './BoxingContenderId';

// #endregion

/** Original contender names and their documented knockdown targets. @public */
export const BoxingContenders: readonly {
  readonly id: BoxingContenderId;
  readonly name: string;
  readonly weakPunch: 'body' | 'payoff';
  readonly weakPosition: 'level' | 'above' | 'below';
}[] = [
  { id: 'iron-fists', name: 'Iron Fists', weakPunch: 'body', weakPosition: 'level' },
  { id: 'jabbin-jack', name: 'Jabbin’ Jack', weakPunch: 'payoff', weakPosition: 'above' },
  { id: 'lefty-oleary', name: 'Lefty O’Leary', weakPunch: 'body', weakPosition: 'below' },
  { id: 'macho-man', name: 'Macho Man', weakPunch: 'payoff', weakPosition: 'level' },
];
