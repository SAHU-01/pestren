# /faces/ — expression assets for the Step 3 radial picker

Drop **8 PNG files** here, one per mood. Until they exist, the form shows an
emoji fallback automatically (no errors), so you can ship first and add art later.

## Slots — exact filenames (all lowercase, `.png`)

| # | filename        | mood      | emoji fallback |
|---|-----------------|-----------|----------------|
| 1 | `happy.png`     | happy     | 😄 |
| 2 | `excited.png`   | excited   | 🤩 |
| 3 | `curious.png`   | curious   | 🤔 |
| 4 | `contented.png` | contented | 🙂 |
| 5 | `meh.png`       | meh       | 😐 |
| 6 | `annoyed.png`   | annoyed   | 😒 |
| 7 | `furious.png`   | furious   | 😠 |
| 8 | `sad.png`       | sad       | 😞 |

**Specs:** square, ~256×256 px (up to 512 is fine), **transparent background**,
same character across all 8 — vary only the expression.

## Generation prompt (keep the base identical across all 8)

> friendly stylized 3D character head, soft clay / Pixar-adjacent look,
> gender-ambiguous, warm studio lighting with subtle rim light, centered
> head-and-shoulders, plain transparent background, cohesive character set,
> clean, high detail, 1:1 square.

Vary only the expression line:
- **happy** — beaming genuine smile, bright eyes
- **excited** — wide grin, raised brows, sparkling eyes, slight lean-in
- **curious** — one brow raised, slight head tilt, intrigued half-smile
- **contented** — calm soft smile, relaxed, eyes gently closed-ish
- **meh** — flat neutral mouth, unimpressed, half-lidded eyes
- **annoyed** — slight frown, side-eye, one brow down
- **furious** — furrowed brows, gritted teeth, tense, faint red-tinged cheeks
- **sad** — downturned mouth, droopy disappointed eyes, slight slump

**Negative prompt:** text, watermark, logo, multiple heads, extra limbs,
deformed, blurry, harsh shadows, background clutter, realistic photo of a real person.

**ComfyUI tip (RTX 5090):** lock identity — fix the seed + reuse the exact base
description, or generate one neutral head then use IPAdapter / reference +
ControlNet (expression) in img2img so only the expression changes. Export each
as a transparent PNG named `happy.png … sad.png` into this folder.
