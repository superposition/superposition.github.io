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
  Color, DirectionalLight, Fog, HemisphereLight, PerspectiveCamera, Scene,
  WebGLRenderer,
} from 'three';

import { GESTURES, gestureFor, heldPose, poseAt, createBear } from './bear.js';
import { createForest, facing, station } from './forest.js';

export const WIDTH = 320;
export const HEIGHT = 240;

const HOP_MS = 560;
const ARC = 0.95;
/* The camera sits ahead of the bear and to its right, in the bear's own frame,
   looking back at it: he walks toward the reader, so the face, the ears and the
   paws are the subject and the path recedes behind him into the fog. Five units
   away and 29 degrees of vertical field put him at about a third of the frame's
   height, which is where a character stands on a screen this size. */
const CAMERA = { x: 1.9, y: 2.2, z: 4.6 };
const CAMERA_MS = 260;
const LOOK = 1.05;

/* Where the bear's paws are below his root, so he stands on the ground rather
   than in it: hips at 0.44, leg pivot 0.3 below that, and half a leg at 0.14. */
const FOOT = 0.6;

const lerp = (a, b, k) => a + (b - a) * k;

export function createScene(canvas, palette) {
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

  const key = new DirectionalLight(new Color(palette.cream), 3.8);
  key.position.set(3.6, 8.5, 7.2);
  scene.add(key);
  scene.add(new HemisphereLight(new Color(palette.star), new Color(palette.deep), 1.4));

  const forest = createForest(palette);
  scene.add(forest.root);

  const bear = createBear(palette);
  scene.add(bear.root);

  const state = {
    index: 0,
    hop: null,
    gesture: null,
    pending: null,
    typing: false,
    elapsed: 0,
  };

  const place = (index) => {
    const s = station(index);
    bear.root.position.set(s.x, s.y + FOOT, s.z);
    bear.root.rotation.y = facing(index);
  };

  /* The hop is interpolated from wherever the bear is when the hop starts, not
     from the station he left: a reader who presses Next twice in half a second
     gets a second hop out of the air rather than a teleport back to the path. */
  const placeAt = (k, from, fromYaw, to) => {
    const q = station(to);
    bear.root.position.set(
      lerp(from.x, q.x, k),
      lerp(from.y, q.y + FOOT, k) + ARC * 4 * k * (1 - k),
      lerp(from.z, q.z, k),
    );
    bear.root.rotation.y = fromYaw + (facing(to) - fromYaw) * k;
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

  /* Go to a station: a hop along the path unless the reader has asked for no
     motion, in which case the bear is simply there, already in the middle of
     its gesture — a composed still rather than an empty one. */
  const go = (index, { instant = false } = {}) => {
    const target = Math.max(0, Math.min(19, index));
    const previous = state.index;
    const gesture = GESTURES[gestureFor(target)];
    state.index = target;
    if (instant || target === previous) {
      state.hop = null;
      state.pending = null;
      state.gesture = { gesture, elapsed: 0 };
      place(target);
      snapCamera();
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
      }
    }

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

    bear.apply({
      ...pose,
      bob: (pose.bob ?? 0) + idle * 0.014,
      squash: (pose.squash ?? 0) + idle * 0.02,
      head: [(pose.head?.[0] ?? 0) + idle * 0.035, pose.head?.[1] ?? 0, pose.head?.[2] ?? 0],
    });

    // The mouth: a flap at about eight syllables a second while a sentence is
    // arriving, and shut the moment it lands.
    bear.parts.jaw.rotation.x = state.typing
      ? 0.08 + Math.abs(Math.sin(seconds * 26)) * 0.7
      : 0;
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
  };

  const stats = () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    bearTriangles: bear.triangles,
    forestTriangles: forest.triangles,
    budget: bear.budget,
    trees: forest.trees,
    framebuffer: [WIDTH, HEIGHT],
  });

  return {
    renderer, scene, camera, bear, forest, state,
    go, step, render, still, setTyping, stats,
  };
}
