/* The scene: one 320 × 240 framebuffer, one camera that trails the bear, one
   fog. Everything the 64-bit look is made of lives in this file, so a reader can
   check the render settings in one place:

     framebuffer   320 × 240, fixed. Not the window's size, ever.
     antialias     off. The picture is upscaled by the browser with
                   `image-rendering: pixelated`, so every edge is a hard
                   staircase, which is the whole point.
     pixel ratio   1. Not 2, not the device's. One framebuffer pixel is one
                   texel of the picture.
     shading       MeshLambertMaterial with flatShading: one normal per face,
                   vertex-lit, no specular. Lambert is the closest thing three
                   has to the per-vertex lighting of the era.
     textures      none. Every colour is the palette's, carried in a vertex
                   attribute; with no texture there is no filtering to argue
                   about.
     shadows       off. The hardware drew a blob under a character, not a
                   shadow map, and the fog does most of the work anyway.
     fog           linear, from 12 to 34 units, into the ground colour. It is
                   what stands in for the far plane and what makes the forest
                   read as depth at a distance of forty units.
     post          none. No bloom, no tonemap pass, no HDRI: the picture that
                   leaves the framebuffer is the picture on the screen.

   Nothing here is a filter over a normal-looking 3D scene. Change the
   framebuffer to 1200 × 900 and the same code looks like a modern renderer with
   too few polygons; keep it at 320 × 240 with no antialiasing and the era comes
   back without a shader. */

import {
  Color, DirectionalLight, Fog, HemisphereLight, MeshLambertMaterial,
  PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer,
} from 'three';

import {
  CAMERA, GESTURES, RIG, createBear, gestureFor, heldPose, poseAt,
} from './bear.js';
import { createForest, facing, station } from './forest.js';
import { PAPER, placements } from './gifts.js';
import { createParcel } from './parcels.js';

export const WIDTH = 320;
export const HEIGHT = 240;

const HOP_MS = 560;
const ARC = 0.95;
/* The camera sits ahead of the bear and to its right, in the bear's own frame,
   looking back at it: he walks toward the reader, so the face, the ears and the
   paws are the subject and the path recedes behind him into the fog. The offset
   itself lives in bear.js, because the value bands are painted against it — the
   bear's near side and the shot's near side have to be one decision, not two.
   At about five units with a 58-degree field he occupies a third of the frame's
   height, which is where a character stands on a screen this size. */
const CAMERA_MS = 190;
const LOOK = 1.0;

/* One light, and it does not move: a fixed direction in world space, carried
   along with the bear so every station is lit from the same angle. The bear
   walks 46 units down the path, so a light bolted to the world origin would put
   the face in shadow by the fifth station and in full sun at the first — the
   lighting would change per sentence, which is the opposite of one light. The
   direction is constant; only the lamp's anchor travels. Offset chosen so the
   key comes over the camera's shoulder and slightly from the near side. */
const KEY = { x: 2.6, y: 7.4, z: -5.4 };
const KEY_INTENSITY = 3.25;
const FILL_INTENSITY = 0.62;

/* Where the bear's paws are below his root, so he stands on the ground rather
   than in it: hips at RIG.hipY, leg pivot RIG.leg.at[1] below that, and the leg
   itself below the pivot. It was 0.6 while the legs reached only 0.16, so he
   floated 0.44 units above the path for the whole walk. */
const LEG_PIVOT = RIG.hipY + RIG.leg.at[1];
/* A hand's breadth of clearance: the path is a curve over a rolling floor, so
   a bear whose feet are exactly on the height at his own centre puts the
   downhill paw 0.03 into the ground. */
const FOOT = RIG.leg.len - LEG_PIVOT + 0.03;

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

export function createScene(canvas, palette, count) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: 'default',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.shadowMap.enabled = false;
  renderer.setClearColor(new Color(palette.void), 1);

  const scene = new Scene();
  scene.fog = new Fog(new Color(palette.void), 12, 34);

  const camera = new PerspectiveCamera(58, WIDTH / HEIGHT, 0.4, 120);

  const key = new DirectionalLight(new Color(palette.cream), KEY_INTENSITY);
  key.position.set(KEY.x, KEY.y, KEY.z);
  scene.add(key);
  scene.add(key.target);
  scene.add(new HemisphereLight(new Color(palette.star), new Color(palette.deep), FILL_INTENSITY));

  const places = placements(count);
  const forest = createForest(palette, places);
  scene.add(forest.root);

  const bear = createBear(palette);
  bear.root.name = 'bear';
  scene.add(bear.root);

  /* The parcels are the only objects in the frame whose geometry changes
     while the reader watches, so they are five small meshes each rather than
     one merged buffet: a lid that lifts and a tag that swings cannot share a
     buffer. A closed parcel draws four of them; the plant stays scaled to
     nothing until the box is open, and the fog keeps the ones up the path out
     of the frame, so the count of draws settles around thirty. */
  const parcelMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const parcels = places.map((place) => createParcel(palette, place, parcelMaterial));
  for (const parcel of parcels) scene.add(parcel.root);
  const raycaster = new Raycaster();
  const aim = new Vector2();

  const state = {
    index: 0,
    hop: null,
    gesture: null,
    pending: null,
    typing: false,
    elapsed: 0,
    settle: 0,
    ear: { p: 0, v: 0 },
    tail: { p: 0, v: 0 },
    bodyY: [],
  };

  /* The key light is carried with the bear: same direction in world space,
     different anchor per station. Its target is the bear, so the direction
     never changes and the forest is lit by the same one light. */
  const carryLight = () => {
    const p = bear.root.position;
    key.position.set(p.x + KEY.x, p.y + KEY.y, p.z + KEY.z);
    key.target.position.set(p.x, p.y, p.z);
    key.target.updateMatrixWorld();
  };

  /* atan2 wraps at pi, so the heading is kept in (-pi, pi] everywhere: a hop
     that ends on the far side of the wrap would otherwise snap the yaw by a
     whole turn when it lands, and the measurement that watches for a spin
     cannot tell a snap from a spin. */
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  const last = () => count - 1;

  const place = (index) => {
    const s = station(index);
    bear.root.position.set(s.x, s.y + FOOT, s.z);
    bear.root.rotation.y = wrap(facing(index));
  };

  /* The hop is interpolated from wherever the bear is when the hop starts, not
     from the station he left: a reader who presses Next twice in half a second
     gets a second hop out of the air rather than a teleport back to the path.

     The turn takes the short way round. `facing` is an atan2, so two adjacent
     stations can report +3.0 and -3.0 for headings a tenth of a radian apart;
     interpolating those raw numbers makes the bear spin three hundred degrees,
     the camera chase him the whole way, and the face leave the frame for most
     of a second. Wrapping the delta to (-pi, pi] is the whole fix. */
  const placeAt = (k, from, fromYaw, to) => {
    const q = station(to);
    bear.root.position.set(
      lerp(from.x, q.x, k),
      lerp(from.y, q.y + FOOT, k) + ARC * 4 * k * (1 - k),
      lerp(from.z, q.z, k),
    );
    bear.root.rotation.y = wrap(fromYaw + wrap(facing(to) - fromYaw) * k);
  };

  /* The offset is rotated into the bear's own frame, so the camera swings round
     with his heading and the shot stays the same at every station instead of
     the bear turning out of frame. He is five and a half units off the lens
     with the fog closing at thirty-four, so the path behind him recedes rather
     than ending. */
  const cameraTarget = () => {
    const position = bear.root.position;
    const yaw = bear.root.rotation.y;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    return {
      x: position.x + cos * CAMERA.x + sin * CAMERA.z,
      y: position.y + CAMERA.y,
      z: position.z - sin * CAMERA.x + cos * CAMERA.z,
    };
  };

  const lookAt = () => {
    const position = bear.root.position;
    camera.lookAt(position.x, position.y + LOOK, position.z);
  };

  const snapCamera = () => {
    const target = cameraTarget();
    camera.position.set(target.x, target.y, target.z);
    lookAt();
  };

  place(0);
  snapCamera();
  carryLight();

  /* Go to a station: a hop along the path unless the reader has asked for no
     motion, in which case the bear is simply there, already in the middle of
     its gesture — a composed still rather than an empty one. */
  const go = (index, { instant = false } = {}) => {
    const target = Math.max(0, Math.min(last(), index));
    const previous = state.index;
    const gesture = GESTURES[gestureFor(target)];
    state.index = target;
    if (instant || target === previous) {
      state.hop = null;
      state.pending = null;
      state.gesture = { gesture, elapsed: 0 };
      place(target);
      snapCamera();
      carryLight();
      return;
    }
    state.hop = {
      from: bear.root.position.clone(),
      yaw: bear.root.rotation.y,
      to: target,
      elapsed: 0,
    };
    state.gesture = null;
    state.pending = gesture;
  };

  const setTyping = (typing) => { state.typing = typing; };

  /* One blink, 150 ms of lid, fired by the clock and not by a gesture: an
     animal that blinks only while it performs is a machine. The period is fixed
     so a reload is the same animal, and every fourth cycle doubles, so the
     rhythm is not a metronome either. */
  const blinkAt = (ms) => {
    const period = 4300;
    const phase = (ms + 700) % period;
    const cycle = Math.floor((ms + 700) / period);
    const single = phase < 150 ? Math.sin((phase / 150) * Math.PI) : 0;
    const second = cycle % 4 === 1 && phase > 230 && phase < 360
      ? Math.sin(((phase - 230) / 130) * Math.PI) : 0;
    return Math.max(single, second);
  };

  /* The ears and the tail hang off a spring fed with the body's own velocity a
     moment ago: they lag it, overshoot it and settle, which is the difference
     between a creature and a model on a turntable. Both springs are integrated
     from dt, so the motion is a function of time and of nothing else. */
  const follow = (spring, target, dt) => {
    const w = 26;
    const zeta = 0.42;
    spring.v += (w * w * (target - spring.p) - 2 * zeta * w * spring.v) * (dt / 1000);
    spring.p += spring.v * (dt / 1000);
    return spring.p;
  };

  const step = (dt) => {
    state.elapsed += dt;

    if (state.hop) {
      state.hop.elapsed += dt;
      const k = Math.min(1, state.hop.elapsed / HOP_MS);
      placeAt(k, state.hop.from, state.hop.yaw, state.hop.to);
      const stretch = Math.sin(k * Math.PI);
      bear.hop.scale.set(1 - stretch * 0.08, 1 + stretch * 0.14, 1 - stretch * 0.08);
      if (k >= 1) {
        state.hop = null;
        place(state.index);
        bear.hop.scale.set(1, 1, 1);
        state.gesture = { gesture: state.pending, elapsed: 0 };
        state.pending = null;
        // landing: the compression the fall left him with, recovering with one
        // overshoot. This is the settle the path hop never had.
        state.settle = 1;
        // The landing disturbs whatever is standing beside the path at this
        // station: the tag swings, the ribbon rocks, and both settle on the
        // same spring as the ears.
        parcels[state.index]?.nudge(1);
      }
    }

    // settle runs on its own clock, decaying, whether or not a gesture follows
    if (state.settle > 0) {
      state.settle = Math.max(0, state.settle - dt / 260);
    }

    carryLight();

    const target = cameraTarget();
    const damp = 1 - Math.exp(-dt / CAMERA_MS);
    camera.position.x += (target.x - camera.position.x) * damp;
    camera.position.y += (target.y - camera.position.y) * damp;
    camera.position.z += (target.z - camera.position.z) * damp;
    lookAt();

    const seconds = state.elapsed / 1000;
    const idle = 0.5 + 0.5 * Math.sin(seconds * 2.2);
    const pose = state.gesture ? poseAt(state.gesture.gesture, Math.min(1, state.gesture.elapsed / state.gesture.gesture.ms)) : {};
    if (state.gesture) state.gesture.elapsed += dt;

    const bob = (pose.bob ?? 0) + idle * 0.014;
    // The body's vertical velocity, sampled 70 ms back: what the ears have not
    // caught up with yet.
    // The velocity is the whole animal's, not just the crouch: a hop along the
    // path moves the root, a hop in place moves the hips, and the ears lag
    // whichever happened.
    const bodyY = bear.root.position.y + RIG.hipY + bob;
    state.bodyY.push({ t: state.elapsed, y: bodyY });
    while (state.bodyY.length > 24) state.bodyY.shift();
    const behind = state.bodyY.find((s) => s.t >= state.elapsed - 70) ?? state.bodyY[0];
    const vy = (bodyY - behind.y) / 0.07;
    const lag = follow(state.ear, clamp(-vy * 0.32, -0.5, 0.5), dt);

    // The settle: one compression, one overshoot, gone in 260 ms.
    const settleSquash = state.settle > 0
      ? 0.15 * state.settle * Math.cos((1 - state.settle) * Math.PI * 2) : 0;

    bear.apply({
      ...pose,
      bob,
      squash: (pose.squash ?? 0) + idle * 0.02 + settleSquash,
      head: [
        (pose.head?.[0] ?? 0) + idle * 0.035 - clamp(vy * 0.05, -0.08, 0.08),
        pose.head?.[1] ?? 0,
        pose.head?.[2] ?? 0,
      ],
      earLag: lag,
      tailLag: follow(state.tail, -vy * 0.12, dt),
      blink: state.hop ? 0 : blinkAt(state.elapsed),
    });

    // The mouth: a flap at about eight syllables a second while a sentence is
    // arriving, and shut the moment it lands.
    bear.parts.jaw.rotation.x = state.typing
      ? 0.08 + Math.abs(Math.sin(seconds * 26)) * 0.7
      : 0;

    for (const parcel of parcels) parcel.update(dt / 1000, seconds);
  };

  const render = () => {
    renderer.render(scene, camera);
    return renderer.info.render.calls;
  };

  /* The reduced-motion frame: no hop, no camera lerp, no breath, one gesture
     held where it reads best. `still` puts the bear at the station and poses it
     in one call, then the caller renders once. */
  const still = (index) => {
    state.index = index;
    state.hop = null;
    place(index);
    snapCamera();
    const pose = heldPose(GESTURES[gestureFor(index)]);
    bear.apply(pose);
    bear.parts.jaw.rotation.x = 0.06;
    // No loop runs under reduced motion, so every swinging part is put at the
    // one pose it would have held: a composed still, not a frame that happened.
    for (const parcel of parcels) parcel.reset();
  };

  const stats = () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    bearTriangles: bear.triangles,
    forestTriangles: forest.triangles,
    parcelTriangles: parcels.reduce((sum, parcel) => sum + parcel.triangles, 0),
    parcels: parcels.length,
    openParcels: parcels.filter((parcel) => parcel.isOpen()).length,
    budget: bear.budget,
    trees: forest.trees,
    framebuffer: [WIDTH, HEIGHT],
  });

  /* Open one parcel. The animation is the scene's clock, so a reader who
     presses the button and then presses Next gets both at once; under reduced
     motion the parcel is simply open, because a state is not a motion. */
  const openGift = (index) => parcels[index]?.open() ?? false;
  const openGiftNow = (index) => {
    const parcel = parcels[index];
    if (!parcel) return false;
    parcel.restore();
    return true;
  };
  const restoreGift = (index) => parcels[index]?.restore() ?? false;

  /* What the pointer is over, in the framebuffer's own coordinates: the canvas
     is 320 × 240 upscaled by CSS, so the page hands in the ground-normalised
     point and the ray is cast through the camera the picture was drawn with.
     Only a closed parcel answers, and only the nearest one. */
  const pick = (x, y) => {
    aim.set(x, y);
    raycaster.setFromCamera(aim, camera);
    const roots = parcels.filter((parcel) => !parcel.isOpen()).map((parcel) => parcel.root);
    const hits = raycaster.intersectObjects(roots, true);
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node && !parcels.some((parcel) => parcel.root === node)) node = node.parent;
    const parcel = parcels.find((p) => p.root === node);
    return parcel ? parcel.index : null;
  };

  /* Where a parcel is on the screen, in the framebuffer's own terms: normalised
     device coordinates through the camera the picture was drawn with, and the
     width in pixels of its paper, which is the number that decides whether a
     reader can find it. The measurement script reads this rather than guessing
     from the world position. */
  const parcelScreen = () => {
    const V = bear.root.position.clone().constructor;
    camera.updateMatrixWorld();
    return parcels.map((parcel) => {
      const place = places[parcel.index];
      const centre = new V(place.x, place.y + PAPER.h / 2, place.z).project(camera);
      const edge = new V(place.x + PAPER.w / 2, place.y + PAPER.h / 2, place.z).project(camera);
      return {
        index: parcel.index,
        x: +centre.x.toFixed(3),
        y: +centre.y.toFixed(3),
        z: +centre.z.toFixed(3),
        px: +Math.abs(edge.x - centre.x) * WIDTH,
        phase: parcel.state.phase,
      };
    });
  };

  const parcelState = (index) => ({
    phase: parcels[index]?.state.phase,
    open: parcels[index]?.isOpen() ?? false,
    moving: parcels[index]?.isMoving() ?? false,
  });

  return {
    renderer, scene, camera, bear, forest, parcels, places, state,
    go, step, render, still, setTyping, stats,
    openGift, openGiftNow, restoreGift, pick, parcelState, parcelScreen,
  };
}
