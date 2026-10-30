# Pitfall II: Lost Caverns

A self-contained reconstruction of David Crane's 1984 Atari 2600 NTSC expedition.
The Arcade catalog opens the lazy `/main/arcade/pitfall-ii` route. The View owns
menus, commands and browser lifecycle directly, as requested; there is no game
ViewPresenter. The deterministic model, pixel renderer and synthesized audio stay
in separate game-owned modules. Existing `ArcadeCanvasController`, public Mosaik
palette, Arcade test mode and consolidated leaderboard remain the shared owners.

## Scope and original reference

The target is the Atari **2600 NTSC** release, not the expanded Atari 5200/8-bit,
ColecoVision, Commodore 64 or Sega arcade versions. Research used the original
cartridge identified by MD5 `6d842c96d5a01967be9680080dd5be54`. The cartridge and
research disassembly are not bundled or executed by Symphony. The implementation
contains reconstructed game rules and explicit map, sprite and musical-score data.
It is not a cycle-exact hardware emulator.

- [Activision's original manual, preserved by AtariAge](https://atariage.com/manual_html_page.php?SoftwareLabelID=359)
- [Complete Atari 2600 map, preserved by AtariAge](https://atariage.com/2600/archives/strategy_pitfall2_map.html?SystemID=2600)
- [Atari 2600 screenshot map by KingKuros](https://www.vgmaps.com/Atlas/Atari2600/PitfallII-LostCaverns-LostCaverns.png)
- [Original Atari 2600 reference and cover](https://www.retrogames.cz/play_030-Atari2600.php?language=EN)
- [David Crane interview about the music and cartridge hardware](https://www.ataricompendium.com/archives/interviews/david_crane/interview_david_crane.html)
- [Original DPC hardware patent](https://patents.google.com/patent/US4644495A/en)
- [Stella's DPC counter and amplitude behavior](https://github.com/stella-emu/stella/blob/master/src/emucore/CartDPC.cxx)
- [Stella's oscillator calibration](https://github.com/stella-emu/stella/blob/master/src/common/AudioSettings.hxx)

The map uses eight 160-pixel chambers and 45-scanline floor spacing. Platform
patterns, wall boundaries, ladders, creatures, checkpoints and pickups are explicit
fixed data, cross-checked between the screenshot map and its text counterpart.
Sprite masks are reconstructed from the original display data and reference
images; their provenance is recorded in `rendering/README.md`.

Remaining timing and geometry differences are explicit: the model runs logical
60 Hz steps rather than emulating TIA/6502 cycles. Chamber transitions use continuous
160-pixel world coordinates, and creature activation follows the reconstructed
camera window rather than the cartridge's RAM slots. The balloon's vertical offset
is calibrated to this world, not validated against a complete cartridge execution
trace. These are limits on exact hardware fidelity, not omitted levels or objectives.

## Expedition

The initial score is 4,000. All 28 gold bars, the cave rat, the diamond, Rhonda and
Quickclaw are present. A perfect expedition scores 199,000. Recovering the diamond
and both companions ends play immediately, even when optional treasures remain.
There is no countdown or finite life supply. Collected items remain collected
through setbacks; New game resets the expedition.

Crosses update the return point. Enemy contact produces the original injury
interlude and a visible journey back with a distance-dependent score deduction.
Unintentional falls cost points. The complete traversal includes running jumps,
ladder entry and ascent, swimming and diving, waterfalls, drifting across shafts,
and catching and steering balloons. A bat must pop the balloon before Harry can
land; approaching the rat from its front does not collect it.

Arrow keys reproduce joystick directions; WASD are aliases. Space is the fire
button. Up and Down climb, control swimming depth and adjust balloon speed in the
appropriate state. P/Escape pause. Input cancellation, focus loss, resize and route
destruction use the same browser controller as the other games.

## Audio

`PitfallIIMusic` contains the three original DPC voice streams for each of the four
arrangements, including note lengths, oscillator dividers and rest/sustain flags.
The NTSC music tables are at `$FA4E/$FA5A` (pointers) and `$FA6A` (durations); the
music driver occupies `$F8AD–$F93A`. The upbeat arrangement runs 1,152 frames before
the 896-frame background loop. The minor arrangement also runs 896 frames before
returning to the background; the balloon arrangement repeats after 1,344 frames.

The three DPC voices use the original amplitude weights of 4, 5 and 6. The fourth
voice follows the original TIA percussion and countdown-driven jump, fall,
checkpoint, treasure and balloon-pop effects (`$F744–$F7F8`). Effects replace
percussion while the melodic voices continue. The 128-frame injury interval is
silent; the minor arrangement accompanies the return journey. Repeated treasure
collection during the upbeat arrangement does not restart its opening.

Music preserves the original note durations, rests and final-frame gates. The
browser audio context starts only after a player gesture, pauses with gameplay,
respects mute and is released on route destruction. Browser PCM reconstructs the
chip waveforms at Stella's nominal 20,000 Hz DPC oscillator setting. Analog
cartridge oscillator variation, output filtering and CPU-cycle phase are not
claimed bit-identical.

## Symphony adaptations

The cover retains its printed colors; gameplay uses only the current Symphony
scheme tones, including after a light/dark change. The canvas fills the complete
inner pane below the header at native display density. Menus, instructions,
pause/resume, sound control, the completion overlay and shared leaderboard are
application additions. They are not presented as original Atari menu screens.

Completed expeditions add one validated `pitfall-ii` record to the shared
leaderboard. Unfinished expeditions can be continued from the game menu during the
same route visit but are not persisted across navigation or application restarts.
The existing session-only Arcade God mode is a Symphony testing aid, not a claimed
original cartridge feature.

## Verification

Adjacent model tests check original movement cadences, collision masks, checkpoint
deductions, all pickup scores, reset and immediate completion. A directed map audit
checks structural access to every pickup; separate control-driven tests exercise
river-to-ladder ascent and the bat-to-balloon-to-bat sequence. This is not presented
as a recorded perfect playthrough. Audio tests cover the score, effects, event order
and browser lifecycle. Electron journeys exercise the catalog, menus, controls,
camera scrolling, swimming, both schemes, resizing and persisted completed results.
