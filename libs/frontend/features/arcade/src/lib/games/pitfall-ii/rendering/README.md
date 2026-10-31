# Lost Caverns pixel reconstruction

The renderer adopts `PitfallRenderer`'s small offscreen bitmap and nearest-neighbor presentation,
and the shared `readArcadePalette` boundary. The Atari 2600's 160 × 192 pixel scene fills the
available canvas; the application controls its actual dimensions and DPR. Every fill comes from
one of the six public Mosaik scheme colors. The unchanged Harry/scorpion/gold masks and numeral
font are reused from the existing Pitfall implementation rather than maintaining competing copies.

The 24-line score area and 16-line footer remain fixed. The model supplies the complete world
and camera; platform segments, walls, ladders, water, collectibles, moving hazards and balloon all
use global coordinates and are clipped to the scrolling playfield. Actor coordinates describe
their feet. As in the original screenshots, standing figures overlap the nine-line platform by
six scanlines. Horizontal chamber changes and vertical scrolling come only from the model.

## Original Atari 2600 evidence

- [KingKuros's VGMaps Atari 2600 map](https://www.vgmaps.com/Atlas/Atari2600/PitfallII-LostCaverns-LostCaverns.png)
  supplies the static object masks: Quickclaw, Rhonda, the diamond, rat, checkpoint and balloon.
  The 2520 × 1456 composite has eight 304-pixel-wide screenshot columns starting at x = 16 and
  spaced 312 pixels apart. These contain 152 doubled TIA pixels, omitting four logical pixels at
  each horizontal edge; the cropped four-pixel margins extend their nearest observed playfield
  column. Floors are exactly 45 scanlines apart, with the surface at image y = 147.
- [Atarimania's NTSC screenshot set](https://www.atarimania.com/game-atari-2600-vcs-pitfall-ii-lost-caverns_s6896.html)
  provides reference poses of the bat, condor, frog, eel, diagonal swimming,
  waterfall, and the alternating Activision/Copyright 1983 footer. Sprite rows were
  transcribed by sampling each doubled horizontal pixel once, retaining the original scanlines.
  Exact image URLs are `/2600/screens/pitfall_ii.gif` and `pitfall_ii_2.gif` through `pitfall_ii_8.gif`
  on the same host. These screenshots are 304 × 192. No C64 or Atari 5200 graphics are used.
- [AtariAge's Atari 2600 ASCII map](https://atariage.com/2600/archives/strategy_pitfall2_map.html?SystemID=2600)
  provides the moving hazard placement, which is deliberately absent from the screenshot mosaic.

The NTSC cartridge linked by [RetroGames](https://www.retrogames.cz/play_030-Atari2600.php)
was inspected as research material (MD5 `6d842c96d5a01967be9680080dd5be54`). No ROM is bundled.
The DPC graphics address `a` is stored at file offset `10239 - a`; the 2 KB graphics bank
occupies offsets 8192–10239. Bank 1's `$FA16/$FA24` tables select Harry's 14 original poses:
indices 0–5 retain the existing Pitfall masks, 6 adds his recovery pose, 7–8 climb, 9–12 swim,
and 13 combines the balloon/string and hanging Harry into 48 scanlines. Each standard frame
has 21 source rows and a blank pad row in the renderer. Original per-scanline object graphics
and color bytes alternate; bank 0's `$DE03/$DE14` pointer tables, `$DE25/$DE36` mask boundaries,
and `$DE7A` animation offsets supply both exact frames of scorpions, bats, condors, gold,
the rat, Quickclaw, frogs, eels and the waterfall. These shared pure bitmap tables live in
`model/PitfallIISpritePatterns.ts`, also used for pixel collisions.

This is a pixel reconstruction rather than an emulator. Source-visible sprite poses are exact
binary masks, including all four swimming poses and both frames of every moving creature.
Canopy silhouettes, platform undersides, cavern rocks and solid riverbanks retain the source
map's four-pixel playfield columns. `PitfallIIRockPatterns` stores 52 unique binary rows and
run-length bands for each chamber, beginning at global y=120; each four-character band encodes
the row index and height as two base-36 digits each. This keeps the striped side rocks and
filled riverbanks pixel-faithful instead of drawing generic solid walls.
Water ripple and footer timing are reconstructed. Original cartridge colors are intentionally
replaced with Symphony's theme.
