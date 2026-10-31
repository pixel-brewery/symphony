# Jungle Hunt — Atari 2600 NTSC

A self-contained TypeScript implementation of the four Atari 2600 stages. The model runs at 60 updates per second; the renderer paints a 160 × 192 bitmap stretched across the inner pane with nearest-neighbor scaling. No ROM, emulator, external game runtime or network request is used in the application.

## Sources inspected

- [Atari's original 1983 manual scan](https://atarionline.org/wp-content/uploads/2021/11/jungle-hunt-1982-atari-2600-instructions-manual.pdf), printed pages 1–6, including the photographed river display and illustrated scoring table. Printed page 1 gives eleven vines, fourteen crocodiles and two guards. Pages 2–4 describe five lives, the time limit, four stages, controls, two skill selections and the harder repeating rescue loop. Page 5 gives obstacle scores and the extra life.
- [Atari's 1987 manual transcription](https://atariage.com/manual_html_page.php?SoftwareID=1100), used to cross-check the scan's small scoring text. The rescue award is three times the timer value, with 500 for each section exit and one extra life at 10,000. The console difficulty switches have no effect. This cartridge has one player; the two select positions are easy and expert, not multiplayer variations.
- [Requested Atari 2600 reference page](https://www.retrogames.cz/play_075-Atari2600.php) and its [original forest screenshot](https://www.retrogames.cz/games/075/A26_01.gif), inspected for right-to-left travel, pendulum vines, canopy/undergrowth blocks and score/lives/timer placement. The page's general game prose mixes platform versions; arcade-only gorillas, sloping mountains and hanging cauldrons were not treated as Atari 2600 evidence.
- [IRogers' first-hand 2001 cartridge walkthrough](https://gamefaqs.gamespot.com/atari2600/584823-jungle-hunt/faqs/8725) corroborates underneath knife attacks, seventeen rocks, the continuously repeated course, the visible timer bonus and the second quest. This is secondary play testimony, not original program source.

The original manual's screenshot shows a four-digit timer (`3990`), and the supplied forest reference shows `4980`. The implementation displays tenths, initially `5000`, while exposing remaining seconds separately to accessibility and tests. The rescue award uses the displayed value rather than multiplying the seconds value by three.

## Implemented rules

- Eleven independently swinging vines; fire releases into a jump, catching the next vine scores 100, falling loses a life, and the last leap exits into the river.
- Fourteen crocodiles in schools and two lone rogues; rogue depth changes, closed/partly-open/fully-open jaws, underwater movement, a depleting air supply, surface refill, and upward knife strokes. Fully-open jaws are invulnerable. Closed jaws score 100, partly-open 200, rogues 300; attacks must approach the underbelly.
- Seventeen rolling or bouncing rocks; left/right movement, ducking, jumping and extra lift while Up is held. Passing underneath scores 50, ducking 100, jumping above 200. Each rock scores once per section attempt.
- Two moving spear guards, each worth 200, followed by reunion with Lady Penelope. The reunion awards the fourth section exit and timer bonus, then returns to a harder forest with a fresh timer. There is no artificial final campaign level.
- Five initial lives, a single extra life at 10,000, a shared rescue countdown across stages, loss on time expiry or exhaustion of lives, and six-digit score rollover. A lost life restarts the current section without restoring the rescue timer.
- Easy/expert selection, title/instructions/continue/reset/end controls, actual pause including transition/death/reunion phases, mute, focus-loss suspension and route disposal. Menus preserve an unfinished run. An explicitly ended or naturally lost run is recorded once through the shared leaderboard. Reset and ordinary menu visits do not create a result.
- The shared god-mode preference removes hazard damage, drowning and time expiry. A missed vine returns to the previously held vine; it does not skip the forest or auto-complete objectives.

## Reconstruction limits

Rules and original-screen composition are source-backed. The pendulum frequencies, leap physics, river/current speeds, air capacity, rock bounce phases, guard motion, transition durations and difficulty scaling are calibrated gameplay values, not recovered 6502 routines. The 500-second countdown follows the manual; reported acceleration of the original displayed countdown has not been independently measured and is not claimed as reproduced. Six-digit wrap, restarting the current section after a death, the rock placement sequence and timed effects likewise are explicit reconstruction choices, rather than verified ROM state traces.

The pixel character poses and scenery are reconstructed from the inspected low-resolution reference images. They are not extracted original sprite bytes. Audio uses short deterministic TIA-style pulse/noise effects for jumps, grabs, stabbing, collisions, stage exits, extra life, rescue and game over. The event phrases are reconstructed; original waveform and music-note identity has not been established. This implementation therefore does not claim byte-identical sprites, cycle accuracy or an exact cartridge audio recording.

All raster colors come from `readArcadePalette` and its six public Mosaik scheme tones. The original Atari hue palette is intentionally replaced by the active Symphony theme. The game View uses the inspected FLAMOX365 TaskListView's Mosaik Page/header/content composition and public Card/Button APIs; the user-requested self-contained arcade View owns Commands/Signals without a ViewPresenter.

## Cover provenance

The requested reference page explicitly links [the original full Atari cover](https://www.retrogames.cz/games/075/obal_Atari2600_big.jpg) in its cover preview. It was downloaded without cropping as `resources/arcade/originals/jungle-hunt.jpg` (363 × 500), visually verified, and converted to `resources/arcade/jungle-hunt.webp` in lossless mode. Decoded RGB pixels are identical. The cover is a historical product image, not generated artwork.

## Verification

Adjacent model tests drive physical controls through the forest and river, exercise drowning/time expiry, pause/reset, all four sections and rescue difficulty progression. Adjacent audio tests check deterministic finite samples, event de-duplication, mute/pause/reset/disposal and denied audio activation. View tests cover saved run state, skill application and once-only leaderboard writes. Renderer tests check all stages, the 160 × 192 buffer, full-pane blitting, disabled smoothing and exclusive use of the six public tones. `apps/renderer-e2e/src/arcade-jungle-hunt.spec.ts` exercises the real Electron route in both themes with real keyboard and menu controls.
