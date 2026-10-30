# RealSports Boxing

A playable Symphony reconstruction of Atari's **RealSports Boxing (1987)**, with its own model,
side-view pixel ring, browser sound and menus. It is independent of Activision's Boxing and Pitfall.

## Original game contract

The four contenders, controller combinations, one/two-player modes, A/B opponent difficulty,
seven rounds, 99-point limit, defensive scoring, strength lead, individual knockdown weaknesses,
nine-count recovery, ten-count knockout and twelve-unanswered-punch TKO follow the
[Atari manual scan](https://www.retrogames.cz/manualy/Atari2600/RealSports_Boxing_-_Atari2600_-_Manual.pdf) and
[AtariAge's manual transcription](https://atariage.com/manual_html_page.php?SoftwareID=1246).
Covering initially resets a flurry; twelve further unanswered blocked punches still produce a TKO.
Escaping or landing a counterpunch also clears the count. Local players must press their own Up
control at nine to rise, provided sufficient strength remains. One-player recovery is automatic.

The result distinguishes KO, TKO, a points decision and a draw. Winners celebrate before an
attract fight resumes; the match result remains available for review and rematch.

## Reconstruction limits

This is a complete rules implementation, **not a ROM emulator or a frame-exact port**. No verified
RealSports Boxing disassembly was located. Movement, collision reach, stamina quantities,
reaction delays, AI decisions, knockdown threshold and recovery threshold are calibrated values.
Jab/body/payoff base recovery is 12/24/36 simulation frames, preserving the manual's 3:1 jab-to-payoff
rate. A strength advantage of 25 enables the documented finishing opportunities; at least 18
remaining strength permits getting up. Rest restores 16.8 strength over four seconds.

The three-minute game clock runs at four displayed seconds per real second, producing a
45-second round, consistent with the direct gameplay observations in
[AtariProtos' RealSports Boxing review](https://www.atariprotos.com/2600/software/rsboxing/rsboxing.htm).
The referee advances every 0.75 seconds. These timing choices are not claimed as cycle measurements.

Sprites are hand-drawn pixel reconstructions, and sounds are synthesized retro effects rather than
copied cartridge graphics or sampled original audio. The original HUD arrangement (relative-strength
bars above score boxes, centered timer and round number) was checked against the manual diagram.
Only the six public Mosaik scheme tones are used; the complete ring expands across the available
area without a letterbox. Browser pause, keyboard mappings, accessible menus and retained results
are Symphony adaptations. The input/resize/focus lifecycle and theme palette use the shared Arcade
browser controller and palette boundary. The standalone `RealsportsBoxingView` directly owns
menu state, match commands, selections and browser lifecycle alongside its HTML and SCSS.
Terminal match results also contribute to the consolidated, browser-profile leaderboard on the
Arcade hub; no leaderboard is displayed within the game route.

## God mode: historical exploit and Symphony adaptation

No credible original invulnerability, reflected-damage or developer God mode was located for
RealSports Boxing. The documented cartridge-frying oddity can remove both fighters and later start
a Jabbin' Jack mirror match; it does not provide invulnerability and depends on unsafe hardware
behavior. It is recorded in the
[Atari 2600 Easter Eggs and Glitches FAQ](https://gamefaqs.gamespot.com/atari2600/916365-atari-2600/faqs/9743),
while the [original manual](https://www.atariage.com/2600/manuals_old/realsports_boxing.html) remains
the source for legitimate match rules.

Symphony's window-wide Konami sequence enables a separate, renderer-session test adaptation. In a
non-demo match, every opponent blow that actually lands on Player 1 applies its calculated damage,
score and unanswered-hit progress to the opponent instead. Player 1 loses no strength and receives
no hurt or knockdown reaction; twelve reflected unanswered blows still award Player 1 the normal
TKO. Matches behave exactly as documented when the mode is off.

## Verification

Adjacent model tests exercise all four finishing weaknesses, relative directional punches, range,
cover and counter resets, ordinary-control and reflected twelve-punch TKOs, nine/ten counts, both CPU difficulties,
round recovery, seven-round decisions and draws, score limits, pause, demo and rematch. Audio tests
check event deduplication, silent attract events and reset/disposal of scheduled sounds.

A normal-control TKO path for acceptance testing: choose two local players, Iron Fists against
Macho Man. Hold Player 1's Right for 4.5 seconds to reach the right ropes, keep Right held, and tap
fire twelve times with at least 0.35 seconds between presses. This uses no model placement seam.
