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
 * Compute a distance transform from edge pixels.
 * For every transparent pixel, stores the distance to the nearest opaque pixel.
 * Uses a two-pass (row then column) squared-distance transform for efficiency.
 */
function computeDistanceField(
  alpha: Uint8Array,
  w: number,
  h: number,
  threshold: number
): Float32Array {
  const INF = 1e10;
  const dist = new Float32Array(w * h);

  // Initialize: 0 for opaque edge pixels, INF for everything else
  // An "edge" pixel is opaque with at least one transparent 4-neighbor
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (alpha[i] >= threshold) {
        // Check if this opaque pixel borders a transparent one
        const isEdge =
          x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
          alpha[i - 1] < threshold ||
          alpha[i + 1] < threshold ||
          alpha[i - w] < threshold ||
          alpha[i + w] < threshold;
        dist[i] = isEdge ? 0 : -1; // -1 marks interior (inside the shape)
      } else {
        dist[i] = INF;
      }
    }
  }

  // Brute-force is too slow for large images. Use a fast Chamfer-style
  // two-pass approximation (forward + backward) with Euclidean weights.
  // Forward pass (top-left to bottom-right)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (dist[i] === -1) continue; // interior
      if (dist[i] === 0) continue;  // edge seed
      let d = dist[i];
      if (x > 0 && dist[i - 1] >= 0) d = Math.min(d, dist[i - 1] + 1);
      if (y > 0 && dist[i - w] >= 0) d = Math.min(d, dist[i - w] + 1);
      if (x > 0 && y > 0 && dist[i - w - 1] >= 0) d = Math.min(d, dist[i - w - 1] + 1.414);
      if (x < w - 1 && y > 0 && dist[i - w + 1] >= 0) d = Math.min(d, dist[i - w + 1] + 1.414);
      dist[i] = d;
    }
  }

  // Backward pass (bottom-right to top-left)
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (dist[i] === -1) continue;
      if (dist[i] === 0) continue;
      let d = dist[i];
      if (x < w - 1 && dist[i + 1] >= 0) d = Math.min(d, dist[i + 1] + 1);
      if (y < h - 1 && dist[i + w] >= 0) d = Math.min(d, dist[i + w] + 1);
      if (x < w - 1 && y < h - 1 && dist[i + w + 1] >= 0) d = Math.min(d, dist[i + w + 1] + 1.414);
      if (x > 0 && y < h - 1 && dist[i + w - 1] >= 0) d = Math.min(d, dist[i + w - 1] + 1.414);
      dist[i] = d;
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
 * Render stroke around image using alpha-channel dilation (Photoshop-style outside stroke).
 * 
 * 1. Rasterize the image onto the canvas at the target position/scale
 * 2. Read the alpha channel to get the silhouette
 * 3. Compute distance field from silhouette edge outward
 * 4. Paint pixels where 0 < distance <= strokeWidth with the stroke color
 * 5. Draw the original image on top
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

  // Step 1: Draw the image to extract its alpha footprint on the full canvas
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCtx.drawImage(image, imgX, imgY, imgW, imgH);
  const imgData = tempCtx.getImageData(0, 0, size, size);

  // Step 2: Extract alpha into a flat array
  const alpha = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    alpha[i] = imgData.data[i * 4 + 3];
  }

  // Step 3: Compute distance field from edge
  const dist = computeDistanceField(alpha, size, size, 128);

  // Step 4: Paint the stroke ring into the output
  const strokeWidth = settings.baseWidth;
  const color = hexToRgb(settings.colors[0] || "#FF6B9D");
  const outData = ctx.getImageData(0, 0, size, size);
  const pixels = outData.data;

  for (let i = 0; i < size * size; i++) {
    const d = dist[i];
    if (d > 0 && d <= strokeWidth) {
      const pi = i * 4;
      // Smooth anti-aliased edge at the outer boundary
      const edgeAlpha = d > strokeWidth - 1 ? (strokeWidth - d + 1) : 1;
      pixels[pi] = color[0];
      pixels[pi + 1] = color[1];
      pixels[pi + 2] = color[2];
      pixels[pi + 3] = Math.round(edgeAlpha * 255);
    }
  }

  ctx.putImageData(outData, 0, 0);

  // Step 5: Draw original image on top
  ctx.drawImage(image, imgX, imgY, imgW, imgH);
}
