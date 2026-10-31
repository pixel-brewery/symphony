/**
 * Checks portable workspace glyph boundaries consistently across application boundaries.
 *
 * @public
 */
export class WorkspaceAvatarValidator {
  // #region Methods

  /**
   * Accepts one emoji grapheme, including joined sequences, flags and keycaps.
   *
   * @param value - Entered or selected emoji.
   * @returns Whether the value is one supported emoji.
   * @public
   */
  public static isEmoji(value: string): boolean {
    const trimmed = value.trim();
    return (
      trimmed.length <= 32 &&
      [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)].length ===
        1 &&
      /(?:\p{Extended_Pictographic}|[\p{Regional_Indicator}]{2}|[0-9#*]\uFE0F?\u20E3)/u.test(
        trimmed,
      )
    );
  }

  /**
   * Accepts one or two Unicode letters or numbers after uppercase normalization.
   *
   * @param value - Entered monogram.
   * @returns Whether the normalized value is a supported monogram.
   * @public
   */
  public static isMonogram(value: string): boolean {
    return /^[\p{L}\p{N}]{1,2}$/u.test(value.trim().toUpperCase());
  }

  // #endregion
}
