(function () {
  "use strict";

  const { tileKey } = window.CityGameMath;

  function createBlockTools({ mapSize, ground, roadMap }) {
    const { hasRoad, isMajorIntersectionCenter } = roadMap;

    function isRoadSurface(x, y) {
      const kind = ground[y] && ground[y][x] && ground[y][x].kind;
      return (
        kind === "road-lane" ||
        kind === "road-center" ||
        kind === "centerline-dash"
      );
    }

    function isBlockPerimeter(x, y) {
      const kind = ground[y] && ground[y][x] && ground[y][x].kind;
      return Boolean(kind && (kind.startsWith("block-edge") || kind.startsWith("block-corner")));
    }

    function isNextToBlockPerimeter(x, y) {
      return [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => isBlockPerimeter(x + dx, y + dy));
    }

    function getBlockBounds(block) {
      return block.reduce(
        (bounds, cell) => ({
          minX: Math.min(bounds.minX, cell.x),
          maxX: Math.max(bounds.maxX, cell.x),
          minY: Math.min(bounds.minY, cell.y),
          maxY: Math.max(bounds.maxY, cell.y),
        }),
        { minX: mapSize, maxX: 0, minY: mapSize, maxY: 0 },
      );
    }

    function getBlocks() {
      const seen = Array.from({ length: mapSize }, () => Array(mapSize).fill(false));
      const blocks = [];

      for (let startY = 0; startY < mapSize; startY += 1) {
        for (let startX = 0; startX < mapSize; startX += 1) {
          if (seen[startY][startX] || hasRoad(startX, startY)) {
            continue;
          }

          const cells = [];
          const queue = [[startX, startY]];
          seen[startY][startX] = true;

          for (let index = 0; index < queue.length; index += 1) {
            const [x, y] = queue[index];
            cells.push({ x, y });

            [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ].forEach(([dx, dy]) => {
              const nextX = x + dx;
              const nextY = y + dy;

              if (
                nextX < 0 ||
                nextY < 0 ||
                nextX >= mapSize ||
                nextY >= mapSize ||
                seen[nextY][nextX] ||
                hasRoad(nextX, nextY)
              ) {
                return;
              }

              seen[nextY][nextX] = true;
              queue.push([nextX, nextY]);
            });
          }

          blocks.push(cells);
        }
      }

      return blocks;
    }

    function canPlaceTree(x, y) {
      const kind = ground[y][x].kind;
      return kind === "grass" || kind === "floor" || kind === "block-inner";
    }

    function canPlacePlanter(x, y) {
      const kind = ground[y][x].kind;
      return kind === "grass" || kind === "floor" || kind === "block-inner";
    }

    function canPlaceFense(x, y) {
      const kind = ground[y][x].kind;
      return kind === "block-inner" || kind === "grass" || kind === "floor";
    }

    function canPlaceChair(x, y) {
      const kind = ground[y][x].kind;
      return kind === "grass" || kind === "floor" || kind === "block-inner";
    }

    function canPlaceTrafficLight(x, y) {
      const kind = ground[y] && ground[y][x] && ground[y][x].kind;
      return Boolean(kind && kind.startsWith("block-corner"));
    }

    function canPlaceStreetLight(x, y) {
      const kind = ground[y] && ground[y][x] && ground[y][x].kind;
      return Boolean(kind && kind.startsWith("block-edge"));
    }

    function canPlaceStructure(x, y) {
      const kind = ground[y][x].kind;
      return kind === "block-inner" || kind === "grass" || kind === "floor";
    }

    function isPoolTile(x, y) {
      const kind = ground[y] && ground[y][x] && ground[y][x].kind;
      return Boolean(kind && kind.startsWith("pool-"));
    }

    function isNextToPoolArea(x, y, width, height) {
      for (let offsetY = -1; offsetY <= height; offsetY += 1) {
        for (let offsetX = -1; offsetX <= width; offsetX += 1) {
          if (isPoolTile(x + offsetX, y + offsetY)) {
            return true;
          }
        }
      }

      return false;
    }

    function canPlaceStructureArea(x, y, width, height, occupiedTiles, spacing = 0) {
      if (isNextToPoolArea(x, y, width, height)) {
        return false;
      }

      for (let offsetY = -spacing; offsetY < height + spacing; offsetY += 1) {
        for (let offsetX = -spacing; offsetX < width + spacing; offsetX += 1) {
          const tileX = x + offsetX;
          const tileY = y + offsetY;
          const groundTile = ground[tileY] && ground[tileY][tileX];

          if (offsetX < 0 || offsetY < 0 || offsetX >= width || offsetY >= height) {
            if (
              !groundTile ||
              isRoadSurface(tileX, tileY) ||
              isPoolTile(tileX, tileY) ||
              occupiedTiles.has(tileKey(tileX, tileY))
            ) {
              return false;
            }
            continue;
          }

          if (
            !groundTile ||
            !canPlaceStructure(tileX, tileY) ||
            occupiedTiles.has(tileKey(tileX, tileY))
          ) {
            return false;
          }
        }
      }

      return true;
    }

    function occupyArea(occupiedTiles, x, y, width, height, spacing = 0) {
      for (let offsetY = -spacing; offsetY < height + spacing; offsetY += 1) {
        for (let offsetX = -spacing; offsetX < width + spacing; offsetX += 1) {
          occupiedTiles.add(tileKey(x + offsetX, y + offsetY));
        }
      }
    }

    function hasNearbyObject(objects, x, y, maxDistanceX, maxDistanceY) {
      return objects.some((object) => {
        const distanceX = Math.abs(object.x - x);
        const distanceY = Math.abs(object.y - y);
        return distanceX <= maxDistanceX && distanceY <= maxDistanceY;
      });
    }

    return {
      hasRoad,
      isMajorIntersectionCenter,
      isRoadSurface,
      isNextToBlockPerimeter,
      getBlockBounds,
      getBlocks,
      canPlaceTree,
      canPlacePlanter,
      canPlaceFense,
      canPlaceChair,
      canPlaceTrafficLight,
      canPlaceStreetLight,
      canPlaceStructure,
      canPlaceStructureArea,
      occupyArea,
      hasNearbyObject,
    };
  }

  window.CityMapBlocks = {
    createBlockTools,
  };
})();
