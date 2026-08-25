(function () {
  "use strict";

  const { directionToAngle } = window.CityGameMath;
  const canvasSize = 192;
  const walkFrameCount = 8;
  const walkLoopSeconds = 1.0;
  const targetModelHeight = 1.62;
  const defaultModelUrls = {
    player: {
      url: "./assets/player-lite.glb",
      rotationOffset: 0,
    },
    player2: {
      url: "./assets/player2-lite.glb",
      screenDirectionScale: -1,
      rotationOffset: -Math.PI * 0.75,
    },
  };

  function prepareMaterials(THREE, renderer, model) {
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    model.traverse((node) => {
      if (!node.isMesh) {
        return;
      }

      node.frustumCulled = false;

      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.filter(Boolean).forEach((material) => {
        if (material.map && THREE.SRGBColorSpace) {
          material.map.colorSpace = THREE.SRGBColorSpace;
        }

        [
          material.map,
          material.normalMap,
          material.roughnessMap,
          material.metalnessMap,
          material.aoMap,
        ].filter(Boolean).forEach((texture) => {
          texture.anisotropy = maxAnisotropy;
          texture.needsUpdate = true;
        });
      });
    });
  }

  function centerAndScaleModel(THREE, model) {
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = targetModelHeight / Math.max(size.y, 0.001);

    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    model.updateMatrixWorld(true);
  }

  function createGroundAccent(THREE) {
    const group = new THREE.Group();
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 48),
      new THREE.MeshBasicMaterial({
        color: 0x030712,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.43, 0.52, 64),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.y = 0.72;
    marker.rotation.x = -Math.PI / 2;
    marker.scale.y = 0.72;
    group.add(shadow, marker);

    return {
      group,
      marker,
    };
  }

  function getWalkFrame(player, index, now) {
    if (!player.isWalking) {
      return 0;
    }

    const offset = index * 0.137;
    return Math.floor((((now / 1000 + offset) % walkLoopSeconds) / walkLoopSeconds) * walkFrameCount);
  }

  function chooseModel(models, player) {
    if (player.local) {
      return models.player2 || models.player;
    }

    return models.player || models.player2;
  }

  function getScreenAngle(player) {
    const angle = player.displayAngle ?? directionToAngle(player.directionX, player.directionY);
    const directionX = Math.sin(angle);
    const directionY = -Math.cos(angle);
    const screenX = directionX - directionY;
    const screenY = directionX + directionY;

    return Math.atan2(screenX, -screenY);
  }

  function getModelRotation(model, player) {
    if (model.screenDirectionScale) {
      return getScreenAngle(player) * model.screenDirectionScale + model.rotationOffset;
    }

    const angle = player.displayAngle ?? directionToAngle(player.directionX, player.directionY);
    return angle + Math.PI + model.rotationOffset;
  }

  async function loadCharacterModel(THREE, loader, renderer, name, config) {
    const url = typeof config === "string" ? config : config.url;
    const rotationOffset = typeof config === "string" ? 0 : config.rotationOffset || 0;
    const screenDirectionScale = typeof config === "string" ? 0 : config.screenDirectionScale || 0;
    const gltf = await loader.loadAsync(url);
    const root = new THREE.Group();
    const model = gltf.scene;
    const mixer = gltf.animations.length ? new THREE.AnimationMixer(model) : null;
    const action = mixer ? mixer.clipAction(gltf.animations[0]) : null;

    centerAndScaleModel(THREE, model);
    prepareMaterials(THREE, renderer, model);
    root.add(model);

    if (action) {
      action.play();
    }

    return {
      id: name,
      url,
      rotationOffset,
      screenDirectionScale,
      root,
      mixer,
      clipDuration: action ? Math.max(action.getClip().duration, 0.001) : 1,
    };
  }

  async function createGltfCharacterRenderer({
    THREE,
    GLTFLoader,
    characterCanvas,
    modelUrls = defaultModelUrls,
  }) {
    const loader = new GLTFLoader();

    characterCanvas.width = canvasSize;
    characterCanvas.height = canvasSize;

    const renderer = new THREE.WebGLRenderer({
      canvas: characterCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });

    renderer.setPixelRatio(1);
    renderer.setSize(canvasSize, canvasSize, false);
    renderer.setClearColor(0x000000, 0);

    if (THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    const scene = new THREE.Scene();
    const accent = createGroundAccent(THREE);
    const camera = new THREE.OrthographicCamera(-1.18, 1.18, 1.18, -1.18, 0.01, 100);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    const fillLight = new THREE.HemisphereLight(0xffffff, 0x7c8995, 1.6);
    const modelEntries = Array.isArray(modelUrls)
      ? modelUrls.map((url, index) => [`model-${index}`, url])
      : Object.entries(modelUrls);
    const loadResults = await Promise.allSettled(
      modelEntries.map(([name, url]) => loadCharacterModel(THREE, loader, renderer, name, url)),
    );
    const loadedModels = loadResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    const models = Object.fromEntries(loadedModels.map((model) => [model.id, model]));

    loadResults
      .filter((result) => result.status === "rejected")
      .forEach((result) => console.warn("Could not load character model", result.reason));

    if (!loadedModels.length) {
      throw new Error("Could not load any GLB character models");
    }

    loadedModels.forEach((model) => {
      model.root.visible = false;
      scene.add(model.root);
    });
    scene.add(accent.group, fillLight, keyLight);

    keyLight.position.set(-2.2, 4.5, 2.8);
    camera.position.set(2.35, 2.25, 2.35);
    camera.lookAt(0, 0.74, 0);

    return {
      source: `gltf:${loadedModels.map((model) => model.url).join(",")}`,
      resize() {
        renderer.setSize(canvasSize, canvasSize, false);
      },
      getFrameKey(player, index, now) {
        return `${chooseModel(models, player).id}:${getWalkFrame(player, index, now)}`;
      },
      renderToSprite(player, now, index) {
        const activeModel = chooseModel(models, player);
        const frame = getWalkFrame(player, index, now);
        const animationProgress = frame / walkFrameCount;

        loadedModels.forEach((model) => {
          model.root.visible = model === activeModel;
        });
        activeModel.root.rotation.y = getModelRotation(activeModel, player);
        accent.marker.visible = Boolean(player.local);

        if (activeModel.mixer) {
          activeModel.mixer.setTime(player.isWalking ? animationProgress * activeModel.clipDuration : 0);
        }

        renderer.clear(true, true, true);
        renderer.render(scene, camera);

        return characterCanvas;
      },
    };
  }

  window.CityGltfCharacterRenderer = {
    createGltfCharacterRenderer,
  };
})();
