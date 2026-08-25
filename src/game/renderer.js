(function () {
  "use strict";

  const { clamp, directionToAngle } = window.CityGameMath;
  const { createCanvasDrawing } = window.CityCanvasDrawing;

  const groundTileBleed = 4;
  const groundCacheScale = 1;
  const characterAnimationFrameMs = 125;
  const characterWalkCycleMs = 572;
  const characterAngleSteps = 32;
  const maxCharacterSpriteCache = 96;

  function createRenderer({ canvas, mapData, geometry, assetCache, actors, characterRenderer, characterCanvas, view }) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const { rows, tileWidth } = mapData.world;
    const { halfTileHeight, mapBounds, tileTopPoint, tileCenterPoint } = geometry;
    const drawing = createCanvasDrawing({ mapData, geometry, view });
    let staticRenderables = [];
    let groundCache = null;
    const characterSpriteCache = new Map();

    function isTileVisible(topX, topY) {
      return geometry.isTileVisible(view, topX, topY, groundTileBleed + 2);
    }

    function isWorldRectVisible(x, y, width, height, bleed = 0) {
      return geometry.isWorldRectVisible(view, x, y, width, height, bleed);
    }

    function getGroundCacheBounds() {
      const margin = tileWidth * 2;

      return {
        minX: mapBounds.minX - margin,
        minY: mapBounds.minY - margin,
        maxX: mapBounds.maxX + margin,
        maxY: mapBounds.maxY + margin,
      };
    }

    function buildGroundCache() {
      const bounds = getGroundCacheBounds();
      const width = Math.ceil(bounds.maxX - bounds.minX);
      const height = Math.ceil(bounds.maxY - bounds.minY);
      const scale = groundCacheScale;
      const buffer = document.createElement("canvas");
      const bufferContext = buffer.getContext("2d", { alpha: true });

      buffer.width = Math.ceil(width * scale);
      buffer.height = Math.ceil(height * scale);
      bufferContext.clearRect(0, 0, buffer.width, buffer.height);
      bufferContext.setTransform(scale, 0, 0, scale, -bounds.minX * scale, -bounds.minY * scale);
      bufferContext.imageSmoothingEnabled = true;
      bufferContext.imageSmoothingQuality = "high";
      drawGroundTiles(bufferContext, false);

      groundCache = {
        canvas: buffer,
        minX: bounds.minX,
        minY: bounds.minY,
        width,
        height,
        scale,
      };
    }

    function drawGroundTiles(targetContext, cullToViewport) {
      const ground = mapData.layers.ground;

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < geometry.columns; x += 1) {
          const point = tileTopPoint(x, y);
          if (cullToViewport && !isTileVisible(point.x, point.y)) {
            continue;
          }

          const tile = ground[y][x];
          const image = assetCache.makeTransformedImage(
            assetCache.get(tile.id),
            tile.rotation || 0,
            tile.flipX,
            tile.flipY,
          );
          drawing.drawIsometricImage(targetContext, image, point.x, point.y, groundTileBleed);
        }
      }
    }

    function drawGroundLayer() {
      if (!groundCache) {
        buildGroundCache();
      }

      const padding = 80 / view.zoom;
      const visibleLeft = clamp((0 - view.panX) / view.zoom - padding, groundCache.minX, groundCache.minX + groundCache.width);
      const visibleTop = clamp((0 - view.panY) / view.zoom - padding, groundCache.minY, groundCache.minY + groundCache.height);
      const visibleRight = clamp((view.viewportWidth - view.panX) / view.zoom + padding, groundCache.minX, groundCache.minX + groundCache.width);
      const visibleBottom = clamp((view.viewportHeight - view.panY) / view.zoom + padding, groundCache.minY, groundCache.minY + groundCache.height);

      if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
        return;
      }

      const sourceWidth = visibleRight - visibleLeft;
      const sourceHeight = visibleBottom - visibleTop;

      ctx.drawImage(
        groundCache.canvas,
        (visibleLeft - groundCache.minX) * groundCache.scale,
        (visibleTop - groundCache.minY) * groundCache.scale,
        sourceWidth * groundCache.scale,
        sourceHeight * groundCache.scale,
        visibleLeft,
        visibleTop,
        sourceWidth,
        sourceHeight,
      );
    }

    function drawGridLayer(showGrid) {
      if (!showGrid) {
        return;
      }

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < geometry.columns; x += 1) {
          const point = tileTopPoint(x, y);
          if (isTileVisible(point.x, point.y)) {
            drawing.drawDiamond(ctx, point.x, point.y, null, "rgba(17, 31, 24, 0.24)");
          }
        }
      }
    }

    function renderDepth(item) {
      if (item.depthX !== undefined && item.depthY !== undefined) {
        return item.depthX + item.depthY + (item.depthOffset ?? 0);
      }

      if (item.footprintWidth && item.footprintHeight) {
        return item.footprintX + item.footprintY + item.footprintWidth + item.footprintHeight - 2 + 0.18;
      }

      return item.x + item.y;
    }

    function buildStaticRenderables() {
      staticRenderables = mapData.layers.objects
        .map((object) => {
          const baseImage = assetCache.get(object.id);
          if (!baseImage) {
            return null;
          }

          const image = assetCache.makeObjectImage(baseImage, object.rotation || 0, object.flipX, object.flipY);
          const tilePoint = tileTopPoint(object.x, object.y);
          const anchorX = object.anchorX ?? 0.5;
          const anchorY = object.anchorY ?? 1;
          const scale = object.scale ?? 1;
          const width = image.width * scale;
          const height = image.height * scale;

          return {
            type: "object",
            depth: renderDepth(object),
            image,
            x: tilePoint.x - width * anchorX + (object.offsetX || 0),
            y: tilePoint.y + halfTileHeight - height * anchorY + (object.offsetY || 0),
            width,
            height,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.depth - b.depth);
    }

    function drawStaticObject(renderable) {
      if (!isWorldRectVisible(renderable.x, renderable.y, renderable.width, renderable.height, 48)) {
        return;
      }

      ctx.drawImage(renderable.image, renderable.x, renderable.y, renderable.width, renderable.height);
    }

    function drawVehicleSprite(vehicle, position) {
      const baseImage = assetCache.get(vehicle.assetId);
      if (!baseImage) {
        return;
      }

      const image = assetCache.makeObjectImage(baseImage, 0, false, false);
      const point = tileCenterPoint(position.x, position.y);
      const width = image.width * vehicle.scale;
      const height = image.height * vehicle.scale;
      const x = point.x - width / 2;
      const y = point.y - height * 0.6;

      if (!isWorldRectVisible(x, y, width, height, 32)) {
        return;
      }

      ctx.drawImage(image, x, y, width, height);
    }

    function getCharacterSprite(player, index, activeFrameTime) {
      if (!player.isWalking && player.cachedRestSprite && player.cachedRestAngle === player.displayAngle) {
        return player.cachedRestSprite;
      }

      const angle = player.displayAngle ?? directionToAngle(player.directionX, player.directionY);
      const angleStep = Math.round((((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * characterAngleSteps) % characterAngleSteps;
      const phaseStep = characterRenderer.getFrameKey
        ? characterRenderer.getFrameKey(player, index, activeFrameTime)
        : player.isWalking
          ? Math.floor((activeFrameTime % characterWalkCycleMs) / characterAnimationFrameMs)
          : 0;
      const sourceKey = characterRenderer.source || "procedural";
      const cacheKey = `${sourceKey}:${player.id}:${player.isWalking ? "walk" : "idle"}:${angleStep}:${phaseStep}`;
      const cached = characterSpriteCache.get(cacheKey);

      if (cached) {
        characterSpriteCache.delete(cacheKey);
        characterSpriteCache.set(cacheKey, cached);
        return cached;
      }

      const previousAngle = player.displayAngle;
      const previousWalking = player.isWalking;
      const quantizedAngle = (angleStep / characterAngleSteps) * Math.PI * 2;
      const sprite = document.createElement("canvas");
      const spriteContext = sprite.getContext("2d", { alpha: true });

      sprite.width = characterCanvas.width;
      sprite.height = characterCanvas.height;
      player.displayAngle = quantizedAngle;
      characterRenderer.renderToSprite(player, activeFrameTime, index);
      spriteContext.drawImage(characterCanvas, 0, 0);
      player.displayAngle = previousAngle;
      player.isWalking = previousWalking;
      characterSpriteCache.set(cacheKey, sprite);
      while (characterSpriteCache.size > maxCharacterSpriteCache) {
        characterSpriteCache.delete(characterSpriteCache.keys().next().value);
      }

      if (!player.isWalking) {
        player.cachedRestSprite = sprite;
        player.cachedRestAngle = player.displayAngle;
      }

      return sprite;
    }

    function drawCharacterSprite(player, index, activeFrameTime) {
      if (!characterRenderer) {
        return;
      }

      const point = tileCenterPoint(player.x, player.y);
      const size = player.local ? 124 : 112;
      const x = point.x - size / 2;
      const y = point.y - size + 16;

      if (!isWorldRectVisible(x, y, size, size, 32)) {
        return;
      }

      ctx.drawImage(getCharacterSprite(player, index, activeFrameTime), x, y, size, size);
    }

    function drawObjectLayer(activeFrameTime) {
      const dynamicRenderables = [
        ...actors.players.map((player, index) => ({
          type: "player",
          depth: player.x + player.y + 0.42,
          data: player,
          index,
        })),
        ...actors.cars.map((car) => {
          const position = actors.getCarPosition(car);
          return {
            type: "vehicle",
            depth: position.x + position.y + 0.36,
            data: car,
            position,
          };
        }),
      ].sort((a, b) => a.depth - b.depth);
      let staticIndex = 0;
      let dynamicIndex = 0;

      while (staticIndex < staticRenderables.length || dynamicIndex < dynamicRenderables.length) {
        const staticRenderable = staticRenderables[staticIndex];
        const dynamicRenderable = dynamicRenderables[dynamicIndex];
        const renderable =
          dynamicRenderable &&
          (!staticRenderable || dynamicRenderable.depth <= staticRenderable.depth)
            ? dynamicRenderable
            : staticRenderable;

        if (renderable === dynamicRenderable) {
          dynamicIndex += 1;
        } else {
          staticIndex += 1;
        }

        if (renderable.type === "player") {
          drawCharacterSprite(renderable.data, renderable.index, activeFrameTime);
          continue;
        }
        if (renderable.type === "vehicle") {
          drawVehicleSprite(renderable.data, renderable.position);
          continue;
        }

        drawStaticObject(renderable);
      }
    }

    function drawHover(hoverTile) {
      if (!hoverTile) {
        return;
      }

      const point = tileTopPoint(hoverTile.x, hoverTile.y);
      drawing.drawDiamond(ctx, point.x, point.y, "rgba(255, 255, 255, 0.16)", "rgba(255, 255, 255, 0.84)");
    }

    function render({ showGrid, hoverTile, activeFrameTime }) {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.clearRect(0, 0, view.viewportWidth, view.viewportHeight);

      ctx.save();
      ctx.translate(view.panX, view.panY);
      ctx.scale(view.zoom, view.zoom);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";

      drawGroundLayer();
      drawGridLayer(showGrid);
      drawObjectLayer(activeFrameTime);
      drawing.drawDirectionLabels(ctx);
      drawHover(hoverTile);
      ctx.restore();

      drawing.drawVignette(ctx);
    }

    return {
      render,
      buildStaticRenderables,
    };
  }

  window.CityRenderer = {
    createRenderer,
  };
})();
