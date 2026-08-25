(function () {
  "use strict";

  const { variation, randomUnit, tileKey } = window.CityGameMath;

  function createDecorationObjects({ mapSize, tile, ground, pools = [], blockTools, occupiedTiles }) {
    const {
      getBlocks,
      isMajorIntersectionCenter,
      isRoadSurface,
      isNextToBlockPerimeter,
      canPlaceTree,
      canPlacePlanter,
      canPlaceFense,
      canPlaceChair,
      canPlaceTrafficLight,
      canPlaceStreetLight,
      hasNearbyObject,
    } = blockTools;
    const adjacentOffsets = [
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    function getGroundKind(x, y) {
      return ground[y] && ground[y][x] ? ground[y][x].kind : "";
    }

    function hasAdjacentTile(x, y, predicate) {
      return adjacentOffsets.some((offset) => predicate(x + offset.x, y + offset.y));
    }

    function isPoolTile(x, y) {
      return getGroundKind(x, y).startsWith("pool-");
    }

    function isNextToPool(x, y) {
      return hasAdjacentTile(x, y, isPoolTile);
    }

    function isNorthOfPool(x, y) {
      return isPoolTile(x, y + 1);
    }

    function isEdgeGround(x, y) {
      const kind = getGroundKind(x, y);
      return (
        kind.startsWith("grass-edge") ||
        kind.startsWith("grass-corner") ||
        kind.startsWith("block-edge") ||
        kind.startsWith("block-corner")
      );
    }

    function canPlaceEdgeDecoration(x, y) {
      return canPlaceChair(x, y) || isEdgeGround(x, y);
    }

    function isNorthEdgeGround(x, y) {
      const tileAtCell = ground[y] && ground[y][x];
      if (!tileAtCell) {
        return false;
      }

      return (
        tileAtCell.kind === "grass-corner-nw" ||
        tileAtCell.kind === "grass-corner-ne" ||
        tileAtCell.kind === "block-corner-nw" ||
        tileAtCell.kind === "block-corner-ne" ||
        (tileAtCell.kind === "grass-edge-nw" && (tileAtCell.rotation || 0) === 0) ||
        (tileAtCell.kind === "block-edge-nw" && (tileAtCell.rotation || 0) === 0)
      );
    }

    function isSouthEdgeGround(x, y) {
      const tileAtCell = ground[y] && ground[y][x];
      if (!tileAtCell) {
        return false;
      }

      return (
        tileAtCell.kind === "grass-corner-se" ||
        tileAtCell.kind === "grass-corner-ws" ||
        tileAtCell.kind === "block-corner-se" ||
        tileAtCell.kind === "block-corner-ws" ||
        (tileAtCell.kind === "grass-edge-se" && (tileAtCell.rotation || 0) === 2) ||
        (tileAtCell.kind === "block-edge-se" && (tileAtCell.rotation || 0) === 2)
      );
    }

    function isSouthSideGround(x, y) {
      const tileAtCell = ground[y] && ground[y][x];
      if (!tileAtCell) {
        return false;
      }

      return (
        (tileAtCell.kind === "grass-edge-se" && (tileAtCell.rotation || 0) === 2) ||
        (tileAtCell.kind === "block-edge-se" && (tileAtCell.rotation || 0) === 2)
      );
    }

    function isGrassEdgeTile(x, y) {
      const kind = getGroundKind(x, y);
      return kind.startsWith("grass-edge") || kind.startsWith("grass-corner");
    }

    function isNextToStructureFootprint(x, y, object) {
      const footprintX = object.footprintX ?? Math.floor(object.x);
      const footprintY = object.footprintY ?? Math.floor(object.y);
      const footprintWidth = object.footprintWidth ?? 1;
      const footprintHeight = object.footprintHeight ?? 1;
      const withinExpandedArea =
        x >= footprintX - 1 &&
        x <= footprintX + footprintWidth &&
        y >= footprintY - 1 &&
        y <= footprintY + footprintHeight;
      const insideFootprint =
        x >= footprintX &&
        x < footprintX + footprintWidth &&
        y >= footprintY &&
        y < footprintY + footprintHeight;

      return withinExpandedArea && !insideFootprint;
    }

    function isNearStructure(x, y, structures, predicate, radius = 1) {
      return structures
        .filter(predicate)
        .some((object) => {
          if (radius === 1) {
            return isNextToStructureFootprint(x, y, object);
          }

          const objectX = object.footprintX ?? Math.floor(object.x);
          const objectY = object.footprintY ?? Math.floor(object.y);
          const objectWidth = object.footprintWidth ?? 1;
          const objectHeight = object.footprintHeight ?? 1;
          return (
            x >= objectX - radius &&
            x < objectX + objectWidth + radius &&
            y >= objectY - radius &&
            y < objectY + objectHeight + radius
          );
        });
    }

    function makeTrafficLights() {
      const lights = [];
      const intersectionCenters = [];

      for (let y = 0; y < mapSize; y += 1) {
        for (let x = 0; x < mapSize; x += 1) {
          if (isMajorIntersectionCenter(x, y)) {
            intersectionCenters.push({ x, y });
          }
        }
      }

      intersectionCenters.forEach((intersection, index) => {
        const corners = [
          { x: intersection.x - 2, y: intersection.y - 2, flipX: true, offsetX: -8, offsetY: -8 },
          { x: intersection.x + 2, y: intersection.y - 2, flipX: false, offsetX: 8, offsetY: -8 },
          { x: intersection.x - 2, y: intersection.y + 2, flipX: true, offsetX: -8, offsetY: 8 },
          { x: intersection.x + 2, y: intersection.y + 2, flipX: false, offsetX: 8, offsetY: 8 },
        ].filter(({ x, y }) => canPlaceTrafficLight(x, y) && !occupiedTiles.has(tileKey(x, y)));
        const targetCount = Math.min(corners.length, 1 + (variation(index + 19, intersection.x + intersection.y) % 2));

        corners
          .sort((a, b) => variation(a.x + index * 17, a.y + 71) - variation(b.x + index * 17, b.y + 71))
          .slice(0, targetCount)
          .forEach((corner) => {
            lights.push({
              id: tile.trafficLight,
              x: corner.x,
              y: corner.y,
              scale: 0.115,
              offsetX: corner.offsetX,
              offsetY: corner.offsetY - 4,
              anchorX: 0.5,
              anchorY: 0.92,
              flipX: corner.flipX,
              kind: "traffic-light",
            });
            occupiedTiles.add(tileKey(corner.x, corner.y));
          });
      });

      return lights;
    }

    function makeStreetLights() {
      const lights = [];

      getBlocks().forEach((block, blockIndex) => {
        const candidates = block
          .filter(({ x, y }) => {
            if (!canPlaceStreetLight(x, y) || occupiedTiles.has(tileKey(x, y))) {
              return false;
            }

            const tileAtCell = ground[y][x];
            return (tileAtCell.kind === "block-edge-nw" || tileAtCell.kind === "block-edge-se") &&
              variation(x + blockIndex * 13, y + 89) > 67;
          })
          .sort((a, b) => variation(a.x + blockIndex * 31, a.y + 103) - variation(b.x + blockIndex * 31, b.y + 103));
        const targetCount = Math.min(candidates.length, 2 + (variation(blockIndex + 13, block.length) % 2));

        for (let index = 0; index < targetCount; index += 1) {
          const cell = candidates[index];
          const groundTile = ground[cell.y][cell.x];
          const verticalEdge = groundTile.rotation === 1 || groundTile.rotation === 3;
          const seed = cell.x * 503 + cell.y * 907 + blockIndex * 47;

          lights.push({
            id: tile.streetLight,
            x: cell.x,
            y: cell.y,
            scale: 0.1,
            offsetX: verticalEdge ? (groundTile.rotation === 1 ? -8 : 8) : 0,
            offsetY: verticalEdge ? 0 : groundTile.rotation === 0 ? -10 : 8,
            anchorX: 0.5,
            anchorY: 0.94,
            flipX: groundTile.rotation === 1,
            kind: "street-light",
            variation: randomUnit(seed),
          });
          occupiedTiles.add(tileKey(cell.x, cell.y));
        }
      });

      return lights;
    }

    function makeManholes() {
      const roadsideCandidates = [];
      const fallbackCandidates = [];

      for (let y = 1; y < mapSize - 1; y += 1) {
        for (let x = 1; x < mapSize - 1; x += 1) {
          if (!isRoadSurface(x, y)) {
            continue;
          }

          const manhole = {
            id: tile.manhole,
            x,
            y,
            scale: 0.045,
            offsetX: (randomUnit(x * 331 + y * 541) - 0.5) * 8,
            offsetY: (randomUnit(x * 443 + y * 659) - 0.5) * 5,
            anchorX: 0.5,
            anchorY: 0.5,
            kind: "manhole",
          };

          if (isNextToBlockPerimeter(x, y)) {
            roadsideCandidates.push(manhole);
          } else {
            fallbackCandidates.push(manhole);
          }
        }
      }

      const selected = roadsideCandidates
        .sort((a, b) => variation(a.x + 71, a.y + 113) - variation(b.x + 71, b.y + 113))
        .slice(0, 5);

      if (selected.length < 5) {
        selected.push(
          ...fallbackCandidates
            .sort((a, b) => variation(a.x + 71, a.y + 113) - variation(b.x + 71, b.y + 113))
            .slice(0, 5 - selected.length),
        );
      }

      return selected;
    }

    function makeTrees() {
      const trees = [];

      for (let y = 1; y < mapSize - 1; y += 1) {
        for (let x = 1; x < mapSize - 1; x += 1) {
          if (!canPlaceTree(x, y) || occupiedTiles.has(tileKey(x, y))) {
            continue;
          }

          const kind = ground[y][x].kind;
          const chance = kind === "grass" ? 0.28 : 0.055;
          const seed = x * 97 + y * 193;

          if (randomUnit(seed) > chance) {
            continue;
          }

          if (hasNearbyObject(trees, x, y, 1, 1)) {
            continue;
          }

          const useTallTree = randomUnit(seed + 23) > 0.62;

          trees.push({
            id: useTallTree ? tile.tree2 : tile.tree,
            x,
            y,
            scale: useTallTree
              ? 0.135 + randomUnit(seed + 3) * 0.035
              : 0.18 + randomUnit(seed + 3) * 0.06,
            offsetX: (randomUnit(seed + 11) - 0.5) * 18,
            offsetY: (randomUnit(seed + 17) - 0.5) * 10,
            anchorX: 0.5,
            anchorY: 0.88,
            kind: "tree",
          });
          occupiedTiles.add(tileKey(x, y));
        }
      }

      return trees;
    }

    function canPlaceFenseRun(x, y, axis, length) {
      for (let index = 0; index < length; index += 1) {
        const tileX = axis === "x" ? x + index : x;
        const tileY = axis === "y" ? y + index : y;
        const groundTile = ground[tileY] && ground[tileY][tileX];

        if (
          !groundTile ||
          (!canPlaceFense(tileX, tileY) && !isGrassEdgeTile(tileX, tileY)) ||
          occupiedTiles.has(tileKey(tileX, tileY))
        ) {
          return false;
        }
      }

      return true;
    }

    function isFenseRunNearGrassEdgeOrStatue(x, y, axis, length, structures) {
      for (let index = 0; index < length; index += 1) {
        const tileX = axis === "x" ? x + index : x;
        const tileY = axis === "y" ? y + index : y;

        if (
          isGrassEdgeTile(tileX, tileY) ||
          isNearStructure(tileX, tileY, structures, (object) => object.kind === "statue", 2)
        ) {
          return true;
        }
      }

      return false;
    }

    function addFenseRun(fenses, x, y, axis, length) {
      for (let index = 0; index < length; index += 1) {
        const tileX = axis === "x" ? x + index : x;
        const tileY = axis === "y" ? y + index : y;

        fenses.push({
          id: tile.fense,
          x: tileX,
          y: tileY,
          scale: 0.18,
          offsetX: 0,
          offsetY: 0,
          anchorX: 0.5,
          anchorY: 0.83,
          flipX: axis === "y",
          kind: "fense",
        });

        occupiedTiles.add(tileKey(tileX, tileY));
      }
    }

    function makeFenses(structures) {
      const fenses = [];

      getBlocks().forEach((block, blockIndex) => {
        if (variation(blockIndex + 41, block.length) > 48) {
          return;
        }

        const axis = variation(blockIndex + 17, block.length) % 2 === 0 ? "x" : "y";
        const length = 4 + (variation(blockIndex + 7, block.length) % 4);
        const candidates = block
          .filter(({ x, y }) =>
            (canPlaceFense(x, y) || isGrassEdgeTile(x, y)) &&
            !occupiedTiles.has(tileKey(x, y)) &&
            isFenseRunNearGrassEdgeOrStatue(x, y, axis, length, structures)
          )
          .sort((a, b) => variation(a.x + blockIndex * 19, a.y + 43) - variation(b.x + blockIndex * 19, b.y + 43));
        const placement = candidates.find(({ x, y }) => canPlaceFenseRun(x, y, axis, length));

        if (!placement) {
          return;
        }

        addFenseRun(fenses, placement.x, placement.y, axis, length);
      });

      return fenses;
    }

    function makeUmbrellaChairs() {
      const umbrellaChairs = [];

      getBlocks().forEach((block, blockIndex) => {
        const candidates = block
          .filter(({ x, y }) => canPlaceChair(x, y) && !occupiedTiles.has(tileKey(x, y)) && isNorthOfPool(x, y))
          .sort((a, b) => a.y - b.y || a.x - b.x);
        const runLength = Math.min(candidates.length, 1 + (variation(blockIndex + 31, block.length) % 3));
        const start = candidates.findIndex((cell, index) => {
          for (let offset = 0; offset < runLength; offset += 1) {
            const next = candidates[index + offset];
            if (!next || next.y !== cell.y || next.x !== cell.x + offset) {
              return false;
            }
          }

          return true;
        });

        if (start < 0) {
          return;
        }

        for (let index = 0; index < runLength; index += 1) {
          const cell = candidates[start + index];
          const seed = cell.x * 419 + cell.y * 631 + index * 17;
          umbrellaChairs.push({
            id: tile.umbrellaChair,
            x: cell.x,
            y: cell.y,
            scale: 0.08 + randomUnit(seed + 2) * 0.012,
            offsetX: 0,
            offsetY: -2,
            anchorX: 0.5,
            anchorY: 0.88,
            kind: "umbrella-chair",
          });

          occupiedTiles.add(tileKey(cell.x, cell.y));
        }
      });

      return umbrellaChairs;
    }

    function makePoolEastEdgeDecorations() {
      const decorations = [];
      const swimSafePools = pools
        .map((pool, poolIndex) => ({ pool, poolIndex }))
        .sort((a, b) => {
          const aScore = variation(a.pool.x + a.pool.width * 11, a.pool.y + a.pool.height * 17);
          const bScore = variation(b.pool.x + b.pool.width * 11, b.pool.y + b.pool.height * 17);
          return aScore - bScore;
        })
        .slice(0, 2)
        .map(({ poolIndex }) => poolIndex);
      const duckSpots = pools
        .flatMap((pool, poolIndex) => {
          const spots = [];

          for (let offsetY = 1; offsetY < pool.height - 1; offsetY += 1) {
            for (let offsetX = 1; offsetX < pool.width - 1; offsetX += 1) {
              spots.push({
                poolIndex,
                x: pool.x + offsetX,
                y: pool.y + offsetY,
                offsetX,
                offsetY,
              });
            }
          }

          return spots;
        })
        .sort((a, b) => {
          const aScore = variation(a.x + a.poolIndex * 37, a.y + 149);
          const bScore = variation(b.x + b.poolIndex * 37, b.y + 149);
          return aScore - bScore;
        })
        .slice(0, 4);

      pools.forEach((pool, poolIndex) => {
        const poolCenterY = pool.y + (pool.height - 1) / 2;
        const safeX = pool.x + (pool.width - 1) / 2;
        const safeY = pool.y + (pool.height - 1) / 2;
        const candidates = [];

        if (swimSafePools.includes(poolIndex)) {
          decorations.push({
            id: tile.swimSafe,
            x: safeX,
            y: safeY,
            scale: 0.045 + randomUnit(poolIndex * 97 + 5) * 0.006,
            offsetX: 0,
            offsetY: 8,
            anchorX: 0.5,
            anchorY: 0.5,
            kind: "pool-decoration",
          });
        }

        duckSpots
          .filter((spot) => spot.poolIndex === poolIndex)
          .forEach((spot) => {
            const seed = spot.x * 349 + spot.y * 599 + poolIndex * 53;
            decorations.push({
              id: tile.duck,
              x: spot.x,
              y: spot.y,
              scale: 0.033 + randomUnit(seed + 2) * 0.005,
              offsetX: (randomUnit(seed + 7) - 0.5) * 12,
              offsetY: 8 + (randomUnit(seed + 13) - 0.5) * 6,
              anchorX: 0.5,
              anchorY: 0.5,
              kind: "pool-decoration",
            });
          });

        for (let offsetY = 0; offsetY < pool.height; offsetY += 1) {
          const x = pool.x + pool.width;
          const y = pool.y + offsetY;

          if (canPlaceChair(x, y) && !occupiedTiles.has(tileKey(x, y))) {
            candidates.push({ x, y, distance: Math.abs(y - poolCenterY) });
          }
        }

        const sortedCandidates = candidates.sort((a, b) => a.distance - b.distance || a.y - b.y);
        const statueEdgeCell = sortedCandidates.find((cell) =>
          canPlaceChair(cell.x + 1, cell.y) && !occupiedTiles.has(tileKey(cell.x + 1, cell.y))
        );

        if (statueEdgeCell) {
          const seed = statueEdgeCell.x * 457 + statueEdgeCell.y * 683 + poolIndex * 41;
          const statueX = statueEdgeCell.x + 1;
          decorations.push({
            id: tile.greeceStatue,
            x: statueX,
            y: statueEdgeCell.y,
            scale: 0.19 + randomUnit(seed + 2) * 0.02,
            offsetX: 14 + (randomUnit(seed + 7) - 0.5) * 5,
            offsetY: 8,
            anchorX: 0.5,
            anchorY: 0.9,
            kind: "statue",
          });

          occupiedTiles.add(tileKey(statueX, statueEdgeCell.y));
        }

        const chairCell = sortedCandidates.find((cell) => !occupiedTiles.has(tileKey(cell.x, cell.y)));
        if (chairCell) {
          const seed = chairCell.x * 457 + chairCell.y * 683 + poolIndex * 41 + 19;
          decorations.push({
            id: tile.chair3,
            x: chairCell.x,
            y: chairCell.y,
            scale: 0.068 + randomUnit(seed + 2) * 0.008,
            offsetX: 10 + (randomUnit(seed + 7) - 0.5) * 5,
            offsetY: -2,
            anchorX: 0.5,
            anchorY: 0.86,
            kind: "chair",
          });

          occupiedTiles.add(tileKey(chairCell.x, chairCell.y));
        }
      });

      return decorations;
    }

    function makeChairs() {
      const chairs = [];

      getBlocks().forEach((block, blockIndex) => {
        if (variation(blockIndex + 29, block.length) > 58) {
          return;
        }

        const northCandidates = block
          .filter(({ x, y }) => canPlaceEdgeDecoration(x, y) && !occupiedTiles.has(tileKey(x, y)) && isNorthEdgeGround(x, y))
          .sort((a, b) => variation(a.x + blockIndex * 23, a.y + 59) - variation(b.x + blockIndex * 23, b.y + 59));
        const southCandidates = block
          .filter(({ x, y }) => canPlaceEdgeDecoration(x, y) && !occupiedTiles.has(tileKey(x, y)) && isSouthSideGround(x, y))
          .sort((a, b) => variation(a.x + blockIndex * 31, a.y + 67) - variation(b.x + blockIndex * 31, b.y + 67));
        const targetNorthCount = Math.min(northCandidates.length, 1);
        const targetSouthCount = Math.min(southCandidates.length, 1);

        for (let index = 0; index < targetNorthCount + targetSouthCount; index += 1) {
          const useNorthChair = index < targetNorthCount;
          const cell = useNorthChair ? northCandidates[index] : southCandidates[index - targetNorthCount];
          const seed = cell.x * 397 + cell.y * 677 + blockIndex * 31;

          chairs.push({
            id: useNorthChair ? tile.chair2 : tile.chair,
            x: cell.x,
            y: cell.y,
            scale: (useNorthChair ? 0.08 : 0.145) + randomUnit(seed + 2) * 0.02,
            offsetX: (randomUnit(seed + 7) - 0.5) * 12,
            offsetY: (randomUnit(seed + 13) - 0.5) * 8,
            anchorX: 0.5,
            anchorY: 0.86,
            kind: "chair",
          });

          occupiedTiles.add(tileKey(cell.x, cell.y));
        }
      });

      return chairs;
    }

    function makePlanters(structures) {
      const planters = [];

      getBlocks().forEach((block, blockIndex) => {
        const candidates = block
          .filter(({ x, y }) =>
            canPlacePlanter(x, y) &&
            !occupiedTiles.has(tileKey(x, y)) &&
            (
              isNextToPool(x, y) ||
              isNearStructure(x, y, structures, (object) => object.kind === "coffee-shop")
            )
          )
          .sort((a, b) => variation(a.x + blockIndex * 3, a.y + 17) - variation(b.x + blockIndex * 3, b.y + 17));
        const targetCount = Math.min(candidates.length, 2 + (variation(blockIndex + 5, block.length) % 2));

        for (let index = 0; index < targetCount; index += 1) {
          const cell = candidates[index];
          const seed = cell.x * 313 + cell.y * 571 + blockIndex * 29;
          const usePinkPlanter = randomUnit(seed + 19) > 0.52;
          planters.push({
            id: usePinkPlanter ? tile.pinkPlanter : tile.planter,
            x: cell.x,
            y: cell.y,
            scale: (usePinkPlanter ? 0.08 : 0.13) + randomUnit(seed + 2) * 0.025,
            offsetX: (randomUnit(seed + 7) - 0.5) * 14,
            offsetY: (randomUnit(seed + 13) - 0.5) * 8,
            anchorX: 0.5,
            anchorY: 0.86,
            kind: "planter",
          });

          occupiedTiles.add(tileKey(cell.x, cell.y));
        }
      });

      return planters;
    }

    return {
      createRoadsideDecorations() {
        return [
          ...makeManholes(),
          ...makeTrafficLights(),
          ...makeStreetLights(),
        ];
      },
      createBlockDecorations(structures) {
        return [
          ...makeFenses(structures),
          ...makeUmbrellaChairs(),
          ...makePoolEastEdgeDecorations(),
          ...makeTrees(),
          ...makeChairs(),
          ...makePlanters(structures),
        ];
      },
    };
  }

  window.CityMapDecorations = {
    createDecorationObjects,
  };
})();
