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
 * Each stroke band occupies a ring at distance [k*period, k*period + bandWidth]
 * from the edge, where bandWidth varies per-band (widthVariance) and the
 * band boundaries are displaced per-pixel by Perlin noise (waviness).
 * Colors cycle through the palette.
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

  // Fixed period: baseWidth + spacing. Within each period, the visible stroke
  // width varies per band (widthVariance) giving organic thickness changes.
  const period = settings.baseWidth + settings.spacing;

  // Noise: ~25 wave cycles across the canvas at any resolution
  const noiseFreq = 25 / size;
  // Wave displacement amplitude: scales with baseWidth so it looks proportional
  const waveAmp = (settings.waviness / 100) * settings.baseWidth * 0.8;

  const maxDist = settings.strokeCount * period + waveAmp + 2;

  const outData = ctx.getImageData(0, 0, size, size);
  const pixels = outData.data;
  const colorCount = settings.colors.length || 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const d = dist[idx];
      if (d <= 0 || d > maxDist) continue;

      // Displace the effective distance with smooth noise → wavy band edges
      const n = noise2D(x * noiseFreq, y * noiseFreq); // -1..1
      const effectiveDist = d + n * waveAmp;
      if (effectiveDist <= 0) continue;

      const bandIndex = Math.floor(effectiveDist / period);
      if (bandIndex < 0 || bandIndex >= settings.strokeCount) continue;

      const posInBand = effectiveDist - bandIndex * period;

      // Per-band width variation using a deterministic offset per band
      const widthMult = 1 + settings.widthVariance * Math.sin(bandIndex * 1.618 + 0.5);
      const bandWidth = Math.max(1, settings.baseWidth * widthMult);

      if (posInBand > bandWidth) continue;

      const color = hexToRgb(settings.colors[bandIndex % colorCount]);
      const pi = idx * 4;

      // Soft anti-alias on both inner and outer edges of each band
      let a255: number;
      if (posInBand < 1) {
        a255 = Math.round(posInBand * 255);
      } else if (posInBand > bandWidth - 1) {
        a255 = Math.round((bandWidth - posInBand) * 255);
      } else {
        a255 = 255;
      }

      pixels[pi]     = color[0];
      pixels[pi + 1] = color[1];
      pixels[pi + 2] = color[2];
      pixels[pi + 3] = Math.max(0, a255);
    }
  }

  ctx.putImageData(outData, 0, 0);
  ctx.drawImage(image, imgX, imgY, imgW, imgH);
}
