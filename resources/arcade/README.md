# Arcade cover sources

The seven Atari 2600 covers and the original Atari Pong sales flyer are retained in `originals/`. The Arcade gallery loads the adjacent WebP files from the packaged `arcade/` asset directory. No remote image request is made at runtime. Pong represents the requested original 1972 arcade machine, so its authentic flyer replaces a cartridge box.

Pitfall!, Breakout and RealSports Boxing were retrieved on 2026-09-05; the other five images were retrieved on 2026-09-18. All originals are static, one-frame images and were inspected before use. WebP encoding uses Pillow with `lossless=True`, `quality=100`, `method=6` and `exact=True`. Decoded RGBA pixels were compared byte for byte with the original decoded images and match for all eight assets. Dimensions, frame count and original print colors are unchanged; no crop, resize, recoloring or generated artwork was applied.

| Game                     | Original source                                                      | Preserved original                          | Packaged lossless WebP         | Dimensions | Original / WebP bytes |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------- | ------------------------------ | ---------- | --------------------- |
| Pitfall!                 | [Source](https://www.retrogames.cz/games/029/obal_Atari2600.gif)     | [Original](originals/pitfall.gif)           | [WebP](pitfall.webp)           | 120 × 155  | 11777 / 9186          |
| Pitfall II: Lost Caverns | [Source](https://www.retrogames.cz/games/030/obal_Atari2600.gif)     | [Original](originals/pitfall-ii.gif)        | [WebP](pitfall-ii.webp)        | 120 × 155  | 11701 / 9704          |
| Breakout                 | [Source](https://www.retrogames.cz/games/222/obal_Atari2600.gif)     | [Original](originals/breakout.gif)          | [WebP](breakout.webp)          | 120 × 155  | 11503 / 9380          |
| RealSports Boxing        | [Source](https://www.retrogames.cz/games/823/obal_Atari2600.gif)     | [Original](originals/realsports-boxing.gif) | [WebP](realsports-boxing.webp) | 120 × 155  | 13156 / 10178         |
| Jungle Hunt              | [Source](https://www.retrogames.cz/games/075/obal_Atari2600_big.jpg) | [Original](originals/jungle-hunt.jpg)       | [WebP](jungle-hunt.webp)       | 363 × 500  | 194747 / 236952       |
| Pong (1972 sales flyer)  | [Source](https://commons.wikimedia.org/wiki/File:Pong_Flyer.jpg)     | [Original](originals/pong.jpg)              | [WebP](pong.webp)              | 850 × 1099 | 176080 / 676946       |
| Seaquest                 | [Source](https://www.retrogames.cz/games/221/obal_Atari2600.gif)     | [Original](originals/seaquest.gif)          | [WebP](seaquest.webp)          | 120 × 155  | 11389 / 9518          |
| River Raid               | [Source](https://atariage.com/2600/boxes/b_RiverRaid_front.jpg)      | [Original](originals/river-raid.jpg)        | [WebP](river-raid.webp)        | 600 × 836  | 94624 / 506706        |

## SHA-256 integrity

| File                              | SHA-256                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `originals/pitfall.gif`           | `4e0adb84ecfe53797690648b16ac85cad98ecfcada676ca1508e000d22f6eff4` |
| `pitfall.webp`                    | `8e22bd65ceb367b944fdf5c63aa4082ea4bfe2e7d24f03fc13292c498ae7be89` |
| `originals/pitfall-ii.gif`        | `2a4fb55a36ba14194e4deb6afec590e27185a4484c226d182882c78cf434bc27` |
| `pitfall-ii.webp`                 | `3bd6b4e5e07db0c9ff26629cb40912626caf1ddd5615b95cd798156ca2f88e3c` |
| `originals/breakout.gif`          | `a42562049c7580b125ca3a45abb7c8cb90bec891b1977f6ed44c8a2c54a1d3f9` |
| `breakout.webp`                   | `d463c68e8d02f61824c82d2116c4d1ebc1985bae95fa33ba30e16a02a3c532b8` |
| `originals/realsports-boxing.gif` | `9f9bc7870dd90c48b599192c0e116d33723d82f3280834e1dea5ce3b45d3acfa` |
| `realsports-boxing.webp`          | `b4c92e4742d8e35658316271ca312fac4a69ff80f1dbda9880776238c275d0ac` |
| `originals/jungle-hunt.jpg`       | `f6726b8206f93b1c339b03980c17b316c0558efb56fa7e9f2cedea4d5f8881c6` |
| `jungle-hunt.webp`                | `7541a7889b94dc1bbd2d97a40c21fea2b9aa759300d9da4a0cbff345368b689b` |
| `originals/pong.jpg`              | `4305858afc10f76835dd9775a292f4b0a19b883f3cd57c30976c9ca2efbde218` |
| `pong.webp`                       | `58cd16d4f7dbd68d31f401ced288699fed2250becbfb315e3f66bd0196516fe2` |
| `originals/seaquest.gif`          | `41033eb95e4dab85f81c75d86f8e3e451f04a28cc9f91104f363037450b56685` |
| `seaquest.webp`                   | `c9bbe6b540697faa8f2d70326e8627b592ca041c040a4899f1ccfa0af9f25080` |
| `originals/river-raid.jpg`        | `9c3866416e67685e12740d07826ecb55b00e0447cd50bae220bedf4d99cd15dd` |
| `river-raid.webp`                 | `ef49f8f52a42cefe319345013157226077c4b5a26fad2d650b932893c1b1861e` |

## Gallery composition

The Arcade catalog (`Choose a game`) shows one Mosaik Card per game in at most four equal columns, in the order Pong, Breakout, Pitfall!, Pitfall II, River Raid, Seaquest, Jungle Hunt and RealSports Boxing; narrower panes wrap to fewer columns of at least 240px, and a card never exceeds the available width. Each card holds a 16:10 cover well, the game's title, its player count and an outline `Play` button whose accessible name is `Play <full title>`. The public Image fills the well with `contain` fitting, so every complete cover or flyer, including the narrower Jungle Hunt and River Raid boxes, keeps its print proportions on the dark neutral-900 well the Arcade artboard draws (the same token flips to a light well in dark mode). `Leaderboard` sits in the window toolbar and opens the consolidated results dialog. Cover colors remain separate from the Symphony theme colors used for gameplay. The renderer build copies only the root WebP files; downloaded originals and this provenance record remain in the repository.
