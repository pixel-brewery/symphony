# California Games — Atari Lynx

This directory owns a self-contained TypeScript reconstruction of the 1989 Atari Lynx release. The model advances at a deterministic 60 Hz, the renderer writes a native 160 × 102 indexed framebuffer, and the audio adapter synthesizes four mono Lynx-style channels. Symphony does not bundle or execute a ROM, emulator, sampled soundtrack or remote runtime.

The View owns its Signals, Commands and browser lifecycle directly, as requested; there is no game ViewPresenter. The shared `ArcadeCanvasController` remains the only browser frame/input owner. Game rules, rendering and audio remain game-local so a second global engine is not introduced for one Lynx title.

## Sources inspected

- [Original Atari Lynx manual](https://static.atariage.com/manual_html_page.php?SoftwareID=2413): cartridge flow, four events, controls, time limits, scoring rules, ComLynx setup, Pause and Option-key combinations.
- [Atari Lynx hardware reference](https://github.com/asterick/atari-lynx-hardware-reference): 160 × 102 display, 4-bpp indexed framebuffer, 16 colors from 4096, sprite scaling/flip/tilt/collision and the four-channel Mikey audio architecture.
- [California Games screenshots preserved by AtariAge](https://atariage.com/screenshot_page.php?SoftwareLabelID=1871): title, event menu, HUD placement, event composition, sprite scale, Surfing tube and Half Pipe camera.
- [Atari Compendium Lynx notes](https://www.ataricompendium.com/game_library/easter_eggs/lynx/lynx_california_games.html): Half Pipe Option 2 scaling, Surfing pelican and exceptional 360 scoring.
- [LaunchBox Games Database entry](https://gamesdb.launchbox-app.com/games/details/18998-california-games): retail Lynx cover provenance.

These sources document rules and visible behavior but do not publish original sprite bytes, complete track geometry, collision masks, physics constants, audio register streams or every score table. Values without a published contract are calibrated reconstructions and are not described as frame-, register-, cycle- or byte-exact.

## Cartridge flow

The original flow is present inside the canvas: animated Epyx opening, California Games title, A/B start, four-item event menu, three-second countdown, event, event-over transition and the selected event's top-three screen. New qualifying entries are highlighted, and A/B returns to the event menu. Top threes remain available for the route visit. The Lynx release has no automatic six-event championship flow; only BMX, Surfing, Half Pipe and Foot Bag are offered.

The one-player setting uses Arrow keys, Z as A and X as B. The local two-player adaptation adds WASD, F as A and G as B. Q/E and R/T represent Option 1/Option 2 for players one/two. P or Escape is Pause; Option 1 + Pause restarts at the title, and Option 2 + Pause rotates the framebuffer and direction handling. The original ComLynx mode required a console and cartridge per player; shared-keyboard play is an explicit Symphony adaptation.

## Events

- **BMX** — 90 seconds, acceleration/braking/steering, A jump/remount, B flips, perspective course obstacles, crash recovery, remaining-time score and 25 percent finish bonus. Single through quadruple flips score 10/50/100/200.
- **Surfing** — 90 seconds, A starts and tightens turns, turns/tube/aerial/ride scoring, three single-player or six two-player wipeouts, 600-point quadruple and 1,200-point unreal 360, multiplayer contact and the late pelican appearance.
- **Half Pipe** — 75 seconds or three falls, rhythmic pumping, kick turns, aerials and held handplants. The renderer scales the rider with the camera and preserves the Option 2 scaling demonstration.
- **Foot Bag** — 90 seconds, movement/jump/turn/kick/catch/trip controls, total and current-combination scoring, drop reset, repeated-move multipliers, head/catch/turn/heel-lift/seagull/trip awards and the named Axle, Horseshoe, Jester, Double Arch and Doda combinations.

God mode prevents a crash, wipeout, fall or drop from ending the relevant event. It does not auto-finish events or award points.

## Graphics and audio

`CaliforniaGamesSurface` owns an index byte per logical pixel and clipping, lines, rectangles, flip, scale, shear, checker transparency and collision masks. `CaliforniaGamesRenderer` reconstructs the complete flow in a fixed 16-color Lynx palette, writes RGBA only at the canvas boundary, rotates the logical frame for the original flipped mode, disables smoothing and uses the largest integer scale that fits inside the complete inner pane below the Mosaik header. The framebuffer remains 160:102 and centered; unused edges use the darkest palette tone rather than stretching pixels. The original Lynx colors are a deliberate exception to the older monochrome Arcade renderers; application controls remain Mosaik Soho.

`LynxAudioChannel` models a 240 Hz sequenced tone/noise voice with a configurable 12-bit LFSR, integration and signed volume. `CaliforniaGamesAudio` mixes four voices to mono, caches six reconstructed music programs (title, high scores and one per event), plays simulation-ID-deduplicated effects, and owns gesture unlock, mute, pause, reset and disposal. The programs are new transcriptions in the style and event structure of the Lynx score, not copied samples or verified register dumps. Exact original melody licensing and register identity are therefore not claimed.

## Symphony integration

The route is `/main/arcade/california-games`. The packaged gallery cover is a lossless WebP conversion of the retained retail cover. Each completed player's event result is validated and stored in the shared local leaderboard; the best three per event are kept. The cartridge's own top-three screen remains inside the game flow, while the Arcade dialog provides persistent cross-session results.

The header, controls, instructions and fallback state use the installed Mosaik Soho components and tokens. The catalog remains a normal View/ViewPresenter pair; the game is a closed three-file View with no game presenter. The renderer stays sandboxed and uses no Node.js, IPC, orchestrator or desktop API.

## Verification

Adjacent model tests cover intro/menu transitions, all four event controls and limits, scoring, high scores, pause chords, screen flip, two players, God mode and deterministic catch-up. Surface/renderer tests cover the indexed palette, primitives, sprites, each scene, aspect-preserving output and screen flip. Audio tests cover all programs/effects, four-channel synthesis, de-duplication and lifecycle. View tests cover browser routing, focused-header input recovery, editable-field exclusion, two-player restart, pause-preserving instructions, once-only leaderboard writes and cleanup. `apps/renderer-e2e/src/arcade-california-games.spec.ts` exercises the packaged-process route, menu navigation from a focused application control, BMX acceleration, Surfing, Half Pipe and Foot Bag start behavior, reference screenshots, pause, screen flip, instructions, sound and two-player restart.
