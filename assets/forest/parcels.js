/* The parcels: one wrapped box per repository, standing in the undergrowth at
   the foot of its own fir, and the thing each box is holding.

   One parcel is five meshes and eighty-seven triangles:

     part      tris  what it is
     paper       12  the box, three values by its own faces
     lid         12  a shallower box hinged on its back edge
     ribbon      40  two bands round the parcel, two loops and a knot
     tag          2  one card on a pivot, hanging on the path side
     plant       21  a stem, two leaves, a bloom, a heart and two spore tips

   The plant is the repository, and it is inside the box: scaled to nothing
   until the parcel opens, so a closed parcel costs a draw call and nothing
   else, and the reader who never opens one never sees where the colour went.

   Colour follows the same rule as the rest of the scene. One light, three
   values a face, every colour a token, no gradient: `paint` in mesh.js puts
   each face in one of three bands by the world lamp's angle in the parcel's
   own frame, so the shadow side of a parcel is the shadow side of a tree.
   The lamp's direction is written here and in scene.js because a box turned
   to face the path has different faces to the light than one turned away —
   one vector, two readers, and the same vector. */

import { BoxGeometry, Color, Group, Mesh } from 'three';

import { merge, oval, paint, quad, shade, shape } from './mesh.js';
import { LID, PAPER } from './gifts.js';

const OPEN_MS = 640;

/* The key light of the scene, as a unit vector pointing at the source. */
const LIGHT = (() => {
  const v = [2.6, 7.4, -5.4];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
})();

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* A damped spring from 0 to 1: it passes its stop by about a tenth and comes
   back, which is what makes a lid a lid and not a hinge on a servo. */
const spring = (t) => 1 - Math.exp(-5.5 * t) * Math.cos(9 * t);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* One box, three tones, painted in the parcel's own frame so the light lands
   on the same faces whatever the seed turned the parcel to. */
function box(w, h, d, colour, at, axis, edges = [0.3, -0.34]) {
  const geometry = new BoxGeometry(w, h, d).toNonIndexed();
  geometry.translate(at[0], at[1], at[2]);
  return paint(geometry, [shade(colour, 1), shade(colour, 0.6), shade(colour, 0.32)], {
    axis, edges,
  });
}

export function createParcel(palette, place, material) {
  const root = new Group();
  root.position.set(place.x, place.y, place.z);
  root.rotation.y = place.yaw;
  root.scale.setScalar(place.scale);

  const cos = Math.cos(-place.yaw);
  const sin = Math.sin(-place.yaw);
  const axis = [
    cos * LIGHT[0] + sin * LIGHT[2],
    LIGHT[1],
    -sin * LIGHT[0] + cos * LIGHT[2],
  ];

  const paper = new Color(palette.paper);
  const ribbonColour = new Color(palette.ribbon);
  const cream = new Color(palette.star);
  const leaf = new Color(palette.leaf);
  const bloom = new Color(palette.bloom);
  const spore = new Color(palette.spore);

  /* The box. One mesh, because it never moves: the open folds it flat by
     scaling the group it lives in, which is a transform rather than a rebuild
     and the reason a reloaded parcel is the same picture as a finished one. */
  const paperGroup = new Group();
  paperGroup.name = 'paper';
  paperGroup.add(new Mesh(
    box(PAPER.w, PAPER.h, PAPER.d, paper, [0, PAPER.h / 2, 0], axis),
    material,
  ));

  /* The lid: the geometry is pushed forward inside its group so the pivot is
     the back edge, and a rotation about x tips it up and over the way a lid
     goes rather than through the box. */
  const lidGroup = new Group();
  lidGroup.name = 'lid';
  lidGroup.position.set(0, PAPER.h, -LID.d / 2);
  lidGroup.add(new Mesh(
    box(LID.w, LID.h, LID.d, shade(paper, 1.15), [0, LID.h / 2, LID.d / 2], axis, [0.34, -0.3]),
    material,
  ));

  /* The ribbon: two bands round body and lid, two loops and a knot at the
     crossing. Its own group because it comes off first, all at once. */
  const bandHeight = PAPER.h + LID.h;
  const knotY = bandHeight + 0.015;
  const ribbonGroup = new Group();
  ribbonGroup.name = 'ribbon';
  ribbonGroup.add(new Mesh(merge([
    shape(box(PAPER.w + 0.02, bandHeight, 0.13, ribbonColour, [0, bandHeight / 2, 0], axis, [0.12, -0.42]), null),
    shape(box(0.13, bandHeight, PAPER.d + 0.02, ribbonColour, [0, bandHeight / 2, 0], axis, [0.12, -0.42]), null),
    shape(quad(0.2, 0.07), shade(ribbonColour, 1.3), { at: [0.09, knotY, 0.03], rot: [0.2, 0.5, 0.4] }),
    shape(quad(0.2, 0.07), shade(ribbonColour, 0.85), { at: [-0.09, knotY, 0.03], rot: [-0.2, -0.5, -0.4] }),
    shape(new BoxGeometry(0.08, 0.06, 0.08), shade(ribbonColour, 1.1), { at: [0, knotY, 0.03] }),
  ]), material));

  /* The tag, on a pivot at the knot, because a card on a string is the one
     part of a parcel that moves when the parcel does not. */
  const tagGroup = new Group();
  tagGroup.name = 'tag';
  tagGroup.position.set(0, knotY - 0.02, 0.06);
  tagGroup.add(new Mesh(merge([
    shape(quad(0.15, 0.11), cream, { at: [0, -0.09, 0.015], rot: [0.1, 0, 0.16] }),
  ]), material));

  /* The plant: the repository. Everything in it is one merged mesh with three
     colours in its vertex attribute, so the thing that comes out of the box is
     one draw call and the bloom arrives without a second material. */
  const plantGroup = new Group();
  plantGroup.name = 'plant';
  plantGroup.position.set(0, PAPER.h * 0.06, 0);
  plantGroup.scale.setScalar(0.001);
  const stem = 0.4;
  plantGroup.add(new Mesh(merge([
    shape(quad(0.042, stem), leaf, { at: [0, stem / 2, 0] }),
    shape(quad(0.042, stem), shade(leaf, 0.75), { at: [0, stem / 2, 0], rot: [0, Math.PI / 2, 0] }),
    shape(quad(0.18, 0.11), shade(leaf, 1.25), { at: [0.09, stem * 0.6, 0.01], rot: [0.1, 0.4, 0.5] }),
    shape(quad(0.15, 0.1), shade(leaf, 1.05), { at: [-0.08, stem * 0.8, -0.01], rot: [-0.1, -0.5, -0.6] }),
    shape(oval(0.085, 0.065, 6), bloom, { at: [0, stem, 0.01] }),
    shape(oval(0.026, 0.034, 3), shade(bloom, 1.4), { at: [0, stem + 0.02, 0.03] }),
    shape(quad(0.028, 0.06), spore, { at: [0.055, stem + 0.06, 0], rot: [0, 0.6, 0.5] }),
    shape(quad(0.028, 0.05), shade(spore, 0.8), { at: [-0.045, stem + 0.05, 0], rot: [0, -0.6, -0.5] }),
  ]), material));

  root.add(paperGroup, lidGroup, ribbonGroup, tagGroup, plantGroup);

  let triangles = 0;
  root.traverse((object) => {
    if (object.isMesh) triangles += object.geometry.attributes.position.count / 3;
  });

  const state = { phase: 'closed', t: 0, tag: { p: 0, v: 0 }, sash: { p: 0, v: 0 } };

  /* Every value the open produces as one function of its progress, so the last
     frame of the animation and the frame after a reload are the same frame:
     `settle(1)` is what a parcel restored from storage calls. Order matters —
     the ribbon slackens and falls, then the lid comes off, the paper folds
     flat, and only then does the repository grow out of it. */
  const settle = (k) => {
    const slack = ease(clamp01(k / 0.42));
    const lift = clamp01((k - 0.3) / 0.7);
    const fold = spring(clamp01((k - 0.25) / 0.75));
    const grow = spring(clamp01((k - 0.45) / 0.55));

    ribbonGroup.position.y = -0.2 * slack;
    ribbonGroup.position.z = 0.2 * slack;
    ribbonGroup.rotation.z = 0.42 * slack;
    ribbonGroup.rotation.x = -0.26 * slack;
    ribbonGroup.scale.setScalar(1 - 0.12 * slack);

    lidGroup.position.y = PAPER.h + 0.46 * lift;
    lidGroup.position.z = -LID.d / 2 - 0.18 * lift;
    lidGroup.rotation.x = -1.4 * spring(lift);

    // Folded flat and pulled in: an opened parcel is a sheet on the ground,
    // and the difference between it and a closed one has to be a difference in
    // the pixels it covers rather than a label in the panel.
    paperGroup.scale.set(1 - 0.18 * fold, 1 - 0.93 * fold, 1 - 0.18 * fold);

    plantGroup.scale.setScalar(Math.max(0.001, grow));
    plantGroup.rotation.y = (1 - grow) * -0.7;
  };

  const open = () => {
    if (state.phase === 'open') return false;
    state.phase = 'opening';
    state.t = 0;
    return true;
  };

  const restore = () => {
    state.phase = 'open';
    state.t = OPEN_MS;
    settle(1);
  };

  /* A composed still: the parcel at rest with its springs at zero, so the
     frame a reader gets under reduced motion, the frame after a reload and
     the frame the measurement compares are the same pixels rather than three
     moments of the same wind. */
  const reset = () => {
    state.tag.p = 0; state.tag.v = 0; state.sash.p = 0; state.sash.v = 0;
    settle(state.phase === 'open' ? 1 : 0);
    tagGroup.rotation.x = 0.06;
    tagGroup.rotation.z = 0.08;
    if (state.phase === 'closed') ribbonGroup.rotation.z = 0;
  };

  /* A hop landing beside a parcel is a nudge: the tag swings and the ribbon
     rocks, on the ears' own spring, so the animal and the things around it are
     disturbed by the same landing. */
  const nudge = (strength) => {
    state.tag.v += strength * 7;
    state.sash.v += strength * 4.5;
  };

  const follow = (s, target, dt, stiffness, damping) => {
    s.v += (stiffness * (target - s.p) - 2 * damping * Math.sqrt(stiffness) * s.v) * dt;
    s.p += s.v * dt;
    return s.p;
  };

  const update = (dt, seconds) => {
    if (state.phase === 'opening') {
      state.t = Math.min(OPEN_MS, state.t + dt * 1000);
      settle(state.t / OPEN_MS);
      if (state.t >= OPEN_MS) state.phase = 'open';
    }

    // Wind, one frequency and one phase per parcel, so no two tags agree.
    const phase = place.index * 1.7;
    const sway = Math.sin(seconds * 1.6 + phase) * 0.055;
    follow(state.tag, sway, dt, 42, 0.24);
    follow(state.sash, sway * 0.7, dt, 30, 0.3);
    tagGroup.rotation.x = 0.06 + state.tag.p * 0.55;
    tagGroup.rotation.z = 0.08 + state.tag.p * 0.3 + state.sash.p * 0.2;
    if (state.phase === 'closed') ribbonGroup.rotation.z = state.sash.p * 0.1;
  };

  return {
    index: place.index,
    root,
    parts: { paperGroup, lidGroup, ribbonGroup, tagGroup, plantGroup },
    triangles,
    state,
    open,
    restore,
    reset,
    nudge,
    update,
    settle,
    isOpen: () => state.phase === 'open',
    isMoving: () => state.phase === 'opening',
  };
}
