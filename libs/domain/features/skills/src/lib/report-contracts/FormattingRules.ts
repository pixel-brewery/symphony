export /**
 * How a result has to be written so it stays readable.
 *
 * Every result is rendered by `symphony-markdown` (GitHub-flavored Markdown through `marked`)
 * and by the work tracker. Raw HTML is escaped there and shows up as literal text, and the
 * renderer styles `h3` through `h6` identically, so deeper nesting only costs the reader
 * structure without giving any back.
 */
const formattingRules = [
  'Formatting - the result is rendered as GitHub-flavored Markdown in Symphony and in the work tracker:',
  '',
  '- Start with the first required section heading. No document title, no preamble, no restatement of the task, no closing summary, no sign-off.',
  '- Use `##` for the required sections and at most `###` below them. Deeper levels render identically to `###` and only add noise.',
  '- Never emit raw HTML. It is escaped and reaches the reader as literal text.',
  '- Put every repository path, symbol, command, branch, identifier, and configuration key in backticks.',
  '- Use fenced code blocks with a language tag for commands, diffs, and payloads. Quote the few relevant lines; never paste a whole file.',
  '- Use a table only where the rows are uniform and this contract asks for one, and keep each cell to a single line. Use bullets for everything else.',
  '- One idea per bullet, one or two sentences. A wall of prose under a heading is a defect, and so is a bullet that hides three decisions.',
  '- Use bold only for the fixed verdict labels this contract defines. No emoji, no decorative rules, no ASCII art, no badges.',
  '- Leave one empty line between a heading and its content and between blocks, and none inside a list.',
  '- Write `None` on its own line for a section that genuinely has no content, rather than deleting the section or padding it.',
  '',
];
