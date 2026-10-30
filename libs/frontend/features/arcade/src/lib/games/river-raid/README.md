# River Raid (Atari 2600, NTSC)

A complete, local TypeScript reconstruction of the original one- and two-player game. The View owns the menu, console switches, commands and browser lifecycle directly. There is no ViewPresenter, ROM, emulator, network service or alternate game runtime.

## Sources and reconstruction

- [Activision's 1982 instruction manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=409): joystick behavior, guided B/straight A missiles, alternating two-player games, three reserve jets, points, fuel and the additional jet at each 10,000 points.
- [Thomas Jentzsch's commented NTSC disassembly, v0.9, 13 August 2001](https://github.com/johnidm/asm-atari-2600/blob/master/riverraid.asm), reconstructing Carol Shaw's original: `NextRandom16`, `SaveSection`, the block generator, `PFPat0…14`, `BankPtrTab`, interlaced object and aircraft sprite rows, the score table and `DoSound` register schedules. Only the required display data and translated game rules are included here; no cartridge image or executable 6502 code is shipped.
- [The requested Atari 2600 reference](https://www.retrogames.cz/play_036-Atari2600.php) supplies the original-game context and screenshot reference.

`RiverRaidWorld` starts with `$A814` and advances the original 16-bit shift register using feedback from high-byte bits 7 and 4. Every section contains 16 pairs of 32-scanline parts, with a bridge in the final part. It uses the original bank bitmap offsets and island flag transitions, including the wide early valleys, straight odd sections, jets from section three, decreasing fuel probability and the alternating difficulty ceiling at levels 47/48. An independent temporary arithmetic interpreter evaluated the original generator for 4,096 parts (128 sections), including the difficulty wrap. The translated seed, pattern, island state, all 32 playfield rows, object type, x coordinate, direction and width matched every record; the adjacent test preserves that reference fingerprint. Helicopter IDs 5/6 normalize to the same domain kind. The interpreter and disassembly remain outside the shipped repository. Enemy activation has a separate 8-bit shift register. The river is regenerated identically after a lost jet; a cleared bridge establishes the next return point.

The native display is 160×192: 160 river scanlines and a 32-line score/fuel panel. Sprite rows are deinterlaced from the original display tables and used by both drawing and pixel collision checks. Tankers and houses are double width; bridges are quadruple width. Every displayed color comes from the six public Mosaik scheme tones. Nearest-neighbor scaling fills the available pane.

The simulation uses 60 fixed frames per second, a 64–254 speed register returning to 128 at neutral input, two scroll additions per frame, acceleration in steps of eight, one guided/unguided missile, original target point values, 32 fuel units consumed per frame and 512 fuel units gained per contact frame. The player has one active aircraft plus three reserves and at most nine reserves. Score overflow at one million ends that player's game and displays exclamation marks. Each pilot's final score, section and elapsed time is recorded once through the shared leaderboard.

Two shared stateful TIA channel samplers preserve oscillator/divider/polynomial phase across browser frames. Engine, fire, explosion, refueling, full-tank and low-fuel cues use the reconstructed register schedules. Opening a menu, pausing, losing focus or leaving the route releases held controls and sound resources.

## Fidelity boundaries

This is a playable reconstruction, not a cycle-exact TIA or 6502 emulation. The seeded river sequence, original bitmap tables and console rules have direct source backing. Horizontal object coordinates translate the disassembly's coarse/fine position arithmetic into pixel positions. The initial runway placement and the 96-frame replacement transition are calibrated browser presentation choices; exact raster-entry timing, display-register collision latency and analog audio response have not been verified against a complete cartridge execution trace. Enemy activation is seeded deterministically for reproducible sessions instead of depending on how long a physical console sat on its title screen. Mosaik tones deliberately replace the cartridge's fixed colors. The footer identifies the active pilot instead of reproducing the original copyright raster.

## Cover

Original [AtariAge front-box scan](https://atariage.com/2600/boxes/b_RiverRaid_front.jpg), retained at `resources/arcade/originals/river-raid.jpg`, 600×836 pixels. Original SHA-256: `9c3866416e67685e12740d07826ecb55b00e0447cd50bae220bedf4d99cd15dd`. `resources/arcade/river-raid.webp` is a lossless conversion; decoded RGB pixels were compared byte-for-byte and match. No cropping, generated art or retouching is applied.

## Integration and verification

The View follows the shared `ArcadeCanvasController`, `readArcadePalette`, `ArcadeGodModeStore` and `ArcadeLeaderboardStore` owners. The inspected FLAMOX `TaskListView.ts/html` supplies the Mosaik Page/Header and Command composition. Exact companion `PageComponent`, `CardComponent` and `ButtonComponent` contracts supply the shell and menu controls. An isolated three-file View with empty SCSS adopts that composition; the game-specific canvas and View-owned simulation are intentional Arcade adaptations.

Adjacent model, world, audio and View tests cover the deterministic river and checkpoints, steering/difficulty, speed, reserves, player switching, pause preservation, result deduplication and audio disposal. `apps/renderer-e2e/src/arcade-river-raid.spec.ts` exercises actual keyboard controls, both themes, menus, mute, reset, player handoff and losing all four aircraft through normal collisions in Electron.
