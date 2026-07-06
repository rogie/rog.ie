import {
  emptyPixel,
  ShaderMount,
  getShaderNoiseTexture,
  paperTextureFragmentShader,
} from "https://esm.sh/@paper-design/shaders@0.0.77";

const hexToRgba = (hex) => {
  const value = hex.replace("#", "").trim();
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;

  const number = Number.parseInt(normalized.slice(0, 6), 16);
  return [
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
    1,
  ];
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", reject, { once: true });
    image.src = src;
  });

const getDocumentHeight = () =>
  Math.max(
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight,
    document.body?.scrollHeight || 0,
    document.body?.offsetHeight || 0,
    window.innerHeight,
  );

const syncPaperBackgroundHeight = (container) => {
  // The shader is an absolute page layer, so it needs to follow late layout
  // changes from fonts, media, and custom elements.
  container.style.height = "0px";
  container.style.height = `${getDocumentHeight()}px`;
};

const observePaperBackgroundHeight = (container) => {
  let frameId = null;
  const scheduleSync = () => {
    if (frameId !== null) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      syncPaperBackgroundHeight(container);
    });
  };

  const resizeObserver = new ResizeObserver(scheduleSync);
  resizeObserver.observe(document.documentElement);
  if (document.body) resizeObserver.observe(document.body);

  window.addEventListener("load", scheduleSync);
  window.addEventListener("resize", scheduleSync);
  document.fonts?.ready.then(scheduleSync).catch(() => {});

  scheduleSync();
  setTimeout(scheduleSync, 250);
  setTimeout(scheduleSync, 1000);
};

const mountPaperBackground = async () => {
  const container = document.getElementById("paper-background");
  if (!container) return;

  try {
    const image = await loadImage(emptyPixel);
    syncPaperBackgroundHeight(container);

    new ShaderMount(container, paperTextureFragmentShader, {
      u_image: image,
      u_colorBack: hexToRgba("#ffffff"),
      u_colorFront: hexToRgba("#EEEADF"),
      u_contrast: 0.3,
      u_roughness: 1,
      u_fiber: 0.4,
      u_fiberSize: 0.2,
      u_crumples: 0.2,
      u_crumpleSize: 0.9,
      u_folds: 0.8,
      u_foldCount: 13,
      u_drops: 0,
      u_fade: 0.04,
      u_seed: 861.8,
      u_scale: 0.5,
      u_fit: 1,
      u_rotation: 0.2,
      u_offsetX: 0,
      u_offsetY: 0,
      u_originX: 0.5,
      u_originY: 0.5,
      u_worldWidth: 1920,
      u_worldHeight: 1920,
      u_noiseTexture: getShaderNoiseTexture(),
    }, undefined, 0);

    observePaperBackgroundHeight(container);
  } catch (error) {
    console.warn("Failed to mount paper background shader", error);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountPaperBackground, { once: true });
} else {
  mountPaperBackground();
}
