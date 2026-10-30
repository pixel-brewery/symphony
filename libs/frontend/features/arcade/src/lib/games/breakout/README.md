# Breakout — Atari 2600

This game reconstructs the twelve **1978 Atari 2600 Breakout** cartridge variations. It is not the arcade ruleset, Super Breakout or Arkanoid. The model, drawing, audio and Angular page stay in this directory; the Arcade route and browser lifecycle belong to the shared feature.

## References and verified rules

The primary reference is Atari's original instruction booklet, available as an [HTML transcription](https://atariage.com/manual_html_page.php?SoftwareID=889) and [scanned manual](https://www.digitpress.com/library/manuals/atari2600/breakout.pdf). The user supplied [RetroGames cartridge page](https://www.retrogames.cz/play_222-Atari2600.php) identifies the game, but its general description mixes in arcade rules and is not used to override the cartridge manual.

| Game Select    | Normal | Steerable | Catch | Invisible |
| -------------- | ------ | --------- | ----- | --------- |
| Breakout       | 1      | 2         | 3     | 4         |
| Timed Breakout | 5      | 6         | 7     | 8         |
| Breakthru      | 9      | 10        | 11    | 12        |

The six rows award 7, 7, 4, 4, 1 and 1 points from top to bottom. Eighteen bricks in each row produce 432 points per wall and the documented 864-point maximum across two walls. Each team gets five balls and an independent wall. Opponents alternate after misses; three players form a pair versus one, and four form two pairs. Partners have separate half-field paddles.

The first cleared wall is replaced automatically. A normal match compares points; two perfect scores compare balls used. Timed variants accumulate playing time, including caught-ball aiming, without a countdown. Catch holds the ball while its button remains pressed. Steerable variants respond to paddle-controller movement; Breakthru removes bricks without reflecting the ball. Invisible bricks briefly reveal the wall on contact.

Difficulty B is three-quarters of A, as the manual explicitly specifies. The manual also specifies five paddle zones, angle changes after the third, seventh and eleventh returns, restoration after the twelfth, and increased speed after twelve returns or contact with any of the top three rows.

## Reconstruction parameters, not measured hardware values

No original 2600 disassembly or instrumented cartridge timing was available. Consequently **this implementation does not claim cycle-accurate emulation**. The following values are chosen, reviewable browser parameters rather than measured original constants:

- A 160 × 192 logical raster, 20/15-pixel paddles, two-pixel ball, wall/paddle/brick placement and the compact pixel numeral shapes.
- A deterministic 60 Hz update and collision substeps no longer than 0.75 logical pixels; 72 pixels/second normal ball speed, 112 fast, and 130 pixels/second keyboard paddle movement.
- Five strike zones use 25°/50°/90°/50°/25° angles from the horizontal. Noncentral angles decrease by 5°, 10° and 15° at the documented thresholds, then reset. The manual's center-zone “jump” is interpreted as a vertical return.
- Steering adds 1.8 units of horizontal velocity per moved paddle pixel, preserving speed and a vertical component. The serve starts above the selected paddle at a 0.42 horizontal speed fraction. These reproduce controllable paddle play rather than an unverified original trajectory table.
- Invisible-wall illumination lasts eighteen frames, and finished two-team boards alternate every sixty frames. The behaviors are documented; those durations are not. Result boards show remaining bricks and scores without inactive paddles or a ball.
- Synthesized single-channel square-wave contact cues use 220–880 Hz, with short serve/miss/completion sweeps. Their frequencies and envelopes are original implementation choices, not transcribed TIA register sequences. No recording, ROM, background music or external game framework is bundled.
- The timed-game manual defines the winner when walls are completed but does not resolve every incomplete-game tie. Here, completed walls outrank incomplete walls; two complete timed matches compare elapsed time. If neither finishes, points determine progress and elapsed time breaks an equal-progress tie.

## Symphony adaptations

The persistent canvas fills all page content below the header, with nearest-neighbor scaling and no letterboxing. The shared `readArcadePalette` supplies live Mosaik tones in both themes. The original three scoring bands become three neutral shades; the source's colored six rows remain six separate brick rows.

The Mosaik menu replaces hardware Game Select and difficulty switches. It opens through Mosaik's shared dialog service with an owned backdrop, while pause and result panels remain game-local overlays. How-to text, replay, a result panel and mouse/keyboard input are desktop additions. Completed matches contribute their team result to the consolidated leaderboard on the Arcade hub; the game route does not expose a leaderboard of its own. The shared `ArcadeCanvasController` owns animation timing, device-pixel-ratio resizing, key aliases, editable-field guards, pointer events and cleanup. Browser focus loss freezes play without consuming a ball or releasing a caught one. Audio starts only after a trusted gesture.

Arrow keys or A/D move the first paddle; J/L move its partner. Space and K are the respective red buttons. Pointer motion controls the paddle in its current half; press and release serve or catch. P and Escape pause.

## God mode: historical cheat and Symphony adaptation

No original invulnerability switch was found. A documented Atari-era Breakout trick uses the Catch
variation and console Select to enter a self-playing demonstration with unlimited balls, but the
demonstration does not award a playable score. That historical behavior is described by
[PBS's Video Game Revolution cheat history](https://www.pbs.org/kcts/videogamerevolution/inside/cheats.html);
the [original cartridge manual](https://www.atariage.com/2600/manuals_old/breakout.html) defines the
normal five-ball rules and variations.

Symphony keeps those normal rules when God mode is off. Its session-only test adaptation instead
reflects a missed active ball from an invisible lower safety edge. The same ball, speed, rally,
wall, bricks and score continue; the adaptation does not consume a ball or start a new serve. It is
activated by the window-wide Konami sequence and is not presented as cartridge behavior.

## Verification

Adjacent model tests exercise all special variation families, controller teams, independent walls, score totals, ball allocation, catch/release, steering, hidden bricks, timer behavior, collision/speed thresholds and the God-mode safety edge. `placeBall` is a deterministic simulation seam used by those tests; the UI never exposes it. View tests cover menu-to-match transitions and pause/resume. The standalone View owns menu state, commands and the current match directly; no game ViewPresenter is used. Tests use the renderer Nx target rather than a separate game runner.
