# GestureLab v2

Complete rebuild — 8 gesture modes, 6 backgrounds, live skeleton in X-Ray, editable particle text.

## What's new vs v1

### Performance
- MediaPipe model complexity: **0 (Lite)** instead of 1 → ~2× FPS improvement
- Camera resolution lowered to 640×480 (was 1280×720) — still looks great, half the processing
- X-Ray segmentation runs every 8 frames (not every frame)
- Particle text cached bounds — no more O(n) spread on every draw call
- `hexToRgba` deduplicated into Utils (was copy-pasted in every mode)

### New Modes
- **Neon Ripple** 🌊 — fingertip velocity triggers expanding neon rings. Fast = big, slow = gentle pulses.
- **Mirror Symmetry** 🔮 — 2/4/6/8-way kaleidoscope. Clear cycles symmetry count.
- **Gravity Sandbox** 🌌 — 300 physics particles fall with gravity. Hands repel/attract/vortex them. Clear cycles modes.

### Fixed Modes
- **X-Ray Vision** — now draws the actual pose SKELETON with bones + joints inside the portal, plus segmentation dot cloud. Was just showing an empty grid before.
- **Particle Text** — editable word (type in panel → Set), 8 preset words, 4 color modes (Accent/Rainbow/Fire/Ice), faster physics (spring 0.014, damping 0.90).
- **Air Draw** — persistent canvas (no trail fade decay), eraser gesture (index+middle pinch), color auto-cycles per stroke.

### New Features
- **6 backgrounds**: Camera Feed, Deep Dark, Deep Space, Forest Night, Neon City, Sunset Dark
- **Particle word input**: Type any word up to 12 chars in the left panel
- **Color mode cycling**: Accent / Rainbow / Fire / Ice for particle text
- **New layout**: Side-by-side sidebar grid instead of stacked overlapping panels
- **7 accent swatches** instead of 5

## How to use
1. Open `index.html` in Chrome
2. Click **Start Camera**
3. Pick a mode from left sidebar
4. Change background from right sidebar
5. Adjust accent colour with swatches or colour picker

## Deployment
Static files — works on GitHub Pages, Netlify, Vercel with no build step.
