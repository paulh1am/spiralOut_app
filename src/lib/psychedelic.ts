import { noise2D } from "./noise";

export interface EffectSettings {
  strokeCount: number;
  waviness: number;
  baseWidth: number;
  widthVariance: number;
  widening: number;
  spacing: number;
  colors: string[];
  bgColor: string;
  canvasSize: number;
}

/**
 * Exact 2D Euclidean distance transform (Meijster et al. 2000).
 * For every transparent pixel, stores the true Euclidean distance to the
 * nearest opaque edge pixel — producing perfectly smooth, round strokes.
 *
 * Phase 1: row-wise scan → squared horizontal distance to nearest edge seed.
 * Phase 2: column-wise lower parabola envelope → full 2D Euclidean distance.
 */
function computeDistanceField(
  alpha: Uint8Array,
  w: number,
  h: number,
  threshold: number
): Float32Array {
  const INF2 = (w * w + h * h) * 2; // larger than any possible squared distance

  // Mark edge pixels: opaque pixels that border at least one transparent neighbour
  const isEdge = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (alpha[i] >= threshold) {
        const border =
          x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
          alpha[i - 1] < threshold ||
          alpha[i + 1] < threshold ||
          alpha[i - w] < threshold ||
          alpha[i + w] < threshold;
        if (border) isEdge[i] = 1;
      }
    }
  }

  // Phase 1: per-row squared horizontal distance to nearest edge seed
  const g = new Float32Array(w * h).fill(INF2);
  for (let y = 0; y < h; y++) {
    let nearX = -1;
    for (let x = 0; x < w; x++) {
      if (isEdge[y * w + x]) { nearX = x; g[y * w + x] = 0; }
      else if (nearX >= 0) { const d = x - nearX; g[y * w + x] = d * d; }
    }
    nearX = -1;
    for (let x = w - 1; x >= 0; x--) {
      if (isEdge[y * w + x]) nearX = x;
      else if (nearX >= 0) {
        const d2 = (nearX - x) * (nearX - x);
        if (d2 < g[y * w + x]) g[y * w + x] = d2;
      }
    }
  }

  // Phase 2: per-column 2D distance via lower parabola envelope
  const dist = new Float32Array(w * h);
  const stk = new Int32Array(h);    // parabola centres (row indices)
  const cross = new Float32Array(h); // crossover y-values between adjacent parabolas

  for (let x = 0; x < w; x++) {
    // Build lower envelope
    let top = 0;
    stk[0] = 0;
    cross[0] = -Infinity;

    for (let u = 1; u < h; u++) {
      const gu = g[u * w + x];
      // Pop dominated parabolas: if crossover(prev, u) <= crossover(prev, top),
      // the current top is never the minimum and can be discarded.
      while (top > 0) {
        const b = stk[top - 1];
        const gb = g[b * w + x];
        const yc = (gu + u * u - gb - b * b) / (2 * (u - b));
        if (yc <= cross[top]) { top--; } else { break; }
      }
      top++;
      stk[top] = u;
      const prev = stk[top - 1];
      const gprev = g[prev * w + x];
      cross[top] = (gu + u * u - gprev - prev * prev) / (2 * (u - prev));
    }

    // Assign Euclidean distances column by column
    let j = 0;
    for (let u = 0; u < h; u++) {
      while (j < top && cross[j + 1] <= u) j++;
      const a = stk[j];
      const dy = u - a;
      const i = u * w + x;

      if (alpha[i] >= threshold && !isEdge[i]) {
        dist[i] = -1; // interior opaque pixel — not painted
      } else if (isEdge[i]) {
        dist[i] = 0;
      } else {
        dist[i] = Math.sqrt(dy * dy + g[a * w + x]);
      }
    }
  }

  return dist;
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
 * Render expanding psychedelic strokes outward from the image silhouette.
 *
 * Band positions are precomputed with progressive widening and variable spacing.
 * Band boundaries are displaced per-pixel by Perlin noise (waviness).
 * The canvas background and silhouette interior are filled with user-chosen colors.
 * Colors cycle through the palette across bands.
 */
export function renderOutsideStroke(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  settings: EffectSettings,
  imgX: number,
  imgY: number,
  imgW: number,
  imgH: number
) {
  const size = settings.canvasSize;

  // Extract alpha silhouette
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCtx.drawImage(image, imgX, imgY, imgW, imgH);
  const imgData = tempCtx.getImageData(0, 0, size, size);

  const alpha = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    alpha[i] = imgData.data[i * 4 + 3];
  }

  const dist = computeDistanceField(alpha, size, size, 128);

  // Precompute band start/end positions.
  // Each band k has width = (baseWidth + k*widening) * widthVarianceMult.
  // Spacing can be negative to create overlapping strokes.
  const bandStarts = new Float32Array(settings.strokeCount);
  const bandEnds   = new Float32Array(settings.strokeCount);
  let cursor = 0;
  for (let k = 0; k < settings.strokeCount; k++) {
    const baseW = settings.baseWidth + k * settings.widening;
    const widthMult = 1 + settings.widthVariance * Math.sin(k * 1.618 + 0.5);
    const bw = Math.max(1, baseW * widthMult);
    bandStarts[k] = cursor;
    bandEnds[k]   = cursor + bw;
    // Advance cursor; clamp to always move forward by at least 1px
    cursor += Math.max(1, bw + settings.spacing);
  }

  const noiseFreq = 25 / size;
  const waveAmp   = (settings.waviness / 100) * settings.baseWidth * 0.8;
  const maxDist   = bandEnds[settings.strokeCount - 1] + waveAmp + 2;

  const bgRgb   = hexToRgb(settings.bgColor || "#000000");
  const colorCount = settings.colors.length || 1;

  const outData = ctx.getImageData(0, 0, size, size);
  const pixels  = outData.data;

  // Fill entire canvas with background color
  for (let i = 0; i < size * size; i++) {
    const pi = i * 4;
    pixels[pi]     = bgRgb[0];
    pixels[pi + 1] = bgRgb[1];
    pixels[pi + 2] = bgRgb[2];
    pixels[pi + 3] = 255;
  }

  // Paint expanding stroke bands (exterior pixels only)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const d = dist[idx];
      if (d <= 0 || d > maxDist) continue;

      const n = noise2D(x * noiseFreq, y * noiseFreq);
      const ed = d + n * waveAmp; // noise-displaced effective distance
      if (ed <= 0) continue;

      // Find the innermost band containing ed (linear scan; strokeCount ≤ 30)
      let k = -1;
      for (let b = 0; b < settings.strokeCount; b++) {
        if (ed > bandEnds[b]) continue;
        if (ed < bandStarts[b]) break; // bands are ordered; no further match
        k = b;
        break;
      }
      if (k === -1) continue;

      const bStart = bandStarts[k];
      const bEnd   = bandEnds[k];
      const pos    = ed - bStart;
      const bw     = bEnd - bStart;

      // Soft anti-alias on both edges of the band
      let alpha255: number;
      if (pos < 1)        { alpha255 = Math.round(pos * 255); }
      else if (pos > bw - 1) { alpha255 = Math.round((bw - pos) * 255); }
      else                { alpha255 = 255; }
      if (alpha255 <= 0) continue;

      // Blend stroke color over background inline (output is always opaque)
      const c  = hexToRgb(settings.colors[k % colorCount]);
      const t  = alpha255 / 255;
      const pi = idx * 4;
      pixels[pi]     = Math.round(c[0] * t + bgRgb[0] * (1 - t));
      pixels[pi + 1] = Math.round(c[1] * t + bgRgb[1] * (1 - t));
      pixels[pi + 2] = Math.round(c[2] * t + bgRgb[2] * (1 - t));
      pixels[pi + 3] = 255;
    }
  }

  ctx.putImageData(outData, 0, 0);

  // Draw the original image on top so it's always visible
  ctx.drawImage(image, imgX, imgY, imgW, imgH);
}
