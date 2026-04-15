// Simple 2D Perlin noise - no dependencies
const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function seed(s: number) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
seed(42);

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function dot(g: number[], x: number, y: number) {
  return g[0] * x + g[1] * y;
}

export function noise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[X] + Y] % 8;
  const ab = PERM[PERM[X] + Y + 1] % 8;
  const ba = PERM[PERM[X + 1] + Y] % 8;
  const bb = PERM[PERM[X + 1] + Y + 1] % 8;

  const x1 = dot(GRAD[aa], xf, yf) * (1 - u) + dot(GRAD[ba], xf - 1, yf) * u;
  const x2 = dot(GRAD[ab], xf, yf - 1) * (1 - u) + dot(GRAD[bb], xf - 1, yf - 1) * u;

  return x1 * (1 - v) + x2 * v; // returns roughly -1..1
}

export function reseed(s: number) {
  seed(s);
}
