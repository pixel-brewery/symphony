# Seaquest — Atari 2600 NTSC

Browser-native reconstruction of Steve Cartwright's 1983 Activision game. No ROM,
emulator, network service or cartridge runtime is shipped.

## Sources and provenance

- [Original Activision manual, AX-022-03](https://www.atariage.com/2600/manuals_old/seaquest.html): console selection, one/two alternating players, difficulty switches, rescue and surfacing rules, four starting submarines, six reserve limit, oxygen warning and scoring.
- [Dennis Debro's annotated NTSC disassembly, updated May 18, 2018](<https://github.com/milnak/atari-vcs-disassembly/blob/main/Third%20Party/Seaquest%20(1983)%20(Activision)%20-%20Dennis%20Debro.asm>): movement bounds, fractional speed accumulator, LFSR, eight obstacle layouts, enemy/diver lifecycle, bitmap graphics, exact audio register sequences, bonus/refill timing, and the six-digit score cap.
- [Reference game page](https://www.retrogames.cz/play_221-Atari2600.php) and its [original cover GIF](https://www.retrogames.cz/games/221/obal_Atari2600.gif). The 120×155 source is retained at `resources/arcade/originals/seaquest.gif`; the catalog uses a lossless WebP conversion. Decoded RGBA pixels were compared and match exactly. Original SHA-256: `41033eb95e4dab85f81c75d86f8e3e451f04a28cc9f91104f363037450b56685`.

The disassembly header attributes original code to Steve Cartwright/Activision and
its analysis, labels and comments to Dennis Debro. Sprite rows and audio register
values are transcribed data. No assembly program or assembled cartridge is bundled.

## Rules and controls

Arrow keys or WASD move in four directions. Left/right also turn the submarine.
Down begins a dive. Space fires continuously; one missile exists at a time and
moves with the submarine's depth. The B switch advances a missile five horizontal
pixels per frame; A advances it three. Each player's switch is independent.
P or Escape pauses; menu, focus loss and document hiding suspend play.

The submarine moves one pixel per 60 Hz tick, between x=21–134 and y=13–108.
Oxygen holds 64 units and drains one every 32 frames while submerged below y=19.
The last sixteen units produce the warning. Contact with a diver adds it to the
six-person hold. A collected lane cannot supply another diver until all four lanes
have supplied one. Sharks can catch a diver and increase its swimming speed.

Surfacing with six divers first awards the current enemy value for each remaining
oxygen unit, one unit every two frames. Each diver is then awarded separately,
one every sixteen frames. Refill restores one oxygen unit every two frames.
Early surfacing restores air, loses one diver and increases enemy speed. Empty
surfacing, zero oxygen, enemy torpedoes and submarine/shark contact destroy the
submarine. Death removes one collected diver. The surface patrol starts at round
three, travels left and remains dangerous during refill; bonus counting freezes it.

Enemy points rise from 20 to 90 with completed batches. Diver awards rise from 50
to 1,000. Each 10,000 points adds a reserve, up to six. Both players retain separate
scores, divers, round, difficulty, reserves and play time, and alternate after a
lost submarine. Exhausted players are skipped. Scores saturate at 999,999 and the
finalized player stops. Every finalized player is recorded once in the shared
Arcade leaderboard. Reset discards unfinished progress; Continue preserves it.

## Rendering, sound and adaptation

The 160×210 pixel composition fills the available content pane without filtering.
All drawing resolves only the six public Mosaik scheme tones through the shared
`readArcadePalette`; original chromatic colors deliberately map to the active theme.
Player, enemy, diver, explosion, reserve, rescued-diver, score, oxygen-label, reef
and copyright pixels come from the disassembly. The diver raster reconstructs the
original BALL motion/size tables. Public Mosaik Page, Card, Select, Button and Kbd
components provide setup and instructions. The OnPush three-file View owns commands,
lifecycle and menu state directly, reusing `ArcadeCanvasController` and
`ArcadeGodModeStore`; there is no game presenter or separate leaderboard.

The audio sequencer transcribes AUDC/AUDF/AUDV values and shares the existing pure
TIA synthesizer. The original two channels retain replacement priority for shots,
hits, divers, warnings, death, rewards and refill. No separate extra-life or
completion cue is present in the source driver. Browser audio unlock, mute,
pause/reset and disposal are implemented.

This is a logical reconstruction, not cycle-exact TIA emulation. Startup is a
full-tank, input-ready state. Actor lane/raster alignment and pixel collision are
reconstructed from the kernel rather than verified against an exhaustive cartridge
execution trace. The source's register and fractional-speed rules are retained,
but frame catch-up is bounded to 250 ms, death occupies 92 logical frames, and audio
polynomial phase restarts per event instead of maintaining console-global phase.
The ready screen waits for Down; the original console's attract/color-cycling and
Game Select/Reset switches are represented by the Mosaik menu. A maxed-out player
in a two-player match hands control to an unfinished opponent. These are explicit
desktop adaptations, not additional cartridge variations.

## Verification

The packaged Electron journey passed in both light and dark themes; screenshots
were inspected and score/reserve contrast was corrected to the foreground tone.

Adjacent model tests exercise movement, missile depth and A/B speeds, actual diver
pixel pickup, six-diver and early-surface scoring, oxygen death, the surface patrol,
independent alternating players, reserve awards, score saturation, pause and God
mode. Adjacent View tests cover menu preservation, console-option/reset semantics,
once-only player results and browser lifecycle; audio tests cover register data and
browser channel lifecycle. The Electron acceptance journey uses real keys to dive,
fire, surface empty, hand control to player two, reset and leave the route.
