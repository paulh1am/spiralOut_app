

## Psychedelic Outline Generator

### Overview
Single-page app: upload a PNG, generate expanding psychedelic wavy strokes from its alpha silhouette, customize via controls, download result.

### Effect Engine (Canvas API)
- Extract alpha channel → marching squares contour tracing → outline path
- Generate concentric offset paths with sinusoidal wave modulation (increasing amplitude outward)
- **Stroke width variation**: Each stroke's width modulated by Perlin/simplex noise along its length, creating organic thick-thin variation
- Color interpolation across user's palette

### Controls Panel
| Control | Range | Purpose |
|---------|-------|---------|
| Canvas size | 512–4096 px (square) | Output dimensions |
| Number of strokes | 5–30 | Concentric ring count |
| Waviness / amplitude | 0–100 | How much strokes wobble |
| Base stroke width | 1–20 px | Baseline thickness |
| Width variance | 0–100% | How much noise modulates width (0 = uniform) |
| Stroke spacing | 2–30 px | Gap between rings |
| Color pickers ×4 | — | Palette for gradient cycle |

### File Structure
- `src/pages/Index.tsx` — Main layout: upload area, canvas preview, controls sidebar
- `src/components/UploadZone.tsx` — Drag-and-drop PNG upload
- `src/components/EffectCanvas.tsx` — Canvas rendering + effect engine
- `src/components/ControlsPanel.tsx` — All sliders and color pickers
- `src/lib/contour.ts` — Marching squares contour extraction
- `src/lib/psychedelic.ts` — Offset path generation, noise-based width modulation, wave math
- `src/lib/noise.ts` — Simple 2D Perlin noise implementation (no external dep)

### UI Layout
- Dark minimal background
- Desktop: canvas centered, controls in right sidebar
- Mobile: canvas on top, controls below in scrollable area
- Download button prominent at bottom of controls

### Technical Notes
- Width variance uses Perlin noise sampled along each stroke's arc length, multiplied by the variance slider, added to base width
- Canvas element sized to user's chosen square dimension; CSS-scaled for preview
- Download renders at full resolution to an offscreen canvas

