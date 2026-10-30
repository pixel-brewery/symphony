# Employee figures

The four original plush characters are copied byte for byte from
[OpenDots `public/dots`](https://github.com/CopilotKit/OpenDots/tree/625452e06cde74cb25b0ce319e2c1be0488f5a5f/public/dots),
revision `625452e06cde74cb25b0ce319e2c1be0488f5a5f`, inspected on 2026-10-09.
Copyright (c) Atai Barkai. The upstream MIT notice is included in [LICENSE](LICENSE)
and packaged with the images on Desktop and Mobile. No OpenDots runtime is imported.

Each PNG has a transparent **512 × 512** canvas and includes its character's original
accessories: blue headphones, mint leaves, an orange pocket and a purple scarf.
Do not overlay the retired flat accessories or recolour the original pixels.

Symphony adds **Spark** (`gold`), a golden workshop spirit with teal plush goggles,
and **Loop** (`rose`), a rose cloud with cream plush antennae. Their original
canonicals were generated with the built-in imagegen tool using the four OpenDots
images as visual-family references. These are new identities. Native generated
sources, exact prompts and deterministic alpha-cleanup/uniform-fit reports remain
in their respective `output/imagegen/employee-<colour>-v2` runs. Their exported
transparent 512 × 512 thumbnails are `gold.png` and `rose.png`.

| File         | SHA-256                                                            |
| ------------ | ------------------------------------------------------------------ |
| `blue.png`   | `bf8ef19c7b7d753c11ba05e411f15a0733bcb810541bc88fb34c38427c6a6040` |
| `mint.png`   | `aebbd4a27e346b7a2f41976bcdae4b144e42219cce77182053cfe4140bb6486f` |
| `orange.png` | `bf9a2f9f6859c2931b9a4062117deb7d06fba77b190b5ad52a90587f368b34a7` |
| `purple.png` | `9fb3e53fc90b4fe881e1c1f8121dd32fbe9882dbc989156c40b0a8fadc348441` |
| `gold.png`   | `d9e003700b2aa54fcc1d89c926271566481ef70dc74fe279d15160b8349b8015` |
| `rose.png`   | `d6390a0a103ea7613b6180f4dc86714d300268129dccf25619edfabb2ec829f1` |

The six `*-48.png` assets are transparent **48 × 48 RGBA** exports of these exact
canonicals for compact Mosaik Avatars: `blue-48.png`, `mint-48.png`,
`orange-48.png`, `purple-48.png`, `gold-48.png` and `rose-48.png`. They preserve the
complete canvas, proportions and accessories, with no new artwork or recolouring.
The AI team list resolves them through the shared figure identity mapping and
uses the existing ID default for profiles without a saved appearance. The normal
full-size figure and animation assets remain unchanged. Desktop and Mobile bundle
all six exports; the package smoke check verifies their exact bytes, dimensions
and RGBA format on both surfaces.

To repeat the static export on macOS from the repository root:

```sh
for identity in blue mint orange purple gold rose; do
  sips --resampleHeightWidth 48 48 "resources/figures/$identity.png" \
    --out "resources/figures/$identity-48.png"
done
```

Agent profiles persist appearance independently of the CLI account. Existing colour
IDs remain compatible: `coral` selects orange and `violet` selects purple; blue and
mint retain their names. Legacy figure and accessory fields remain readable, but the
renderer displays the corresponding original character without old overlay art.
Choosing a character saves `figure: dot` with no overlay accessories. A bounded
custom PNG still replaces the catalogue figure. Existing ID hashes retain their
colour choice across restarts and CLI changes.

The catalogue offers six explicit saved choices. Its default ID-hash palette stays
at the original four colours, so expanding the catalogue cannot change an existing
employee's identity. Both appearance schemas and the Mobile contract accept the
new `gold` and `rose` IDs.

Activity still comes from execution snapshots, queues and decisions. The shared
Symphony renderer uses FLAMOX-compatible v2 atlases beside these originals:
`blue-v2.png`, `mint-v2.png`, `orange-v2.png`, `purple-v2.png`, `gold-v2.png` and
`rose-v2.png`. Each contains nine
animation states and sixteen clockwise looks in a transparent 1536 × 2288 PNG.
The original 512 × 512 PNGs remain unchanged as identity references, thumbnails
and loading/error fallbacks. Custom single PNGs remain supported.

Actual analysis/review work uses inspection poses, implementation uses active-work
poses, and input requests/queues use waiting poses. Completed work and greetings
have finite motion. Paused, blocked, failed and stale employees freeze; offscreen
and hidden-document playback stops, and reduced motion disables playback/gaze.
Pointer gestures never change work status or the executing CLI.
Custom single PNGs use the existing simple CSS state treatment and a finite
greeting tilt, without generated pose frames or directional gaze.

The upstream repository and file history contain no published generation prompts
or artwork generator, and the PNGs contain no text/EXIF provenance. AI authorship is
unconfirmed. New or revised artwork uses Symphony's
[`create-employee-figure`](../../.agents/skills/create-employee-figure/SKILL.md)
skill. It adapts the installed Codex `create-pet` toolkit to Symphony: original
approved identity, grounded imagegen state strips, connected-component extraction,
shared row scale/baseline, v2 assembly, one chroma cleanup and the actual atlas,
direction and quality gates. Exact source prompts and QA evidence remain under
`output/imagegen/employee-<character>-v2`. The generated animation artwork is a
Symphony-authored derivative; it is not a recovered upstream generator. The
installed proprietary toolkit is invoked locally rather than vendored. No
ChatGPT Pet is uploaded or activated.

The accepted animation catalogue was produced with the installed
`work-pets/0.1.6` toolkit and FLAMOX reference revision
`2fc29a56e37449b4fbbfb1d7027249af652eb28f`. Every final encoded atlas passed
the bundled alpha/geometry, frame, chroma, direction, continuity and quality
gates. Three independent blind reviewers checked each figure's look directions;
all cardinal checks passed. Approximate intermediate angles and measured
continuity outliers remain recorded as reviewed warnings in
[animation-catalog.json](animation-catalog.json), together with source/prompt
hashes and explicit deterministic derivations.

| Animated asset  | SHA-256                                                            |
| --------------- | ------------------------------------------------------------------ |
| `blue-v2.png`   | `c643b28cbc43692e4c88f8171fea0d284d79de7b2fb795788d64c7b7778ca820` |
| `mint-v2.png`   | `3bf34c7465fe08273a3587a25150e5ea00d65efa351965fb17491135068c2cf3` |
| `orange-v2.png` | `bebf976293b4f230999edf78b3a44889b0c2f6709eb754669df23a3f241989bc` |
| `purple-v2.png` | `00a4007b9531605add1effbdb419a46c6c51f371ec2ef292edeb22d34da88e32` |
| `gold-v2.png`   | `080acedc99bd928e93816e13523fd90a2bf1fc2db531007d5d4ee93ec4d7c27a` |
| `rose-v2.png`   | `105c3df43ce2ed3153ae97e79fef39d4b2a55d02d965875a1954a9a6393500ca` |

Each run retains the nine state GIFs, combined GIF/MP4, idle→jump→idle loop,
ordered look loop, timestamped motion stills, final contact/direction sheets,
actual source prompts, immutable generated references and hash-bound QA reports.
All six canonical PNGs remain catalogue thumbnails and fallbacks; the four upstream
originals remain byte-identical. Spark and Loop retain their generated canonical
source hashes and normalization evidence separately from the exported thumbnails.
