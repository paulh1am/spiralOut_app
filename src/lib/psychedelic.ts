import { type Contour, type Point } from "./contour";

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
 * Compute outward normals for each point on a closed contour.
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
    normals.push([-dy / len, dx / len]);
  }
  return normals;
}

/**
 * Render a single outline stroke around the contour, expanding outward.
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

  // Offset the contour outward by half the stroke width so the stroke
  // sits entirely outside the original path
  const halfWidth = (settings.baseWidth * scale) / 2;

  const path: Point[] = [];
  for (let i = 0; i < n; i++) {
    const pt = contour[i];
    const nm = normals[i];
    path.push([
      pt[0] * scale + offsetX + nm[0] * halfWidth,
      pt[1] * scale + offsetY + nm[1] * halfWidth,
    ]);
  }

  // Draw as a single closed path
  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i][0], path[i][1]);
  }
  ctx.closePath();

  ctx.strokeStyle = settings.colors[0] || "#FF6B9D";
  ctx.lineWidth = settings.baseWidth * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}
