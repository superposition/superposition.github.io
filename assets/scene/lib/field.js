/* The sky: three seeded shells of points, and the haze behind them.

   Both are generated from the seed on every run rather than stored, so the sky
   costs three integers in the page and nothing in the repository. The SVG
   fallback calls these same two functions, which is why the still and the
   animated frame have the same stars in the same places instead of merely
   looking alike.

   The stars are placed inside the composed camera's frustum, at three
   distances, so they fill the frame at any window shape and still parallax
   against each other when the camera dollies. The haze is placed in the world,
   so it stays put while the camera moves: eleven overlapping additive discs,
   none above 3% alpha, which is what makes it felt at a second look and not
   seen at the first. */

import { rng } from './seeded.js';
import { state, view, scales } from './camera.js';

export const BANDS = [
  { n: 90, near: 9.2, far: 14, size: 2, alpha: 0.86, tint: 'star' },
  { n: 150, near: 16, far: 24, size: 1.4, alpha: 0.6, tint: 'cream' },
  { n: 220, near: 28, far: 44, size: 1, alpha: 0.4, tint: 'dust' },
];

export function stars(seed, cam, aspect) {
  const v = view(state(cam, { dolly: 1 }));
  const sc = scales(v, aspect);
  const next = rng(seed ^ 0x5eed);
  const out = [];
  for (const band of BANDS) {
    for (let i = 0; i < band.n; i++) {
      const d = band.near + next() * (band.far - band.near);
      const x = (next() * 2 - 1) * d * sc.tanX * 1.45;
      const y = (next() * 2 - 1) * d * sc.tanY * 1.45;
      out.push({
        p: [v.eye[0] + v.x[0] * x + v.y[0] * y - v.z[0] * d,
            v.eye[1] + v.x[1] * x + v.y[1] * y - v.z[1] * d,
            v.eye[2] + v.x[2] * x + v.y[2] * y - v.z[2] * d],
        size: band.size * (0.82 + next() * 0.42),
        alpha: band.alpha * (0.55 + next() * 0.45),
        tint: band.tint,
      });
    }
  }
  return out;
}

/* The haze. Fixed in the world, behind the map: a wide one low and left, a
   tighter one high and right, and nine more between them at a third of the
   alpha, so the composite has a shape rather than a wash. */
const HAZE = [
  [-9.5, -2.6, -26, 15, 'dust', 0.030],
  [10.5, 4.2, -30, 13, 'amber', 0.022],
  [-2.5, 5.5, -22, 9, 'dust', 0.018],
  [16, -6, -34, 17, 'dust', 0.016],
  [-16, 3, -38, 19, 'cyan', 0.010],
  [2.5, -4.5, -18, 6.5, 'amber', 0.014],
  [-6.5, 7.5, -31, 8, 'cream', 0.010],
  [7, -1, -20, 5.2, 'dust', 0.012],
  [13, 8.5, -36, 11, 'dust', 0.012],
  [-13, -7.5, -29, 10, 'dust', 0.013],
  [-0.5, 1.5, -40, 22, 'dust', 0.009],
];

export const blobs = () =>
  HAZE.map(([x, y, z, r, tint, alpha]) => ({ p: [x, y, z], r, tint, alpha }));

/* The falloff the shader and the SVG both draw: full at the centre, nothing at
   the rim, squared so the core is soft and the edge is never a circle. */
export const falloff = (d) => Math.max(0, 1 - d * d) ** 2;
