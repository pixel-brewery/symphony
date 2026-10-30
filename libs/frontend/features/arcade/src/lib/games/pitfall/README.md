# Pitfall!

Symphony's implementation of the Atari 2600 treasure hunt. The Arcade selection at
`/main/arcade` contains Pitfall!, Pitfall II: Lost Caverns, Breakout and RealSports Boxing
with bundled original covers plus a consolidated leaderboard as five centered Mosaik Tiles.
They sit in one horizontal row when space permits and wrap into centered rows in narrower panes.
Selecting its cover opens the separately lazy-loaded `/main/arcade/pitfall` route.
Each game owns a separate sibling directory. The previous Pinball implementation
has been removed; all four games share browser input, canvas sizing and the
public Symphony theme palette through `games/shared`.

## Original game and Symphony menus

The original cartridge starts on the first jungle scene. Reset restores that scene,
and the expedition waits for directional joystick input before its clock advances.
There is no original title menu, narrative intro, saved leaderboard or victory
screen. Time expiry, the third lost life or the last treasure stops the game on the
current scene. The original includes event sounds, a scrolling copyright footer
and an idle color-cycling screensaver.

Symphony adds an introductory menu, instructions, pause/resume, sound control,
results and replay. Finished expeditions contribute to the consolidated Arcade
leaderboard instead of exposing records inside the game. Starting a new expedition still waits
for directional input. Opening a menu preserves and pauses the current expedition;
returning to Arcade disposes the game route. An unfinished expedition is not saved
across route visits or application restarts.

## God mode: source evidence and Symphony adaptation

No shipped Pitfall! invulnerability mode or David Crane development code was verified.
The commented reconstruction contains a `TRAINER` assembly switch, which is evidence of a
reconstruction-time trainer option rather than proof that the original cartridge exposed a cheat.
[Stella's cheat support](https://stella-emu.github.io/docs/index.html) can patch emulated Pitfall!
memory for unlimited lives or time, but that is an emulator facility and not original game logic.

Symphony's God mode is therefore an explicit test adaptation. Entering the standard Konami sequence
anywhere in the main window enables it for that renderer session. Pitfall then ignores lethal
objects, pits and blocking/log score penalties, and freezes the 20-minute countdown. Treasures,
room transitions, ladders, vines and ordinary underground walls keep their normal behavior. The
mode is neither displayed as an original feature nor persisted as a player setting.

The intro and instructions are Mosaik Card overlays over the quiet jungle without
its HUD. Results appear over the frozen final scene. Header actions
return to Arcade and control sound; during play the header also offers Menu,
Pause/Resume and New game, with a compact keyboard legend in its subheader.
These menus are application features, not reconstructed Atari screens.

## Rules and world

The simulation uses a fixed 60-frame-per-second clock and the original 160×192
coordinate space. Its rules are reconstructed from the manual and commented
disassembly rather than from the former Pinball implementation.

- Each expedition starts with 2,000 points, three lives and 20 minutes. The timer
  advances during play and stops during the death interlude, menus and pause.
- The world is a circular sequence of 255 scenes. A reversible eight-bit LFSR
  starts at `0xC4`; moving underground advances three surface scenes at a time.
  Entering a scene resets its object positions; collected treasures stay absent.
- A room byte controls its objects, ground, four tree patterns and underground
  wall side. Single-hole and triple-hole scenes contain a ladder and a wall.
  The other scenes contain a scorpion below ground.
- Surface scenes include permanent tar pits, permanent swamps, crocodile swamps,
  shifting tar pits with treasure, shifting tar pits with a vine and shifting
  swamps. Vines appear over the permanent pits and selected crocodile swamps.
- Eight money bags, eight silver bars, eight gold bars and eight diamond rings
  award 2,000, 3,000, 4,000 and 5,000 points respectively. Collecting all 32 without
  deductions produces 114,000 points and completes the expedition.
- Falling through an ordinary hole costs 100 points and drops Harry into the
  tunnel. Contact with stationary or rolling logs costs one point per simulation
  frame; rolling logs also interrupt running. Points never fall below zero.
- Fire, cobras, scorpions and falling into water or tar cost a life. Crocodile
  jaws change the safe standing positions; their narrow safe head positions
  remain meaningful even while the jaws are open.
- Rolling logs move from right to left in the original single, paired and triple
  arrangements. Underground walls block passage; scorpions approach Harry.
- The jump curve, airborne direction, ladder stepping, vine motion and release,
  crocodile clock, shifting-pit bounds, collision masks and death/respawn states
  follow the source-derived rules. Replacement Harry appears on the left of the
  same scene, on the surface or underground according to the place of death.

This is a TypeScript reconstruction, not a ROM emulator. The source-derived
mechanics do not imply cycle-accurate hardware, identical display timing or
identical audio output. Browser catch-up is capped at 250 milliseconds per update
so a delayed animation frame cannot advance the expedition by an unbounded amount.

## Controls

| Control               | Action                                                   |
| --------------------- | -------------------------------------------------------- |
| Left / Right or A / D | Run; directional input also starts a waiting expedition. |
| Space                 | Jump. An airborne collision with a vine catches it.      |
| Up / Down or W / S    | Climb a ladder. Down releases a vine.                    |
| P or Escape           | Pause or resume the playfield.                           |

Airborne horizontal direction is retained after the initial jump frames. Leaving
a vine starts the descending part of the jump and prevents an immediate re-grab.
Window focus loss and a hidden document pause play and release held controls.
Keyboard handling respects text entry, application controls and system shortcuts.

## Presentation, sound and leaderboard results

The playfield fills the complete inner pane below its Mosaik page header. Its
160×192 bitmap scales independently along both axes without letterboxing, so
window resizing deliberately changes pixel proportions. Terrain, sprites and the
pixel HUD read the active public Mosaik scheme colors instead of introducing the
Atari green/brown palette. Menus and controls use public Mosaik components.

The original Activision/copyright footer is reconstructed from its glyph data and
scrolling window. The keyboard legend stays in the application header so the game
retains this strip. After 32,768 idle frames, the screensaver hides Harry and
rotates the four material-color roles every 256 frames. Background and foreground
tokens stay stable for contrast; current Mosaik tones replace Atari hue cycling.
The pixel HUD uses the original glyph shapes, while its positions
and the regularly spaced ladder rungs are browser-rendering adaptations rather
than reproductions of TIA raster timing.

Web Audio synthesizes the original event sequences for jumping, vine catching,
treasure collection, death and hole falls, together with log and wall contact
sounds. The frequency dividers, polynomial waveform families and four-frame note
cadence come from the source. Browser scheduling, output gain and sound-device
behavior are adaptations; there is no background music or bundled recording.
Audio starts after a user gesture, suspends during pause, menus and focus loss,
and is released with the View. The final event sound may complete over the result.

`ArcadeLeaderboardStore` uses the shared `BROWSER_STORAGE` boundary and validates
all persisted game results before displaying or writing them. Finished expeditions
are ranked by points, treasures and then elapsed time alongside the independently
ranked Breakout and RealSports Boxing results. Existing valid Pitfall records under
`symphony.arcade.pitfall.records.v1` are migrated into the consolidated store.
Duplicate result IDs are not added twice. Malformed or unavailable storage does not
prevent play; a write failure leaves the current visit playable. The leaderboard is
personal to this browser profile, not shared online.

## Ownership and verification

- `model/` owns deterministic rules, the room projection, shared sprite masks and
  immutable snapshots. It has no Angular or browser dependency.
- `rendering/` projects snapshots into the themed bitmap and HUD.
- `audio/` projects simulation events into browser sound.
- `records/` retains the Pitfall record schema used to validate legacy persisted runs.
- `leaderboard/` at the Arcade feature root owns validation, migration and ranking
  for finished results from all games through injected storage.
- `views/` owns commands, menus, progress, the active expedition and Mosaik
  composition directly in `PitfallView`, together with the shared canvas
  controller and animation/audio lifecycle. The game deliberately has no
  separate ViewPresenter.

Adjacent model and leaderboard-store specs cover world generation, gameplay transitions
and persistence behavior. The Electron journey is
`apps/renderer-e2e/src/arcade-pitfall.spec.ts`; the route parity decisions are in
`docs/architecture/frontend-reference-flamox.md`. Verification should cover the
selection-to-game path, waiting start, controls, menus, restart, focus suspension,
responsive fill, theme changes and return to Arcade.

## Sources and fidelity references

- [Activision's original manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=360)
  supplies the controls, scoring, lives, time limit, world size and treasure rules.
- [Thomas Jentzsch's commented disassembly, pinned revision](https://github.com/johnidm/asm-atari-2600/blob/38bdec5bf8f7a51da85b7f74779a6e1aec2f2b02/pitfall.asm)
  supplies the implementation contract: initialization at lines 2154–2191,
  reversible room decoding at 2193–2250 and 3011–3027, pit bounds at 2647–2652,
  jump deltas at 3040–3043, scene tables at 2604–2608 and 3330–3338, and sound
  sequencing/data at 1355–1375 and 2586–2594.
- [Stella's emulator documentation](https://stella-emu.github.io/docs/index.html) documents its
  separate cheat-code facility; those patches are historical tooling, not cartridge behavior.
- [The Genesis behavioral reconstruction, pinned revision](https://github.com/paulomanrique/pitfall-2600-genesis/tree/c5caa2b2d7026db2b5a83a93ab177d2cc5b2db94)
  provides a readable cross-check of the room, timing, collision and audio rules.
  Its added title menu and enhanced/remastered editions are not original features.

The explanatory article supplied during research calls scene types 2 and 3 empty
ground. `GroundTypeTab` in the original disassembly identifies them as permanent
tar and swamp pits. The source tables govern this implementation.
