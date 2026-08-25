(function () {
  "use strict";

  function uniqueAssetNames(mapData) {
    const objectAssets = (mapData.layers.objects || [])
      .map((object) => object.id)
      .filter(Boolean);

    return Array.from(new Set([
      ...Object.values(mapData.assets),
      ...objectAssets,
    ]));
  }

  function loadImage(name) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve([name, image]);
      image.onerror = () => reject(new Error(`Could not load ${name}`));
      image.src = `./assets/${name}`;
    });
  }

  function createAssetCache(mapData) {
    const assets = new Map();
    const transformedAssets = new Map();
    const { tileSourceSize } = mapData.world;

    async function loadAll() {
      const loadedAssets = await Promise.all(uniqueAssetNames(mapData).map(loadImage));
      loadedAssets.forEach(([name, image]) => assets.set(name, image));
    }

    function get(name) {
      return assets.get(name);
    }

    function makeTransformedImage(image, turns, flipX = false, flipY = false) {
      const normalizedTurns = ((turns % 4) + 4) % 4;
      if (normalizedTurns === 0 && !flipX && !flipY) {
        return image;
      }

      const cacheKey = `${image.src}:${normalizedTurns}:${flipX ? "flip-x" : "x"}:${flipY ? "flip-y" : "y"}`;
      if (transformedAssets.has(cacheKey)) {
        return transformedAssets.get(cacheKey);
      }

      const buffer = document.createElement("canvas");
      buffer.width = tileSourceSize;
      buffer.height = tileSourceSize;
      const bufferContext = buffer.getContext("2d");
      bufferContext.translate(tileSourceSize / 2, tileSourceSize / 2);
      bufferContext.rotate(normalizedTurns * Math.PI * 0.5);
      bufferContext.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      bufferContext.drawImage(image, -tileSourceSize / 2, -tileSourceSize / 2);
      transformedAssets.set(cacheKey, buffer);
      return buffer;
    }

    function makeObjectImage(image, turns = 0, flipX = false, flipY = false) {
      const normalizedTurns = ((turns % 4) + 4) % 4;
      if (normalizedTurns === 0 && !flipX && !flipY) {
        return image;
      }

      const cacheKey = `${image.src}:object:${normalizedTurns}:${flipX ? "flip-x" : "x"}:${flipY ? "flip-y" : "y"}`;
      if (transformedAssets.has(cacheKey)) {
        return transformedAssets.get(cacheKey);
      }

      const sourceWidth = image.width;
      const sourceHeight = image.height;
      const buffer = document.createElement("canvas");
      buffer.width = normalizedTurns % 2 === 0 ? sourceWidth : sourceHeight;
      buffer.height = normalizedTurns % 2 === 0 ? sourceHeight : sourceWidth;
      const bufferContext = buffer.getContext("2d");
      bufferContext.translate(buffer.width / 2, buffer.height / 2);
      bufferContext.rotate(normalizedTurns * Math.PI * 0.5);
      bufferContext.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      bufferContext.drawImage(image, -sourceWidth / 2, -sourceHeight / 2);
      transformedAssets.set(cacheKey, buffer);
      return buffer;
    }

    return {
      loadAll,
      get,
      makeTransformedImage,
      makeObjectImage,
    };
  }

  window.CityAssetCache = {
    createAssetCache,
  };
})();
