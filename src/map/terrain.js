(function () {
  "use strict";

  const { variation, randomUnit } = window.CityGameMath;

  function createTerrainLayers({ tile, ground, mapSize = ground.length, blockTools }) {
    const { getBlocks, getBlockBounds } = blockTools;

    function makeAreaTile(localX, localY, width, height, areaTile, kindPrefix) {
      const north = localY === 0;
      const east = localX === width - 1;
      const south = localY === height - 1;
      const west = localX === 0;

      if (north && west) {
        return { id: areaTile.cornerNw, rotation: 0, kind: `${kindPrefix}-corner-nw` };
      }
      if (north && east) {
        return { id: areaTile.cornerWs, rotation: 0, flipX: true, kind: `${kindPrefix}-corner-ne` };
      }
      if (south && east) {
        return { id: areaTile.cornerSe, rotation: 2, kind: `${kindPrefix}-corner-se` };
      }
      if (south && west) {
        return { id: areaTile.cornerWs, rotation: 3, kind: `${kindPrefix}-corner-ws` };
      }
      if (north) {
        return { id: areaTile.edgeNw, rotation: 0, kind: `${kindPrefix}-edge-nw` };
      }
      if (east) {
        return { id: areaTile.edgeSe, rotation: 1, kind: `${kindPrefix}-edge-se` };
      }
      if (south) {
        return { id: areaTile.edgeSe, rotation: 2, kind: `${kindPrefix}-edge-se` };
      }
      if (west) {
        return { id: areaTile.edgeNw, rotation: 3, kind: `${kindPrefix}-edge-nw` };
      }

      return {
        id: areaTile.inner(localX, localY),
        rotation: variation(localY, localX) % 4,
        kind: kindPrefix,
      };
    }

    function makeGrassTile(localX, localY, width, height) {
      return makeAreaTile(
        localX,
        localY,
        width,
        height,
        {
          cornerNw: tile.grassCornerNw,
          cornerSe: tile.grassCornerSe,
          cornerWs: tile.grassCornerWs,
          edgeNw: tile.grassEdgeNw,
          edgeSe: tile.grassEdgeSe,
          inner: (x, y) => variation(x, y) > 36 ? tile.grassInner1 : tile.grassInner2,
        },
        "grass",
      );
    }

    function makeFloorTile(localX, localY, width, height) {
      return makeAreaTile(
        localX,
        localY,
        width,
        height,
        {
          cornerNw: tile.floorCornerNw,
          cornerSe: tile.floorCornerSe,
          cornerWs: tile.floorCornerWs,
          edgeNw: tile.floorEdgeNw,
          edgeSe: tile.floorEdgeSe,
          inner: () => tile.floorInner1,
        },
        "floor",
      );
    }

    function makePoolTile(localX, localY, width, height, poolIndex) {
      const north = localY === 0;
      const east = localX === width - 1;
      const south = localY === height - 1;
      const west = localX === 0;

      if (north && west) {
        return { id: tile.poolCornerNw, rotation: 0, kind: "pool-corner-nw", poolIndex };
      }
      if (north && east) {
        return { id: tile.poolCornerWs, rotation: 0, flipX: true, kind: "pool-corner-ne", poolIndex };
      }
      if (south && east) {
        return { id: tile.poolCornerSe, rotation: 2, kind: "pool-corner-se", poolIndex };
      }
      if (south && west) {
        return { id: tile.poolCornerWs, rotation: 3, kind: "pool-corner-ws", poolIndex };
      }
      if (north) {
        return { id: tile.poolEdgeNw, rotation: 0, kind: "pool-edge-nw", poolIndex };
      }
      if (east) {
        return { id: tile.poolEdgeSe, rotation: 1, kind: "pool-edge-se", poolIndex };
      }
      if (south) {
        return { id: tile.poolEdgeSe, rotation: 2, kind: "pool-edge-se", poolIndex };
      }
      if (west) {
        return { id: tile.poolEdgeNw, rotation: 3, kind: "pool-edge-nw", poolIndex };
      }

      const hasSplash = randomUnit(poolIndex * 97 + localX * 31 + localY * 53) > 0.65;
      return {
        id: hasSplash ? tile.poolInnerSplash : tile.poolInner,
        rotation: hasSplash ? 1 : 0,
        kind: hasSplash ? "pool-inner-splash" : "pool-inner",
        poolIndex,
      };
    }

    function canPlacePoolArea(x, y, width, height, reservedTiles) {
      for (let offsetY = 0; offsetY < height; offsetY += 1) {
        for (let offsetX = 0; offsetX < width; offsetX += 1) {
          const tileX = x + offsetX;
          const tileY = y + offsetY;
          const groundTile = ground[tileY] && ground[tileY][tileX];

          if (
            !groundTile ||
            groundTile.kind !== "block-inner" ||
            groundTile.id !== tile.blockInner ||
            reservedTiles.has(`${tileX},${tileY}`)
          ) {
            return false;
          }
        }
      }

      return true;
    }

    function applyPoolArea(x, y, width, height, poolIndex, reservedTiles) {
      for (let offsetY = 0; offsetY < height; offsetY += 1) {
        for (let offsetX = 0; offsetX < width; offsetX += 1) {
          const tileX = x + offsetX;
          const tileY = y + offsetY;
          ground[tileY][tileX] = makePoolTile(offsetX, offsetY, width, height, poolIndex);
          reservedTiles.add(`${tileX},${tileY}`);
        }
      }
    }

    function addPools() {
      const poolAreas = [];
      const reservedTiles = new Set();
      const sizes = [
        { width: 5, height: 4 },
        { width: 4, height: 4 },
        { width: 5, height: 3 },
      ];

      getBlocks().forEach((block, blockIndex) => {
        if (variation(blockIndex + 23, block.length) > 42) {
          return;
        }

        const size = sizes[variation(blockIndex + 7, block.length) % sizes.length];
        const candidates = block
          .map(({ x, y }) => ({ x, y }))
          .sort((a, b) => variation(a.x + blockIndex * 11, a.y + 31) - variation(b.x + blockIndex * 11, b.y + 31));

        const placement = candidates.find(({ x, y }) => canPlacePoolArea(x, y, size.width, size.height, reservedTiles));

        if (!placement) {
          return;
        }

        applyPoolArea(placement.x, placement.y, size.width, size.height, poolAreas.length, reservedTiles);
        poolAreas.push({ x: placement.x, y: placement.y, width: size.width, height: size.height });
      });

      return poolAreas;
    }

    function addGrassAreas() {
      const grassAreas = [];

      const floorBlockIndexes = getBlocks()
        .map((block, blockIndex) => ({ block, blockIndex, bounds: getBlockBounds(block) }))
        .filter(({ bounds }) => bounds.maxX - bounds.minX > 2 && bounds.maxY - bounds.minY > 2)
        .sort((a, b) => {
          const center = (mapSize - 1) / 2;
          const aDistance = Math.abs((a.bounds.minX + a.bounds.maxX) / 2 - center) +
            Math.abs((a.bounds.minY + a.bounds.maxY) / 2 - center);
          const bDistance = Math.abs((b.bounds.minX + b.bounds.maxX) / 2 - center) +
            Math.abs((b.bounds.minY + b.bounds.maxY) / 2 - center);
          return aDistance - bDistance || a.blockIndex - b.blockIndex;
        })
        .slice(0, 2)
        .map(({ blockIndex }) => blockIndex);

      getBlocks().forEach((block, blockIndex) => {
        const bounds = getBlockBounds(block);
        const grassWidth = bounds.maxX - bounds.minX - 1;
        const grassHeight = bounds.maxY - bounds.minY - 1;
        const useFloor = floorBlockIndexes.includes(blockIndex);

        if (grassWidth < 1 || grassHeight < 1) {
          return;
        }

        const grassCells = block.filter(({ x, y }) => {
          const tileAtCell = ground[y][x];
          const insideBlockRing =
            x > bounds.minX &&
            x < bounds.maxX &&
            y > bounds.minY &&
            y < bounds.maxY;

          return (
            insideBlockRing &&
            tileAtCell.kind === "block-inner" &&
            !String(tileAtCell.kind).startsWith("pool")
          );
        });

        if (!grassCells.length) {
          return;
        }

        grassCells.forEach(({ x, y }) => {
          const localX = x - bounds.minX - 1;
          const localY = y - bounds.minY - 1;

          ground[y][x] = (useFloor ? makeFloorTile : makeGrassTile)(
            localX,
            localY,
            grassWidth,
            grassHeight,
          );
          ground[y][x].walkableAreaKind = useFloor ? "floor" : "grass";
          ground[y][x].grassBlockIndex = blockIndex;
        });

        grassAreas.push({
          blockIndex,
          count: grassCells.length,
          kind: useFloor ? "floor" : "grass",
        });
      });

      return grassAreas;
    }

    return {
      pools: addPools(),
      grassAreas: addGrassAreas(),
    };
  }

  window.CityMapTerrain = {
    createTerrainLayers,
  };
})();
