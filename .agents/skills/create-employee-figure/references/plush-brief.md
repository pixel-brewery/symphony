# OpenDots research and reusable production brief

Inspected on 2026-10-09 at upstream revision
`625452e06cde74cb25b0ce319e2c1be0488f5a5f`:

- [Original PNG catalogue](https://github.com/CopilotKit/OpenDots/tree/625452e06cde74cb25b0ce319e2c1be0488f5a5f/public/dots).
- [Identity and PNG renderer](https://github.com/CopilotKit/OpenDots/blob/625452e06cde74cb25b0ce319e2c1be0488f5a5f/src/client/Mascot.tsx).
- [CSS state handling](https://github.com/CopilotKit/OpenDots/blob/625452e06cde74cb25b0ce319e2c1be0488f5a5f/src/client/style.css).
- [MIT notice](https://github.com/CopilotKit/OpenDots/blob/625452e06cde74cb25b0ce319e2c1be0488f5a5f/LICENSE).

The repository tree, package scripts, text sources and reachable file history were
searched for image generators, prompts, sprites, plush characters and mascots. The
four PNGs and Mascot entered with `a4374d7` (the initial workspace-template commit).
No image-generation workflow or prompts were published. The PNGs contain no text or
EXIF provenance. The renderer's stable ID hash chooses one of four images; working
uses a short CSS bob and needs-input uses a tilt. These assets and rendering choices
can be reused under the supplied MIT notice. The artwork's creation method is unknown.

Inspect these FLAMOX365 owners when changing the renderer or interactions:

- `libs/frontend/pet/src/lib/pet/PetComponent.ts`, `.html`, `.scss`: low-level
  renderer, actual state input, accessibility preference and lifecycle cleanup.
- `libs/frontend/ui/src/lib/components/pet/PetComponent.ts`, `.html`, `.scss`:
  separate feature controls and locally owned interaction composition.

Symphony ports frame registration, animation timing, look-direction selection and
gesture lifecycle into its existing employee component. Original PNGs remain the
identity reference and fallback. Generated v2 atlases add nine states and sixteen
looks. There is no runtime import from FLAMOX365 or change to Mosaik. The installed
Codex create-pet toolkit supplies the actual deterministic generation/QA pipeline
through `scripts/codex_sprite_tool.py`.

Symphony extends the four originals with two original identities: **Spark**
(`gold`), a golden fuzzy workshop spirit with a soft nut-like body and symmetrical
teal plush goggles resting above its exposed eyes; and **Loop** (`rose`), a rose
cloud with three rounded lobes and two symmetrical cream plush antennae. Both
have whole glossy dark eyes, attached tiny limbs and diffuse frontal lighting.
Their generated canonicals define their identity; the original four supplied
style references only. Keep their native sources, actual prompts and documented
export transforms. The catalogue has six choices; the existing default-ID hash
continues to choose from its original four colours to preserve saved identities.

## Canonical character prompt

This is a Symphony-authored prompt, not a recovered upstream prompt. Replace the
subject and requested accessories with the user's actual character brief.

```text
Use case: stylized-concept
Asset type: transparent PNG employee character for Symphony, shown at 48–160 px
Primary request: one complete [requested character], in the same visual family as
the attached OpenDots plush characters; preserve the requested identity and accessories
Style/medium: polished 3D plush toy, soft rounded body, fine visible fuzzy fibres,
large glossy dark eyes with small studio highlights, tiny limbs, friendly expression
Composition/framing: full body, frontal camera at eye level, centred square canvas,
clear silhouette, complete ears, hands and feet, modest transparent padding
Lighting/mood: soft studio illumination, gentle material shading, approachable
Scene/backdrop: genuinely transparent background, no floor or environment
Constraints: one character only; no text, logos, watermark, grid or surrounding UI;
no flat geometric Memphis outlines; accessories must match the plush material and scale
```

## Identity-preserving variation prompt

```text
Use case: identity-preserve
Asset type: transparent PNG variation of the attached approved Symphony employee
Primary request: change only [the requested accessory, pose or colour detail]
Constraints: preserve the face, silhouette, limb proportions, fuzzy material,
camera, lighting, canvas registration and transparent background of the canonical
character; one complete character, no text or labels
```

For animation, follow the Codex v2 contract and employee state mapping. Generate
coherent strips from the approved identity; never duplicate a still image and
claim it contains animation. Keep the static PNG validator for static requests.
