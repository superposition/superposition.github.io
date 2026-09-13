/* The notebook's Paper fields — @paper-design/shaders from the CDN, no build step.
 *
 * A field is decoration: a WebGL2 canvas the page mounts a Paper Shaders fragment
 * shader into (https://github.com/paper-design/shaders, Apache-2.0, Copyright Lost
 * Coast Labs, Inc.). Every field is aria-hidden and every field has a CSS fallback
 * painted underneath it, so a browser without WebGL2, a reader with reduced motion,
 * and a text-only client all get the same page.
 *
 * Markup contract:
 *   <div class="field" data-field="mesh" data-colors="#91baff,#c9b2ff" data-speed=".18"></div>
 *
 * data-field   mesh | grid                      which shader
 * data-colors  comma-separated hex, up to 10    mesh: the colour spots
 * data-speed   number; 0 or absent is a still   animation speed
 * data-frame   milliseconds                     which still, for a deterministic frame
 * mesh:        data-distortion, data-swirl, data-grain-mixer, data-grain-overlay
 * grid:        data-back, data-fill, data-stroke, data-gap, data-dot-size,
 *              data-stroke-width, data-size-range, data-opacity-range,
 *              data-shape (circle | diamond | square | triangle)
 *
 * Fields mount lazily — a page can carry several and only the ones the reader
 * scrolls to ever take a WebGL context. ShaderMount then owns visibility, resize,
 * pixel budget and the render loop; nothing here re-implements that.
 */
import {
  ShaderMount,
  ShaderFitOptions,
  getShaderColorFromString,
  meshGradientFragmentShader,
  dotGridFragmentShader,
} from "https://cdn.jsdelivr.net/npm/@paper-design/shaders@0.0.80/+esm";

/** The frame a still is drawn at: late enough that the spots have travelled apart. */
const STILL_FRAME = 41000;
const MAX_COLORS = 10;

const num = (el, key, fallback) => {
  const value = Number(el.dataset[key]);
  return el.dataset[key] === undefined || el.dataset[key] === "" || !Number.isFinite(value)
    ? fallback
    : value;
};

const hexes = (el, key) =>
  (el.dataset[key] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_COLORS);

/** Sizing every field shares: the world is the canvas, so a field fills whatever box it is given. */
const sizing = (fit) => ({
  u_fit: ShaderFitOptions[fit],
  u_scale: 1,
  u_rotation: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_offsetX: 0,
  u_offsetY: 0,
  u_worldWidth: 0,
  u_worldHeight: 0,
});

const SHAPES = { circle: 0, diamond: 1, square: 2, triangle: 3 };

const KINDS = {
  mesh: {
    fragment: meshGradientFragmentShader,
    uniforms: (el) => {
      const colors = hexes(el, "colors");
      return {
        ...sizing("cover"),
        u_colors: colors.map(getShaderColorFromString),
        u_colorsCount: colors.length,
        u_distortion: num(el, "distortion", 0.8),
        u_swirl: num(el, "swirl", 0.55),
        u_grainMixer: num(el, "grainMixer", 0.06),
        u_grainOverlay: num(el, "grainOverlay", 0.04),
      };
    },
  },
  grid: {
    fragment: dotGridFragmentShader,
    uniforms: (el) => ({
      ...sizing("none"),
      u_colorBack: getShaderColorFromString(el.dataset.back || "#101217"),
      u_colorFill: getShaderColorFromString(el.dataset.fill || "#232a36"),
      u_colorStroke: getShaderColorFromString(el.dataset.stroke || "#00000000"),
      u_dotSize: num(el, "dotSize", 32),
      u_gapX: num(el, "gap", 96),
      u_gapY: num(el, "gap", 96),
      u_strokeWidth: num(el, "strokeWidth", 0),
      u_sizeRange: num(el, "sizeRange", 0),
      u_opacityRange: num(el, "opacityRange", 0),
      u_shape: SHAPES[el.dataset.shape] ?? SHAPES.circle,
    }),
  },
};

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

function mount(el) {
  const kind = KINDS[el.dataset.field];
  if (!kind) return;

  // A still: either the page asked for one, or the reader asked for less motion.
  const speed = reduced.matches ? 0 : num(el, "speed", 0);
  const frame = num(el, "frame", speed === 0 ? STILL_FRAME : 0);

  try {
    new ShaderMount(el, kind.fragment, kind.uniforms(el), undefined, speed, frame);
    el.dataset.fieldReady = "";
  } catch (error) {
    // No WebGL2: leave the element to the CSS fallback it was painted with all along.
    el.dataset.fieldFallback = "";
    console.warn("paper-field:", error.message);
  }
}

const fields = document.querySelectorAll("[data-field]");
if (fields.length && "IntersectionObserver" in window) {
  // Mount what is near the viewport; the rest stays as markup until scrolled to.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        mount(entry.target);
      });
    },
    { rootMargin: "400px 0px" }
  );
  fields.forEach((el) => observer.observe(el));
} else {
  fields.forEach(mount);
}
