import * as THREE from "../vendor/three/three.module.js";
import { GLTFLoader } from "../vendor/three/addons/loaders/GLTFLoader.js";

(async function () {
  "use strict";

  const mapData = window.CityMapData;
  const { clamp } = window.CityGameMath;
  const { createAssetCache } = window.CityAssetCache;
  const { createActors } = window.CityActors;
  const { createCharacterRenderer } = window.CityCharacterRenderer;
  const { createControls } = window.CityControls;
  const { createGltfCharacterRenderer } = window.CityGltfCharacterRenderer;
  const { createGeometry } = window.CityGeometry;
  const { createRenderer } = window.CityRenderer;

  const canvas = document.getElementById("city-canvas");
  const status = document.getElementById("status");
  const readout = document.getElementById("tile-readout");
  const gridToggle = document.getElementById("toggle-grid");
  const zoomInButton = document.getElementById("zoom-in");
  const zoomOutButton = document.getElementById("zoom-out");
  const resetButton = document.getElementById("reset-view");

  const minZoom = 0.18;
  const maxZoom = 2.4;
  const maxCanvasDpr = 1.5;
  const pressedKeys = new Set();
  const geometry = createGeometry(mapData);
  const view = {
    viewportWidth: 1,
    viewportHeight: 1,
    dpr: 1,
    zoom: 0.4,
    panX: 0,
    panY: 0,
  };
  const characterCanvas = document.createElement("canvas");
  const assetCache = createAssetCache(mapData);
  const actors = createActors(mapData, geometry, pressedKeys);

  let renderer = null;
  let controls = null;
  let showGrid = false;
  let hoverTile = null;
  let needsRender = true;
  let lastFrameTime = performance.now();
  let activeFrameTime = 0;
  let animationFrameId = 0;
  let renderFrameId = 0;
  let resizeFrameId = 0;

  function centerCameraOnLocalPlayer() {
    const point = geometry.tileCenterPoint(actors.localPlayer.x, actors.localPlayer.y);
    view.panX = view.viewportWidth / 2 - point.x * view.zoom;
    view.panY = view.viewportHeight / 2 - point.y * view.zoom + 28;
  }

  function render() {
    if (!needsRender || !renderer) {
      return;
    }

    needsRender = false;
    renderer.render({
      showGrid,
      hoverTile,
      activeFrameTime,
    });
  }

  function requestRender() {
    if (needsRender) {
      return;
    }

    needsRender = true;
    if (!renderFrameId) {
      renderFrameId = requestAnimationFrame((time) => {
        renderFrameId = 0;
        activeFrameTime = time;
        render();
      });
    }
  }

  function scheduleFrame() {
    if (document.hidden || animationFrameId) {
      return;
    }

    animationFrameId = requestAnimationFrame(frame);
  }

  function frame(now) {
    animationFrameId = 0;

    if (document.hidden) {
      return;
    }

    const deltaSeconds = Math.min(0.08, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    activeFrameTime = now;
    actors.update(deltaSeconds, now / 1000);
    centerCameraOnLocalPlayer();
    needsRender = true;
    render();
    scheduleFrame();
  }

  function cancelAnimationLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  }

  function resetView() {
    view.zoom = clamp(0.7, minZoom, maxZoom);
    centerCameraOnLocalPlayer();
    requestRender();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    view.viewportWidth = Math.max(1, rect.width);
    view.viewportHeight = Math.max(1, rect.height);
    view.dpr = Math.min(window.devicePixelRatio || 1, maxCanvasDpr);
    canvas.width = Math.floor(view.viewportWidth * view.dpr);
    canvas.height = Math.floor(view.viewportHeight * view.dpr);
    resetView();
  }

  function queueResize() {
    if (resizeFrameId) {
      return;
    }

    resizeFrameId = requestAnimationFrame(() => {
      resizeFrameId = 0;
      resizeCanvas();
    });
  }

  function setZoom(nextZoom, anchorX = view.viewportWidth / 2, anchorY = view.viewportHeight / 2) {
    const before = geometry.screenToWorld(view, anchorX, anchorY);
    view.zoom = clamp(nextZoom, minZoom, maxZoom);
    view.panX = anchorX - before.x * view.zoom;
    view.panY = anchorY - before.y * view.zoom;
    requestRender();
  }

  function createFallbackCharacterRenderer() {
    const characterGL = characterCanvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });

    return createCharacterRenderer(characterGL, characterCanvas);
  }

  async function createPlayerRenderer() {
    try {
      status.textContent = "Loading character";
      return await createGltfCharacterRenderer({
        THREE,
        GLTFLoader,
        characterCanvas,
      });
    } catch (error) {
      console.warn("Falling back to procedural character renderer", error);
      return createFallbackCharacterRenderer();
    }
  }

  async function boot() {
    try {
      status.textContent = "Loading tiles";
      await assetCache.loadAll();
      actors.initializePlayers();
      const characterRenderer = await createPlayerRenderer();
      renderer = createRenderer({
        canvas,
        mapData,
        geometry,
        assetCache,
        actors,
        characterRenderer,
        characterCanvas,
        view,
      });
      renderer.buildStaticRenderables();
      controls = createControls({
        canvas,
        readout,
        mapData,
        geometry,
        view,
        pressedKeys,
        getShowGrid: () => showGrid,
        setShowGrid: (nextShowGrid) => {
          showGrid = nextShowGrid;
        },
        getHoverTile: () => hoverTile,
        setHoverTile: (nextHoverTile) => {
          hoverTile = nextHoverTile;
        },
        resetView,
        requestRender,
        scheduleFrame: () => {
          lastFrameTime = performance.now();
          scheduleFrame();
        },
        cancelAnimationLoop,
        setZoom,
        queueResize,
      });
      status.textContent = "Arrow keys to explore, scroll to zoom";
      controls.bind({ gridToggle, zoomInButton, zoomOutButton, resetButton });
      resizeCanvas();
      lastFrameTime = performance.now();
      scheduleFrame();
    } catch (error) {
      status.textContent = error.message;
      throw error;
    }
  }

  boot();
})();
