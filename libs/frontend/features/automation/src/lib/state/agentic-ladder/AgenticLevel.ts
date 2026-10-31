/**
 * How far the AI team may go on its own when a check fails on a pull request Symphony created.
 * `custom` means the switches do not match any level.
 *
 * @public
 */
export type AgenticLevel = 'off' | 'watch' | 'diagnose' | 'repair' | 'full' | 'custom';
