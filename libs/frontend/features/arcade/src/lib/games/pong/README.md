# Pong — Atari arcade, 1972

This is the original two-human-player arcade game. It is independent of the Atari 2600 and the other games in this directory. There is no computer player. `PongView` owns its menus, commands and browser lifecycle; there is no ViewPresenter.

## Sources and reconstruction

[Stephen A. Edwards's original-circuit reconstruction](https://www.cs.columbia.edu/~sedwards/papers/edwards2012reconstructing.pdf), especially figures 7–14, supplies the raster, score decoder, movement counters and sound gates. The model uses a 455-clock line and 262-line field at 315/44 MHz, a 374 × 246 active raster, 4 × 15 paddles, a 4 × 4 ball, a dashed net, seven-segment scores without leading zeroes, and the operator's 11/15-point switch. Horizontal movement advances from one to two to three clocks per field after four and twelve hits. Eight contact regions produce −3 through +3 vertical motion, including two horizontal regions. The A6 wiring quirk samples the opposite paddle's B counter bit.

[Paul Falstad's circuit simulator](https://www.falstad.com/pong/), particularly [serve](https://www.falstad.com/pong/serve.html), [paddle sound](https://www.falstad.com/pong/hitsound.html) and [wall sound](https://www.falstad.com/pong/topsound.html), cross-checks the 1.7061-second serve, retained direction and running vertical phase. Serves travel toward the missed player. Attract play is silent, has no paddles and does not score. Reaching the selected target immediately stops scoring and returns the underlying court to attract play.

Audio follows the circuit signals: paddle `VBALL16`, wall `VBALL32`, score `32V`; the score gate lasts an ideal 242 ms. The synthesizer includes vertical blanking, counter reload, field reset and the paddle gate's termination at `VBALL240`. Frequencies are derived from these counter bits; contradictory frequency arithmetic in the paper's prose is not copied. There is no music or invented victory sound.

The [Texas Instruments 7448 data sheet](https://www.ti.com/lit/ds/symlink/sn7447a.pdf), pages 3–4, confirms the original decoder's six without a top bar and nine without a bottom bar; the renderer preserves these forms.

## Symphony adaptations and limits

W/S and Up/Down replace the two rotary controls. Pointer movement controls the paddle in its half of the court. Digital movement is four raster lines per field. The analog top end-stop is represented by an eight-line gap; actual cabinet calibration varied. Paddle positions persist between matches.

The simulation resolves gameplay per field, rather than emulating every TTL transition and propagation delay. Audio reconstructs digital gates, not the analog amplifier or speaker response. It therefore does not claim electrical or cycle-exact hardware emulation.

The pixel court stretches across the entire inner pane, with live Symphony background, foreground and lowlight tones. Non-original aspect ratios intentionally stretch the original raster. Mosaik title/setup, instructions, pause, sound controls and results, focus protection and the shared saved-match leaderboard are desktop additions. Starting a match preserves the running attract direction and vertical phase; opening a menu preserves an existing match.

Shared patterns: `ArcadeCanvasController`, `readArcadePalette`, `ArcadeLeaderboardStore`, and Mosaik Page/Header/Content/Card/Button/Select with `CommandDirective`. The view has an empty stylesheet and no renderer-side Node or persistence APIs.

## Cover provenance

`resources/arcade/originals/pong.jpg` is the 850 × 1099 original Atari flyer, downloaded from the [Wikimedia Commons source file](https://upload.wikimedia.org/wikipedia/commons/6/68/Pong_Flyer.jpg). Its [provenance page](https://commons.wikimedia.org/wiki/File:Pong_Flyer.jpg) identifies the 1972 US promotional publication and its public-domain status. The [Arcade Museum flyer record](https://flyers.arcade-museum.com/videogames/show/1885) independently identifies this artwork. `resources/arcade/pong.webp` is a lossless conversion at the same dimensions. No invented Atari 2600 box, ROM or emulator is included.

## Verification

Adjacent tests cover both winning players and score switches through normal controls; every speed threshold; independent paddle movement; the A6 quirk; automatic serve and attract behavior; pause/reset; sound gates and lifecycle; full-pane live-theme raster output; and exactly-once result recording. The Electron journey covers menus, controls, themes/resizing, pause/resume/reset and a completed match saved in the shared leaderboard.
