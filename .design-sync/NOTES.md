# Design-sync notes — Symphony

Repo-specific findings for `/design-sync`. Read this before touching the config.

## What is actually being synced

Symphony is an Angular + Electron application, not a component library. The
design system it renders is **Mosaik**, consumed as Lit web components. The sync
therefore bundles `@pixel-brewery/mosaik-elements-react` — Mosaik's own React
wrappers — pinned to the same version Symphony depends on, and scoped to the
~110 `<mosaik-*>` tags Symphony actually uses (plus Mosaik's React-only
overlay providers and `Theme2`).

- The version is read from Symphony's `package.json`, never hardcoded.
- The installed Mosaik packages must match Symphony’s exact dependency version.
  The setup reuses the installed package artifacts when all five match; otherwise
  it installs the published artifacts from GitHub Packages. A companion build
  is not a substitute: its version may still match while its source has moved on.
  Mosaik runtime and component fixes ship in the published packages. The sole
  consumer Yarn patch normalizes path headers in the `0.1.183` design-document
  CLI; the [consumer build contract](../docs/architecture/application-updates/packaging.md#cross-platform-consumer-build-contract)
  defines that build-only exception. Avatar and Persona retain their
  published API; employee figures belong to Symphony's Angular component.
  No Mosaik runtime or component source is copied into Symphony.
- `libs/frontend/ui` is Angular and cannot render in Claude Design. Do not try.

## Where the synced system lives

The design-system sources live in `.design-sync/`. `build-artifact.mjs` produces
its local publishable output under `.ds-sync/artifact/project/`, using the Mosaik
version pinned by Symphony and the application's Soho theme. The redesign handoff
and its local artboard sources live in `docs/workitems/macos-redesign/`.

A design canvas keeps its own design-system copy under `project/ds/mosaik/`.
After a rebuild, update that copy so the canvas picks up the new bundle. Cloud
artifact destinations are owner-specific setup; this repository does not require
a former maintainer's private artifact URL to build or inspect the handoff.

## Always run the setup script first

```bash
node .design-sync/setup-scratch.mjs      # install + stylesheet + icons + entry + scope
node .design-sync/generate-docs.mjs      # per-component docs (groups come from these)
node .design-sync/generate-props.mjs     # clean prop contracts -> cfg.dtsPropsFor
node .design-sync/build-artifact.mjs     # the artifact's files -> .ds-sync/artifact/project/
node .design-sync/check-artifact.mjs     # renders every preview as the artifact frames it
yarn design:md
```

When Mosaik artifacts are missing locally, `setup-scratch.mjs` reads an existing
GitHub Packages read token from `MOSAIK_PACKAGES_TOKEN` (cloud sessions), then
`GITHUB_TOKEN`, then `gh auth token`. Its scratch `.npmrc` contains only an
environment placeholder; the value is passed only to the npm install process.
No GitHub credential is needed when all five artifacts are cached. In a cloud session
`repo.yarnpkg.com` is blocked, so Corepack cannot fetch Yarn 4: install the repo
with `@yarnpkg/cli-dist` at the pinned version from the npm registry instead.

`build-artifact.mjs` writes every file the Design System artifact serves under
`project/`; publish that folder to the artifact (several calls of at most 255
paths, `project/design-system.json` last, produced with
`--index <the index read from the artifact right before>`). The former
claude.ai/design converter (`.ds-sync/package-build.mjs`, `ds-bundle/`) belongs to
standalone Claude Design, which closes on 2026-12-14; its config keys
(`dtsPropsFor`, `componentSrcMap`, `overrides`) are what the artifact build reads.

The last step is not part of the bundle build: it refreshes the repository's committed `DESIGN.md` from the
same theme sources, so the design system stays readable locally even when the artifact has not been built on
this machine. Run it after any theme, icon, or override-stylesheet change, not only after a sync.

`.ds-sync/` is gitignored, so the scratch install and everything the setup
script generates into it is rebuilt from scratch on any machine. Two further
outputs are gitignored because they are machine-written and fully regenerable:
`.design-sync/docs/` (331 files, 1.7 MB, from `generate-docs.mjs`) and
`.design-sync/provider/SymphonyIcons.ts` and `.design-sync/styles/shim/`
(both from `setup-scratch.mjs`; the shim embeds an absolute path, so committing
it would show as modified on every machine). Everything
else under `.design-sync/` is committed — in particular the 115 hand-authored
files in `previews/`, which are the expensive part of this sync.

## Four traps that all look identical

Every one of these renders components as grey browser-default boxes in Times.
If previews ever look like that again, walk this list in order.

1. **The foundation barrel is not side-effect-free.** Bundling it drags in every
   element Symphony never uses (apexcharts alone is 22 MB on disk) and the
   bundle came out at 12.5 MB against a 12 MB upload limit. The setup script
   sets `sideEffects: false` on the scratch copy and generates a slim entry
   exporting only the components in scope. Result: ~5.3 MB.
2. **The `theme` attribute must exist before Mosaik loads.** Elements resolve
   their themed stylesheet in Lit's static `finalizeStyles()`, which reads
   `document.documentElement`'s `theme` attribute and caches the result when the
   class is finalized — during module evaluation. `provider/documentTheme.ts`
   imports nothing and is imported first in the generated entry for exactly this
   reason.
3. **`ThemeService` emits the _scope_ name, `Themeable` reads it as the _theme_
   name.** Applying the theme to the default (unnamed) scope hands every element
   `themeName = ''`, so it adopts no stylesheet. The provider applies under a
   scope named after the theme (`soho`).
4. **Provider modules must resolve against the scratch install.** esbuild
   resolves a file's bare imports from that file's own location. While the
   provider lived in `.design-sync/provider/`, `@pixel-brewery/...` resolved
   against _Symphony's_ `node_modules`, putting a second copy of Mosaik in the
   bundle: every custom element defined twice, and an icon registry singleton
   the elements never read, so icons silently rendered as nothing. The setup
   script stages the modules to `.ds-sync/scratch/_symphony-provider/` —
   **beside** the package, not inside it, because the React package declares
   `sideEffects: false` and a module under it gets its side-effect-only import
   tree-shaken away (which reintroduces trap 2).

## Theme, icons and fonts

- Symphony renders **Soho** through the public theme provider. `applicationThemeOverrides`
  is empty after the Joy override audit; the Soho palette, Inter stack,
  8 px layout rhythm, 10 px radius scale and component typography own the appearance.
  Desktop, menu bar, Mobile and this preview use the same theme.
- Preview frames bundle the OFL Inter font (latin, 300/400/500/600/700).
  Legacy preview families remain available for technical examples. Desktop and Mobile
  ship the same OFL font locally through the shared `fonts.scss`; its licence is in
  `resources/fonts`. Add any new theme family
  to both the setup’s Fontsource install and its `families` list.
- Icons use Mosaik's complete `ReiconAliases` system set plus Symphony's own
  product vocabulary (`add`, `board`, `branch`, …), lifted out of `provideIcons()`
  in `ShellConfig.ts` by the setup script. Preview
  authors must use those names — Material-style names resolve to nothing.

## Styling

`cfg.cssEntry` must resolve inside the package directory, so the setup script
compiles Symphony's **real** `apps/renderer/src/styles/mosaik.scss` (the Soho theme)
into the scratch package. The 32 inactive historical renderer override files were removed on 2026-10-30.
Only the imported `app`, `app-header` and `technical-value` sheets remain. It compiles through a small shim at
`.design-sync/styles/shim/` because dart-sass does not read package `exports`,
and Symphony's stylesheet imports `@pixel-brewery/mosaik-themes/scss`. Compiling
Symphony's own file rather than a copy keeps the effective styling in one place.

## States that cannot be shown statically

- `Text.maxLines` does not clamp in a headless screenshot — it renders the full
  text, and adding `truncate` collapses it to a single line instead. The cell was
  dropped rather than ship a misleading example.

## Authoring previews: what this design system does and does not show

Learned across the first authoring wave (52 components). Read this before writing
a preview cell — most of it cost a full capture round to discover.

### The capture frame

`package-capture` shoots each cell at 900x700 without `fullPage`. Anything wider
is silently cut off and reads as a broken render rather than a scrolled one.
Flow boards need explicit widths on each column
(`--flow-board-column-min-width` / `-max-width`: 265/280 fits three columns,
200/210 fits four) plus a wrapper with an explicit height (~440px). Raising the
min-width above ~350px does nothing — something else caps the upper bound.

### Which axes are worth sweeping

- **`variant` is the real axis.** Soho distinguishes neutral fills and semantic accents.
- **`appearance` is nearly invisible** on Tab, Segment, Dismiss and
  FlowBoardColumnItem — do not build a cell around it.
- The Soho palette owns semantic variants; do not restore the removed Joy color overrides.
- `appearance="solid"` on Toolbar and Message is low-contrast to the point of
  being illegible; sweep `soft / outline / plain` instead.
- `SegmentItem.size` and `Qrcode.radius` produce no visible difference.

### States that do render statically

`isExpanded` (Expander, MenuItem), `isReveal` (Passwordbox), `isBusy`,
`isIndeterminate`, `isSelected`, `pinned`, `disabled`, and — very usefully —
a pinned-open dropdown: `isDropDownOpen dropDownStaysOpen
dropDownStrategy="absolute"` renders Select's option panel and Datebox's whole
calendar inline.

### Slots

`slot="start|end|prefix|suffix|hint|label|title|actions|root|…"` passes straight
through the React wrappers (`slot` lives on `HTMLElement.prototype`, so the
wrapper sets it as a property). Compound children that declare their own host
slot (`TimelineMarker`, `TimelineContent`) need no `slot` attribute at all.

### Component traps

- **Tab** hides its header entirely with fewer than two `TabItem`s, and an
  unselected `TabItem` is `display:none` — always set one `isSelected`.
- **Segment** clips overflow instead of wrapping (it lives in a `mosaik-scroll`);
  four short labels is the safe maximum. A `disabled` SegmentItem inside an
  enabled Segment renders its label invisible — disable the parent instead.
- **ProgressBar defaults to `max = 1`** — pass `min`/`max` or `value={74}` fills
  the bar.
- **DialogHeader is `flex: 1`** and collapses to zero height inside a vertical
  flex parent — give it its own horizontal row, as `mosaik-dialog` does.
  (An earlier note claimed `DrawerHeader` renders nothing outside a drawer; a
  later wave disproved that — it renders fine in a plain panel. The blank cells
  were this `flex` collapse, not the component.)
- **`Box` hides `Divider` and `flex:1` children.** Build surfaces from a plain
  element with theme custom properties when either is needed.
- **ListItem has no selected styling** in the historical Joy preview (it styles hover,
  `[disabled]` and `[is-active]`, and ListItem has no `isActive` — only
  SelectItem does). Add your own affordance, e.g. a `checkmark` Icon in `suffix`.
  `ListItem.variant` is likewise unstyled.
- **Disclosure cannot be opened at all.** `connectedCallback()` calls `show()`,
  which needs `_detailsElement`, assigned only later in `firstUpdated()`; nothing
  binds `?open` on the `<details>`. The property is effectively write-only after
  mount, for React and Angular alike. No expanded cell is possible.
- **ExpanderGroup `mode="single"`** collapses children that mount expanded (group
  bookkeeping runs before the wrapper's effect). Use `mode="multiple"` when a cell
  needs visible content.
- **Message has no default slot** — children passed to an `expandable` Message are
  never projected.
- **Toolbar** keeps `part="main"` hidden unless the default slot, `title` or
  `subTitle` has content, so `end` will not go right without one.
- **Timeline `align="alternate"`** centres the line but leaves all content in one
  column; text runs over the connector. Re-test after a Mosaik bump.
- **Avatar's `badge` slot does not position statically** (overlaps the icon).
- **`placeholder` never renders on Datebox or Filebox**, and an empty Datebox
  shows the harness clock date as if it were a value — always pass a real value.
- **Filebox's own browse button never appears**; slot a Button into `suffix`,
  which is what Symphony does.
- **FormField `required`** emits a lone `*` on its own line — put `required` on
  the input instead.
- **Kbd** threw "not iterable" on first render without a default `value: []` in
  older releases; in 0.1.183 an empty `value` defaults to `[]` and renders the slotted text.

### Overlays, shells and the preview frame

The preview card's own wrapper carries `transform: translateZ(0)`, which makes it
the containing block for `position: fixed`. Anything that positions itself —
Sheet, App, Popup, Tooltip — must be wrapped in a frame `div` with an explicit
height, or it collapses to a sliver or escapes the card. Pinned-open states that
do work: `Popup`/`Tooltip` with `trigger="manual" isOpen` (Tooltip is
`strategy: fixed` with `flip`, so one anchor per cell, padded away from the frame
edge), `Select`/`Datebox` with `isDropDownOpen dropDownStaysOpen`.

Two more shell-specific facts: some elements assign their own `slot` through
`@Component({ host: … })` — `AppHeader` (`slot: 'header'`) and
`PromptBoxVoiceRecorderTool` (`slot: 'tools'`) — so placing them anywhere else
silently drops them. And **`AppHeader` is invisible on its own in 0.1.96**: its
hide-on-scroll controller never sets `data-visible`, and Symphony rescues it with
a stylesheet override scoped to `mosaik-app > mosaik-app-header[part='header']`.
It only previews inside `<App>`.

### Built-in control icons follow Mosaik's Reicon system set

Mosaik's shadow templates use semantic system names that are separate from
Symphony's product aliases. `ShellConfig.ts` follows FLAMOX365 by registering
the complete `ReiconAliases` map as the default set, and the preview provider
does the same. This covers built-in affordances including:

- `caret-down` / `caret-right` — MenuItem, Message, Expander
- `dismiss-circle` — Chip's built-in close button
- `arrow-sort-down`, `more-vertical` — TableHeaderCell's sort affordance, so a
  sortable column is visually identical to a fixed one
- `send`, `stop`, `microphone`, `success-circle`, kebab-case `chevron-*`,
  `panel-left*` — PromptBox and assorted shells

The previews and the product therefore resolve the same built-in glyphs. Custom
product aliases remain registered afterward and may intentionally override a
system alias in the selected set.

### The prop is `icon`, never `iconName`

Symphony's Angular templates bind `[iconName]` on `mosaik-timeline-marker` and
`mosaik-menu-item`, but the 0.1.96 element interfaces only declare
`icon: IconSource`. Trust the generated `.d.ts` over Symphony's own templates.

### Axes that look real but render identically

Confirmed upstream on the 0.1.102 pass, with the reason found in Mosaik's own
themes rather than guessed:

- **`Checkbox.variant` is declared but unstyled.** All three theme files
  (`Inputs/CheckBox/Themes/CheckBoxElement.{Cosmopolitan,Joy,Memphis}.js`)
  contain zero `variant` selectors, unlike Chip whose theme is full of
  `:host([variant="…"])`. The cell renders complete and styled; it simply cannot
  show a colour difference without a Mosaik-side change.
- **`FlowBoardColumn.appearance` is inert.** The element inherits
  `IAppearanceableProps`, so all four values type-check and render whole, but
  `FlowBoardColumnElement.js` never wires `appearance` to
  `--flow-board-column-background-color` (zero occurrences), and the four columns
  come out pixel-identical. The Joy theme does mention `appearance` for the
  column, so the gap is the element's plumbing, not a missing theme rule.
- **`Datebox.appearance` flattens**: `default`/`outline`/`soft`/`solid` all
  resolve to the same near-white bordered surface and only `plain` differs. The
  prop is live (plain drops the border), so this is a token choice. Filebox and
  Passwordbox share the same deliberately low-contrast input surface. Badge and
  Toolbar keep clearly distinct appearance ramps, so there is no global
  regression here.

Dropped rather than shipped as misleading cells, across both waves:
`ListItem.variant`, `ListingItem.variant`, `Kbd.variant`, `RadioGroup.variant`,
`SegmentItem.size`, `Qrcode.radius`, `Split.thickness`, `Scroll.showScrollbar`,
`Hint.alignment`, `PromptBox.variant`/`state`, `Choice.iconPosition`,
`FlowBoardColumnItem.appearance`, `Timeline align="alternate"`, and
`Badge size="tiny"` (clips its own label). Table cells truncate by default, so a
slightly narrow column silently eats characters — that one reads as a broken
render and cost a full round across seven files.

Also structurally impossible: a second `TableHeaderRow` never renders (no grouped
headers), `App.isMobile` is re-applied by a breakpoint controller so it cannot be
forced, `Stepper` auto-selects step 0, and `Popup`'s `header`/`footer` slots do
not survive its portal — only `content` is relocated.

### Run the scripts from the repository root

`preview-rebuild.mjs` and `package-capture.mjs` resolve preview paths from the
current working directory; from anywhere else every component reports "no
<Name>.tsx".

## Known render warns

Check new warns against this list — anything not here is genuinely new.

- `[TOKENS_MISSING]` (130 properties, `--mosaik-*`): expected. Mosaik injects
  these at runtime from the theme object; verified present in a rendered preview.
  Not a problem — do not chase it.
- `[RENDER_THIN]` on 16 components: **all triaged as legitimate** after reading
  every contact sheet. They are graphical or low-text by nature and render
  correctly: Button, Text, EmptyState, Comment, Disclosure, Dot, Slider,
  ProgressBar, ProgressRing, SegmentBar, SegmentBarItem, Timeline,
  TimelineMarker, ToggleButton, ToggleSwitch, PromptBoxVoiceRecorderTool.
- Five component docs are truncated at the converter's ~8 KB cap
  (FlowBoardColumn, FlowBoardColumnItem, FlowBoardColumnItemGroup, SegmentBar,
  Slider). `generate-docs.mjs` orders sections so the cut lands on the exhaustive
  CSS custom-property list, never on the verified example or the slot list.

## The 2026-09-03 re-sync (Mosaik 0.1.96 → 0.1.102)

- **New Mosaik components are discovered but not bundled.** The component list
  comes from the package's `.d.ts` exports, while the entry `setup-scratch.mjs`
  generates is scoped to the tags Symphony uses. A version bump therefore fails
  validate with `✗ [BUNDLE_EXPORT] … not a component on window.Mosaik` — 0.1.102
  added `SegmentLegend` and `SegmentLegendItem`. The fix is the same exclusion
  the other 223 non-Symphony components carry: `componentSrcMap.<Name> = null`.
  Expect this on every Mosaik upgrade.
- **The contract change clears grades.** 86 of 108 components came back
  `changed`, and the capture stage cleared the grade of every one whose prop
  contract moved. That is correct behaviour, not a bug — but it makes a version
  bump a re-grading campaign, not a quick re-sync. Budget for it.
- **`[GRID_OVERFLOW]` is a newer converter check**, so its 24 findings were new
  to this repo rather than new to the previews. Nineteen cards took
  `{"cardMode": "column"}` and five `{"cardMode": "single"}` with a chosen
  `primaryStory` (Datebox → OpenCalendar, DropdownButton → BoardItemActions,
  Popup → GlobalSearchResults, SelectItem → ItemsWithMetadata, Sheet →
  WithHeaderAndFooter). They now live in `cfg.overrides`.

## Grading a re-sync: what the sheets do and don't tell you

- **Every review sheet re-renders its alphabetically-first cell, clipped, at the
  very bottom of the PNG.** It is a sheet artifact, not an extra story. Take cell
  keys from the preview's `export const` names, never from eyeballing the sheet —
  a grade written against a mis-read label is silently dropped.
- **`cfg.dtsPropsFor.<Component>` is the authoritative prop contract** after a
  Mosaik bump. Reading it answers "did this prop move?" far faster than booting
  anything, and it is what the cleared grades are keyed against.
- **Don't zoom the sheet — read the per-cell shot.**
  `ds-bundle/_screenshots/review/raw/<group>__<Name>__<Cell>.png` is one
  full-resolution capture per cell, and the filename is the exact cell label. The
  generated `.sheet-*.html` beside it marks `(no shot)` and red error spans, which
  is a one-second proof that no cell errored.
- **`sips --cropOffset` silently no-ops on this machine** (macOS 26.5): it exits
  0, prints the output path, and copies the image through at full size. A grader
  who trusts it examines an uncropped sheet believing it is a zoom. Plain centred
  `sips -c H W` does work, and there is no ImageMagick or PIL — but with `raw/`
  available, cropping is rarely the right move anyway.
- **Tall sheets are downscaled on read, and the first cell can appear to repeat
  after the last row.** Sheets run up to ~2700px, so Read downsamples them and
  small control chrome becomes unreadable. The generator emits exactly one row per
  cell; confirm against `raw/` before flagging a duplicate. If a region genuinely
  needs magnifying beyond what `raw/` gives, a short Playwright script that inlines
  the PNG as a data URI and screenshots a scaled crop works — the Browser pane
  renders out-of-project `file://` pages as static snapshots, so it cannot do it.

## The transparent-stack trap (found 2026-09-03, fixed the same day)

Historical note: the inactive `flow-board.scss` override described below was removed on 2026-10-30. It is not part of the current Soho entry.

`overrides/flow-board.scss` makes a lane row transparent so the board reads as
continuous lanes. A **grouped** item cannot take that: `mosaik-flow-board-column-item-group`
stacks its members _behind_ the root and relies on the front card hiding them, so
with no fill every member's title and hints read straight through the root card.
All three `FlowBoardColumnItemGroup` cells graded `needs-work` on exactly this,
and the grader correctly refused to paper over it by styling the preview frame —
the defect shipped in the real app, not just in the card. The fix is a more
specific rule giving grouped items `--mosaik-scheme-surface` back.

Two neighbouring facts found while chasing it, both upstream and both still true:

- **`stacking="spaced"` is unimplemented in the historical Joy preview** — zero `[stack-mode]`
  selectors in `FlowBoardColumnItemGroupElement.Joy.js`, so `spaced` and `depth`
  render byte-identically.
- **The collapsed depth offset clamps to 0 when a member is taller than the
  root.** The `max(0px, front-extent - (1 - i*scale)*100% + i*step)` percentage
  resolves against the member's own height, so in a narrow column root and member
  can sit exactly on top of each other.
- **`revealTrigger` defaults to `hover-focus`**, so a static capture can only ever
  show the collapsed pile. That is a harness limit, not a preview fault.

## Layout facts that look like escapes but are not

- **`Disclosure` renders an undecorated native `<details>`** with a `▶` marker
  and no border or background: the Joy theme sets the `--disclosure-*` tokens to
  `unset` on purpose. The previews also pass no expanded state, so hidden
  children are by design — see the older note that the element cannot be opened
  at all after mount.
- **Mosaik radios are rounded squares, not circles.** Every theme sets
  `--radio-border-radius: calc(var(--<theme>-layout-radius) / 2)`
  (`Inputs/Radio/Themes/RadioElement.*.js`), so an unchecked radio rendering as an
  empty square is the DS shape, not a `[TOKENS_MISSING]` symptom. Confirmed twice
  independently, on RadioGroup and on the standalone Radio.
- **`Icon.appearance` only recolours the glyph.** There is no container, so
  `outline`/`soft`/`plain` all land on the same brand red and `solid` on the pale
  on-primary tone. The prop is live in 0.1.102; `Select`'s appearances sit
  similarly close under this theme.
- **A blank square on a FlowBoard card is the selection checkbox**, which appears
  only where `selectionMode="multiple"` is set.
- **`Select` keeps a neutral control in its invalid cell** — the invalid state
  lives on the wrapping `FormField`, which draws the red error line beneath.
- **`DropdownButton` with `isBusy` swaps the label for a spinner**, so a cell
  labelled "Working" is intentionally unpainted; its checked menu rows look
  indented because the menu reserves no check gutter, exactly as MenuItem does.
- **`TableBodyRow`'s `isSelected` fill stops short of the leading selection
  column** — cosmetic, and it belongs to the row component.

- **`FlowBoardColumnItem` stacks `meta` and `footer` below the header** rather
  than in the title row, aligned to the container edge. Both slots are still
  documented in 0.1.102 and the other four slots land correctly — it only reads
  as slot fallthrough because `appearance="soft"` leaves the item no visible
  ground.
- **`TableHeaderCell` / `WrappingHeadings` never wraps** at its `1fr 1fr 1fr 1fr`
  width; it demonstrates "not truncated" instead. Narrowing one column by a line
  would make it prove its caption, if anyone wants that.

## Two palette observations from the 0.1.102 pass

Neither is a defect and neither blocked a grade; both are for whoever owns the
theme.

- **`Toolbar` with `appearance="soft" variant="neutral"` paints a noticeably
  heavier, cooler grey** than the light warm soft surface Badge, CardHeader,
  ExpanderGroup, ListItem and TableBody use. Consistent across all its cells.
- **`Timeline` with `orientation="horizontal" align="start"` draws the connector
  rail above the markers** rather than through them, with labels column-leading
  and markers column-centred. Component-owned layout, not a preview problem.

## Re-sync risks

- **Generated config.** `dtsPropsFor` (100 contracts) and the 223 `null` entries
  in `componentSrcMap` are machine-written by `generate-props.mjs` and the tag
  scan. Re-run both generators rather than hand-editing them.
- **Icon map drift.** `provider/SymphonyIcons.ts` is parsed out of
  `ShellConfig.ts`. If that call is ever refactored (renamed, moved, or built
  from a variable), the parser fails loudly — fix the parser, don't inline a copy.
- **Version drift.** The Mosaik version follows Symphony's `package.json`. When
  Symphony upgrades, re-run the whole pipeline; component styles can shift
  without any Symphony diff.
- **Prop contracts are derived from `I*ElementProps`.** Three components
  (`CardFooter`, `TableBody`, `TableHeader`) have no such interface and keep the
  converter's own noisier extraction.
- **Generic behaviour interfaces were silently skipped once.** Mosaik bundles
  shared props into generic interfaces (`IValueableProps<TType>`,
  `IRangeableProps<number>`), and the first version of `generate-props.mjs` did
  not match a generic declaration at all — so `value`, `min` and `max` were
  missing from every input and range component, and three separate authoring
  agents hit it independently. The generator now matches type parameters and
  binds the arguments (falling back to a parameter's declared default), so
  contracts read `min?: number` rather than `min?: TType`. If props ever look
  suspiciously thin for an input-like element, check
  `…-foundation/Controls/Components/**/I<Name>ElementProps.d.ts` and its bases
  before believing the contract.

## Memphis figure validation (2026-10-06)

Complete transparent PNG figures and anchored accessory layers belong to Symphony's
shared Angular `AgentFigureComponent`. They are verified in Electron; the React
Avatar preview uses Mosaik's published portrait API.
`generate-props.mjs` uses TypeScript property signatures so nested layer object types and
single-line TSDoc remain valid declarations. Page, TimelineItem and Comment cards use
column layouts; fixed Sheet and provider overlays use a single primary story.
The validator’s thin-render warnings for Button/ToggleButton were checked against the
rendered screenshots: both paint their controls and labels correctly in Memphis.
All generated preview artifacts remain reproducible, with `.ds-sync` and `ds-bundle`
excluded from Git. `DESIGN.md` and `COMPONENTS.md` are the committed token projections.

## Memphis preview validation (2026-10-06)

The rebuilt bundle contains 108 valid component contracts and previews. Employee
figures and accessory transparency are inspected in the Electron captures.
Comment uses column cards to avoid cropping slotted metadata. The validator
reports `RENDER_THIN` for Button, ToggleButton, Timeline, TimelineMarker and
Comment, and may also report it for Disclosure, Dot, Text, ProgressRing,
SegmentBar, SegmentBarItem, Slider and EmptyState. Their saved screenshots were
inspected and visibly contain controls, labels and geometry.
These are measurement warnings from shadow/portal composition, not empty
previews. The generated DESIGN.md YAML is excluded from Prettier because the
Mosaik generator owns its quote serialization; `design:md-check` validates it.

## The 2026-10-30 rebuild (Mosaik 0.1.183, Soho, Design System artifact)

The first build without the claude.ai/design converter. What it took:

- **Only Soho's element stylesheets are bundled.** Every Mosaik element imports
  one stylesheet per theme (Joy, Memphis, Cosmopolitan, Soho). With all four the
  bundle came out at 7.9 MB against the artifact's 6 MB limit; `build-artifact.mjs`
  replaces each non-Soho theme module (a single style function) with one returning
  no CSS, which takes it to 2.8 MB. The bundle therefore cannot render Joy or
  Memphis — `documentTheme.ts` pins `soho` anyway.
- **Not every wrapper is in the barrel.** 0.1.183 ships `Flow*` and `Tile` only
  under `components/…` subpaths. A TypeScript `export { Flow } from './Index.js'`
  bundles silently as `undefined` (it may be a type-only re-export), so the slim
  entry exports each wrapper from its declaring module, and the build fails if a
  card is missing on `window.Mosaik`.
- **Scope lives in the tag scan.** `setup-scratch.mjs` now writes
  `cfg.componentSrcMap` (null = excluded) from the same scan that builds the slim
  entry, so an upgrade neither adds contracts for components Symphony never renders
  (0.1.183 added Gauge, Globe, Orbit and two dozen more) nor excludes ones it newly
  uses (`Tile`, `CardActions`, the `Flow` family).
- **Lit templates contain HTML comments.** A literal `<!--` would escape an inline
  `<script>`; the build writes it as `\x3C!--`, which a template literal cooks back.
- **`generate-props.mjs` inlines plain string-literal unions** (`FlowEdgeRouting`,
  `FlowConnectionSide`, …) as well as Mosaik's const-object enums.
- **Tokens are measured, not transcribed.** A headless Chromium renders the bundle
  inside `SymphonyThemeProvider` in light and dark mode and reads every
  `--mosaik-*` property ThemeService wrote. Token names are those runtime names, so
  `tokens.css` declares exactly what the components consume; at runtime the
  provider's inline values win. Usage notes follow DESIGN.md's role tables.
- **The provider follows `data-theme`.** The Design System page and Design canvases
  switch themes through `data-theme` (`light` / `dark`, the two themes of
  `tokens.json`); `SymphonyThemeProvider` maps that onto Soho's `theme-mode` unless
  its new `mode` prop pins one.
- **Preview documents need `lang`.** `FlowControls showZoom` formats the zoom with
  `Intl` in the document language and throws on an empty one.
- **Flow nodes are 260 px wide** at zoom 1; the previews place nodes on a 340 px
  pitch with manual coordinates. Symphony itself lays the graphs out with Mosaik's
  Dagre engine, which the bundle does not carry.
- **`mosaik-portal` adopts no stylesheet by design**, and Image's `FailedState`
  points at a missing file on purpose; `check-artifact.mjs` knows both.
- **Removed from the artifact:** the Joy-era Archivo and Nunito fonts, the
  `components/src/` re-export stubs and the stale `manifest.json`. The page
  regenerates `manifest.json` and the `api/` cards when someone saves on it.
- **On the canvas** the outermost import is `Mosaik.SymphonyThemeProvider`; the
  former `Theme2 name="joy"` with a hand-copied Soho object and the
  `soho-geometry.css` sheet that imitated Soho geometry on Joy elements are retired.
- **The canvas wraps every `x-import` in a `display: contents` host.** A Mosaik
  container that reads its own items as direct children then sees only the hosts:
  `Select` shows no value, `SegmentBar` draws no bar and `ChoiceGroup` marks no
  choice. On a canvas, write those items as the elements themselves
  (`<mosaik-select-item>`, `<mosaik-segment-bar-item>`, `<mosaik-choice>`) inside an
  imported container. `Segment` / `SegmentItem`, `Table` and `Expander` are not
  affected. The canvas's own runtime is `artifact-type/dc-runtime.js` (it is the
  artboards' `support.js`); serving a canvas copy with it locally reproduces exactly
  what the canvas shows, which the React-only simulation in `.ds-sync/canvas-sim/`
  does not.
