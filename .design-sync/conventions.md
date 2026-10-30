## Symphony conventions

These components are Mosaik web components wrapped for React, themed the way the
Symphony desktop app themes them. Symphony uses **Soho**, Mosaik's rendering of the
shadcn/ui visual language: a white canvas, near-black text and a near-black primary
action, quiet neutral fills, 1px light-grey borders and small soft shadows, Inter at
14px for every control. Restraint is the point: no gradients, tinted chrome, coloured
shadows or decorative backplates. Technical values keep their monospace role. Complete
employee figures belong to Symphony's Angular `AgentFigureComponent`, separate from
Mosaik Avatar; the React bundle exposes the published Mosaik portrait API. Identity and
work state are independent; a picture or animation never constitutes proof of a
deployment or an active agent.

### Always wrap in the provider

```jsx
<SymphonyThemeProvider>{/* everything you build */}</SymphonyThemeProvider>
```

This is not optional. Every Mosaik element picks its stylesheet, its colours and
its typography from the theme this provider installs, and it registers Symphony's
icon set. Without it components fall back to bare shadow-DOM elements — grey
boxes with black borders in a serif font. If a screen ever looks like that, the
provider is missing, not the styling. Symphony ships both modes: the provider
follows the page's `data-theme` (`light` or `dark`, the two themes of
`tokens.json`), and `mode="dark"` or `mode="light"` pins one.

### Loading the system

React 18 and ReactDOM 18 come first (`components/lib/` carries both), then
`tokens.css`, `components/bundle.css` and `components/bundle.js`, which assigns
`window.Mosaik`. `tokens.css` declares the Inter faces from `fonts/` and mirrors the
`--mosaik-*` values for plain markup; `components/bundle.css` is Symphony's own
renderer stylesheet, including the `technical-value` class.

### In a Design canvas

Canvas artboards mount the same components as
`<x-import component-from-global-scope="Mosaik.<Name>">`, after loading the copied
`ds/<folder>/tokens.css`, `ds/<folder>/components/bundle.css` and
`ds/<folder>/components/bundle.js` (copy `fonts/` with them; the canvas supplies
React). The provider rule applies there too: the outermost import is
`Mosaik.SymphonyThemeProvider`. Do not substitute `Theme2` with a hand-written theme
object, and do not restyle components with copied geometry sheets; the provider
already carries Soho, Symphony's icons and the theme scope the elements need.

The canvas moves an import's `style` attribute onto a wrapper element, so two
things that work in React do not survive there:

- Inline custom properties (`--button-…`, `--text-…`) and inline layout never reach
  the Mosaik element. Express intent through props (`variant`, `appearance`, `size`)
  and build containers as plain elements styled with the theme custom properties
  listed below.
- Compound components that depend on slotted children render empty or broken:
  `Card` with `CardHeader` / `CardContent` / `CardFooter`, and `FlowBoard` column
  headers. Build those surfaces from plain elements on `--mosaik-*` properties and
  name the Mosaik component a screen maps to in the implementation.

Leaf controls render faithfully in an artboard: `Avatar`, `Badge`, `Button`,
`Icon`, `Searchbox`, `Text`, `Textbox`, `ToggleSwitch` and `Numberbox` (pass a
number as `value`). Check anything else in the canvas itself before relying on it.

### Colour

Use the scheme roles, never a copied hex value: `mosaik-scheme-background` for the
page, `mosaik-scheme-surface` for cards and panels, `mosaik-scheme-foreground` for
text and icons, `mosaik-scheme-lowlight` for secondary text and hints,
`mosaik-scheme-highlight` for 1px borders and dividers. `primary` is the near-black
(light) / near-white (dark) action colour; `secondary`, `tertiary` and `highlight` are
teal, orange and violet derivations, never a way to get a quiet button — use
`variant="neutral"` or `appearance="plain"` for that. `danger`, `warning`, `success`
and `info` mean status and are not interchangeable accents.
`mosaik-scheme-semi-transparent` is the 50 % scrim behind modal overlays only.

### Type

One Inter stack carries every interface role; use the Mosaik roles as they are
(`mosaik-typography-headline1` … `headline6`, `subtitle1`, `subtitle2`, `body1`,
`body2`, `supporting`, `caption`, `overline`, `button`). `body2` (14/20) is the
default for UI copy, `subtitle2` for emphasised labels, `caption` for metadata.
Monospace is reserved for values read character by character — ids, hashes, paths,
branch names, sizes — through the `technical-value` class; never set a font family
inline for it. Do not introduce a display face.

### Spacing, shape and depth

Everything sits on the 8px `mosaik-layout-space` unit; a layout `gap` takes
`tiny | small | medium | large | giant` (2, 4, 8, 16, 32px) or a length.
Rectangular surfaces take the 10px `mosaik-layout-radius`; borders and dividers the
1px `mosaik-layout-thickness`. Prefer borders, spacing and scheme contrast before
depth; when depth is needed use the elevation the component already selects
(`mosaik-elevation-light` for controls and cards, `regular` for popovers and menus,
`semibold` for dialogs and sheets). Chrome bands such as the title bar carry no
shadow. Transitions use `mosaik-duration-short` and honour reduced motion.

### Copy

Labels are sentence case and name the concrete thing or action: "Start delivery",
"Open pull request", "Save limits". Product nouns are Symphony's own — work item,
execution, workspace, skill, board. Numbers carry their unit ("18.4 GB", "6m 12s").
No emoji; status is carried by a variant plus a word or icon, never colour alone.

### Style through props, not classes

There is **no utility-class vocabulary and no CSS-module map** here. The design
language lives in props, and these are the ones that carry it:

- `variant` — `default | primary | secondary | tertiary | danger | warning | success | info | neutral | highlight`. This is the semantic colour axis; use it instead of hand-picking colours.
- `appearance` — `default | outline | plain | soft | solid`. How much the surface asserts itself.
- `size` — `tiny | small | medium | large | giant`.
- `elevation` — `none | light | semilight | regular | semibold | bold | extrabold`.
- `inset`, `fit`, `orientation`, `disabled`, `isBusy`, `isSelected` — spacing, sizing, direction and state.

Not every component takes all of them; the component's `.d.ts` lists exactly what
it accepts, with the allowed values spelled out.

### Layout with the layout components

Reach for `Stack` before a flex `div`: `orientation`, `gap` (`tiny…giant` or a
length), `verticalAlignment`, `horizontalAlignment`, `wrap`, `fit`. `Box`, `Page`,
`Card`, `Toolbar` and `Divider` cover most structure. When you do write your own
CSS, use the theme's custom properties so it tracks the theme instead of drifting
from it:

- Colour — `var(--mosaik-scheme-background)`, `--mosaik-scheme-surface`, `--mosaik-scheme-foreground`, `--mosaik-scheme-lowlight`, `--mosaik-scheme-highlight`, `--mosaik-scheme-middlelight`, `--mosaik-scheme-disabled`, `--mosaik-scheme-contrast`, and the ramps `--mosaik-color-<family>-<stop>`
- Metrics — `var(--mosaik-layout-space)`, `--mosaik-layout-radius`, `--mosaik-layout-thickness`
- Type — `font: var(--mosaik-typography-body2)` and its siblings, or the single properties (`-font-size`, `-font-weight`, `-line-height`, `-letter-spacing`)
- Depth — `var(--mosaik-elevation-light)` and its heavier siblings

The provider writes these onto the document at runtime, in the active mode, and
they win over `tokens.css`, which mirrors the same names for markup outside it.

### Icons are a fixed vocabulary

`icon` props and `<Icon>` resolve only these registered names. Anything else
renders nothing at all — no error, just an empty box:

`add, arrowRight, azureDevOps, board, bot, branch, checkCircle, checkmark,
checkmarkCircle, chevronLeft, chevronRight, claude, clear, clipboardTask, comment,
cloudArrowRight, copy, delete, disconnect, download, edit, error, errorCircle,
executionOutline, eyeShow, filter, flow, folder, folderOpen, games, github,
homeOutline, info, leaderboard, mic, open, openai, panelLeft, panelLeftContract,
panelRight, panelRightContract, person, play, save, search, settings, skills,
sparkle, sync, warning, weatherMoon, weatherSunny`

Built-in control affordances (carets, chevrons, dismiss and sort glyphs) come from
Mosaik's Reicon system set, which the provider registers first; product code names
only the vocabulary above.

### Where the truth is

Read the component's own `components/<Name>/README.md` (what it is, its slots, its
styleable parts, a verified example) and `<Name>.d.ts` (the exact props and allowed
values) before using it — they are generated from Mosaik's source and are more
reliable than any summary. `components/index.d.ts` holds every contract in one file.

### An idiomatic screen

```jsx
<SymphonyThemeProvider>
  <Card>
    <CardHeader text="Storage safety" subText="Physical allocation and hard write limits." />
    <CardContent>
      <Stack orientation="vertical" gap="small">
        <Text text="All managed Symphony data" wrap />
        <Text text="18.4 GB across 6 workspaces · 2.1 GB reclaimable" variant="neutral" wrap />
      </Stack>
    </CardContent>
    <CardFooter>
      <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
        <Button label="Discard" variant="neutral" />
        <Button label="Save limits" variant="primary" appearance="solid" icon="save" />
      </Stack>
    </CardFooter>
  </Card>
</SymphonyThemeProvider>
```
