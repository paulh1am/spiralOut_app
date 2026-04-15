import { type Contour, type Point } from "./contour";
import { noise2D } from "./noise";

export interface EffectSettings {
  strokeCount: number;
  waviness: number;
  baseWidth: number;
  widthVariance: number;
  spacing: number;
  colors: string[];
  canvasSize: number;
}

/**
 * Compute normals for each point on a closed contour.
 */
function computeNormals(contour: Contour): Point[] {
  const n = contour.length;
  const normals: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = contour[(i - 1 + n) % n];
    const next = contour[(i + 1) % n];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Outward normal (perpendicular, pointing outward)
    normals.push([-dy / len, dx / len]);
  }
  return normals;
}

/**
 * Interpolate between colors in the palette.
 */
function lerpColor(colors: string[], t: number): string {
  if (colors.length === 0) return "#ff00ff";
  if (colors.length === 1) return colors[0];
  const scaled = t * (colors.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const c1 = hexToRgb(colors[Math.min(i, colors.length - 1)]);
  const c2 = hexToRgb(colors[Math.min(i + 1, colors.length - 1)]);
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * f);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * f);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * f);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Render psychedelic strokes around a contour onto a canvas context.
 */
export function renderPsychedelicStrokes(
  ctx: CanvasRenderingContext2D,
  contour: Contour,
  settings: EffectSettings,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const normals = computeNormals(contour);
  const n = contour.length;

  for (let s = 0; s < settings.strokeCount; s++) {
    const t = s / Math.max(settings.strokeCount - 1, 1);
    const offset = (s + 1) * settings.spacing;
    const color = lerpColor(settings.colors, t % 1);
    const waveAmp = settings.waviness * (1 + s * 0.3);

    // Build offset path with wave modulation
    const path: Point[] = [];
    for (let i = 0; i < n; i++) {
      const pt = contour[i];
      const nm = normals[i];
      const arcPos = i / n;

      // Sinusoidal wave modulation
      const wave = Math.sin(arcPos * Math.PI * 2 * (3 + s * 0.5)) * waveAmp;

      const totalOffset = offset + wave;
      path.push([
        (pt[0] + nm[0] * totalOffset) * scale + offsetX,
        (pt[1] + nm[1] * totalOffset) * scale + offsetY,
      ]);
    }

    // Draw stroke with varying width using short segments
    for (let i = 0; i < path.length; i++) {
      const curr = path[i];
      const next = path[(i + 1) % path.length];

      // Noise-based width variation
      const noiseVal = noise2D(i * 0.05, s * 1.7);
      const widthMod = 1 + noiseVal * settings.widthVariance;
      const strokeWidth = Math.max(0.5, settings.baseWidth * widthMod);

      ctx.beginPath();
      ctx.moveTo(curr[0], curr[1]);
      ctx.lineTo(next[0], next[1]);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * scale;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }
}
