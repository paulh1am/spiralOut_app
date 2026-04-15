/**
 * Marching squares contour extraction from alpha channel.
 * Returns an array of contour paths (each an array of [x, y] points).
 */

export type Point = [number, number];
export type Contour = Point[];

export function extractContours(
  imageData: ImageData,
  alphaThreshold = 128
): Contour[] {
  const { width, height, data } = imageData;

  // Build binary grid (1 = opaque, 0 = transparent)
  const grid = new Uint8Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      grid[y * (width + 1) + x] = alpha >= alphaThreshold ? 1 : 0;
    }
  }

  const visited = new Set<string>();
  const contours: Contour[] = [];

  // Find contour edges using marching squares
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * (width + 1) + x;
      // Look for boundary: opaque pixel next to transparent
      if (grid[idx] === 1) {
        // Check if it's a border pixel
        const isBorder =
          x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
          grid[idx - 1] === 0 ||
          grid[idx + 1] === 0 ||
          grid[idx - (width + 1)] === 0 ||
          grid[idx + (width + 1)] === 0;

        if (isBorder && !visited.has(`${x},${y}`)) {
          const contour = traceContour(grid, width, height, x, y, visited);
          if (contour.length > 10) {
            contours.push(contour);
          }
        }
      }
    }
  }

  return contours;
}

function traceContour(
  grid: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Set<string>
): Contour {
  const contour: Contour = [];
  const w = width + 1;

  // Simple boundary following (Moore neighborhood tracing)
  const dirs: Point[] = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];

  let cx = startX;
  let cy = startY;
  let dir = 0;
  const maxSteps = width * height * 2;
  let steps = 0;

  do {
    const key = `${cx},${cy}`;
    if (!visited.has(key)) {
      contour.push([cx, cy]);
      visited.add(key);
    }

    // Find next boundary pixel
    let found = false;
    const startDir = (dir + 5) % 8; // backtrack direction
    for (let i = 0; i < 8; i++) {
      const d = (startDir + i) % 8;
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * w + nx;
        if (grid[idx] === 1) {
          // Check if still a border pixel
          const isBorder =
            nx === 0 || ny === 0 || nx === width - 1 || ny === height - 1 ||
            grid[idx - 1] === 0 ||
            grid[idx + 1] === 0 ||
            grid[idx - w] === 0 ||
            grid[idx + w] === 0;
          if (isBorder) {
            cx = nx;
            cy = ny;
            dir = d;
            found = true;
            break;
          }
        }
      }
    }

    if (!found) break;
    steps++;
  } while ((cx !== startX || cy !== startY) && steps < maxSteps);

  return contour;
}

/**
 * Simplify contour by sampling every nth point and smoothing.
 */
export function simplifyContour(contour: Contour, step = 3): Contour {
  const sampled: Contour = [];
  for (let i = 0; i < contour.length; i += step) {
    sampled.push(contour[i]);
  }
  if (sampled.length < 4) return sampled;

  // Simple moving average smooth
  const smoothed: Contour = [];
  const n = sampled.length;
  for (let i = 0; i < n; i++) {
    const prev = sampled[(i - 1 + n) % n];
    const curr = sampled[i];
    const next = sampled[(i + 1) % n];
    smoothed.push([
      (prev[0] + curr[0] + next[0]) / 3,
      (prev[1] + curr[1] + next[1]) / 3,
    ]);
  }
  return smoothed;
}
