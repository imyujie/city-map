(function () {
  "use strict";

  const { variation, randomUnit, tileKey } = window.CityGameMath;

  function createStructureObjects({ mapSize, tile, ground, blockTools, occupiedTiles }) {
    const {
      hasRoad,
      isMajorIntersectionCenter,
      getBlockBounds,
      getBlocks,
      canPlaceStructure,
      canPlaceStructureArea,
      occupyArea,
      hasNearbyObject,
    } = blockTools;

    function getCornerLotCandidates(width, height) {
      const candidates = [];

      for (let y = 0; y < mapSize; y += 1) {
        for (let x = 0; x < mapSize; x += 1) {
          if (!isMajorIntersectionCenter(x, y)) {
            continue;
          }

          [
            { x: x - width - 2, y: y - height - 2, offsetX: -8, offsetY: -8, flipX: false },
            { x: x + 3, y: y - height - 2, offsetX: 8, offsetY: -8, flipX: true },
            { x: x - width - 2, y: y + 3, offsetX: -8, offsetY: 8, flipX: false },
            { x: x + 3, y: y + 3, offsetX: 8, offsetY: 8, flipX: true },
          ].forEach((candidate) => {
            if (canPlaceStructureArea(candidate.x, candidate.y, width, height, occupiedTiles, 2)) {
              candidates.push(candidate);
            }
          });
        }
      }

      return candidates;
    }

    function makeStatues() {
      const statues = [];
      const blocks = getBlocks()
        .map((cells, index) => ({ cells, index, bounds: getBlockBounds(cells) }))
        .sort((a, b) => b.cells.length - a.cells.length);

      blocks.forEach((block, blockOrder) => {
        if (statues.length >= 3 || blockOrder % 5 !== 1) {
          return;
        }

        const candidates = block.cells
          .filter(({ x, y }) => {
            const groundTile = ground[y][x];
            return (
              groundTile.kind === "grass" &&
              !occupiedTiles.has(tileKey(x, y)) &&
              !hasRoad(x + 1, y) &&
              !hasRoad(x - 1, y) &&
              !hasRoad(x, y + 1) &&
              !hasRoad(x, y - 1)
            );
          })
          .sort((a, b) => variation(a.x + block.index * 67, a.y + 191) - variation(b.x + block.index * 67, b.y + 191));

        const candidate = candidates[0];
        if (!candidate) {
          return;
        }

        const seed = candidate.x * 881 + candidate.y * 991;
        statues.push({
          id: tile.statue,
          x: candidate.x,
          y: candidate.y,
          scale: 0.13 + randomUnit(seed + 3) * 0.018,
          offsetX: (randomUnit(seed + 7) - 0.5) * 8,
          offsetY: -4,
          anchorX: 0.5,
          anchorY: 0.9,
          kind: "statue",
        });
        occupiedTiles.add(tileKey(candidate.x, candidate.y));
      });

      return statues;
    }

    function makeSpecialStructures() {
      const structures = [];
      const blocks = getBlocks()
        .map((cells, index) => ({ cells, index, bounds: getBlockBounds(cells) }))
        .sort((a, b) => b.cells.length - a.cells.length);

      const stadiumBlock = blocks[0];
      if (stadiumBlock) {
        const width = 7;
        const height = 6;
        const x = Math.floor((stadiumBlock.bounds.minX + stadiumBlock.bounds.maxX - width + 1) / 2);
        const y = Math.floor((stadiumBlock.bounds.minY + stadiumBlock.bounds.maxY - height + 1) / 2);

        if (canPlaceStructureArea(x, y, width, height, occupiedTiles, 3)) {
          structures.push({
            id: tile.stadium,
            x: x + (width - 1) / 2,
            y: y + (height - 1) / 2,
            scale: 0.58,
            offsetX: 0,
            offsetY: -8,
            anchorX: 0.5,
            anchorY: 0.9,
            footprintX: x,
            footprintY: y,
            footprintWidth: width,
            footprintHeight: height,
            depthX: x + (width - 1) / 2,
            depthY: y + height - 1,
            depthOffset: 0.22,
            kind: "stadium",
          });
          structures.push({
            id: tile.flags,
            x: x + width + 1,
            y: y + Math.floor(height / 2),
            scale: 0.18,
            offsetX: 2,
            offsetY: -6,
            anchorX: 0.5,
            anchorY: 0.9,
            footprintX: x + width + 1,
            footprintY: y,
            footprintWidth: 1,
            footprintHeight: height,
            kind: "flags",
          });
          occupyArea(occupiedTiles, x, y, width, height, 3);
        }
      }

      const gasWidth = 3;
      const gasHeight = 2;
      const gasCandidates = getCornerLotCandidates(gasWidth, gasHeight)
        .sort((a, b) => variation(a.x * 43, a.y + 131) - variation(b.x * 43, b.y + 131));

      for (const candidate of gasCandidates) {
        if (structures.filter((structure) => structure.kind === "gas").length >= 2) {
          break;
        }

        if (!canPlaceStructureArea(candidate.x, candidate.y, gasWidth, gasHeight, occupiedTiles, 2)) {
          continue;
        }

        const seed = candidate.x * 587 + candidate.y * 719;
        structures.push({
          id: tile.gas,
          x: candidate.x + (gasWidth - 1) / 2,
          y: candidate.y + (gasHeight - 1) / 2,
          scale: 0.24,
          offsetX: candidate.offsetX + (randomUnit(seed + 5) - 0.5) * 5,
          offsetY: candidate.offsetY - 4,
          anchorX: 0.5,
          anchorY: 0.88,
          footprintX: candidate.x,
          footprintY: candidate.y,
          footprintWidth: gasWidth,
          footprintHeight: gasHeight,
          flipX: candidate.flipX,
          kind: "gas",
        });
        occupyArea(occupiedTiles, candidate.x, candidate.y, gasWidth, gasHeight, 2);
      }

      const coffeeCandidates = blocks
        .flatMap((block) =>
          block.cells
            .filter(({ x, y }) => canPlaceStructure(x, y) && !occupiedTiles.has(tileKey(x, y)))
            .map((cell) => ({ ...cell, blockIndex: block.index })),
        )
        .sort((a, b) => variation(a.x + a.blockIndex * 61, a.y + 157) - variation(b.x + b.blockIndex * 61, b.y + 157));

      for (const candidate of coffeeCandidates) {
        if (structures.filter((structure) => structure.kind === "coffee-shop").length >= 2) {
          break;
        }

        const width = 2;
        const height = 2;
        if (!canPlaceStructureArea(candidate.x, candidate.y, width, height, occupiedTiles, 2)) {
          continue;
        }

        const seed = candidate.x * 733 + candidate.y * 977;
        structures.push({
          id: tile.coffeeShop,
          x: candidate.x + (width - 1) / 2,
          y: candidate.y + (height - 1) / 2,
          scale: 0.23 + randomUnit(seed + 3) * 0.025,
          offsetX: (randomUnit(seed + 11) - 0.5) * 8,
          offsetY: -4,
          anchorX: 0.5,
          anchorY: 0.91,
          footprintX: candidate.x,
          footprintY: candidate.y,
          footprintWidth: width,
          footprintHeight: height,
          kind: "coffee-shop",
        });
        occupyArea(occupiedTiles, candidate.x, candidate.y, width, height, 2);
      }

      return structures;
    }

    function makeStructures() {
      const structures = [];
      const structureTypes = [
        {
          id: tile.building5 || "building-5.png",
          chance: 0.008,
          scale: 0.32,
          scaleRange: 0.03,
          anchorY: 0.96,
          footprintWidth: 4,
          footprintHeight: 4,
          spacingX: 6,
          spacingY: 6,
          spacingBuffer: 3,
          minCount: 2,
          kind: "building",
        },
        {
          id: tile.building1,
          chance: 0.012,
          scale: 0.74,
          scaleRange: 0.065,
          anchorY: 0.94,
          footprintWidth: 3,
          footprintHeight: 3,
          spacingX: 5,
          spacingY: 5,
          spacingBuffer: 3,
          minCount: 1,
          kind: "building",
        },
        {
          id: tile.building3,
          chance: 0.01,
          scale: 0.56,
          scaleRange: 0.055,
          anchorY: 0.94,
          footprintWidth: 3,
          footprintHeight: 3,
          spacingX: 5,
          spacingY: 5,
          spacingBuffer: 3,
          minCount: 1,
          kind: "building",
        },
        {
          id: tile.building4,
          chance: 0.01,
          scale: 0.43,
          scaleRange: 0.04,
          anchorY: 0.94,
          footprintWidth: 4,
          footprintHeight: 4,
          spacingX: 6,
          spacingY: 6,
          spacingBuffer: 3,
          minCount: 1,
          kind: "building",
        },
        {
          id: tile.fountain,
          chance: 0.03,
          scale: 0.18,
          scaleRange: 0.018,
          anchorY: 0.91,
          footprintWidth: 2,
          footprintHeight: 2,
          spacingX: 4,
          spacingY: 4,
          spacingBuffer: 2,
          minCount: 1,
          kind: "building",
        },
        {
          id: tile.booth,
          chance: 0.018,
          scale: 0.16,
          scaleRange: 0.018,
          anchorY: 0.9,
          footprintWidth: 2,
          footprintHeight: 2,
          spacingX: 4,
          spacingY: 4,
          spacingBuffer: 2,
          minCount: 1,
          kind: "building",
        },
        {
          id: tile.supermarket,
          chance: 0.04,
          scale: 0.36,
          scaleRange: 0.03,
          anchorY: 0.91,
          footprintWidth: 4,
          footprintHeight: 3,
          spacingX: 6,
          spacingY: 5,
          spacingBuffer: 3,
          minCount: 2,
          kind: "building",
        },
        {
          id: tile.gym1,
          chance: 0.02,
          scale: 0.32,
          scaleRange: 0.028,
          anchorY: 0.91,
          footprintWidth: 3,
          footprintHeight: 3,
          spacingX: 5,
          spacingY: 5,
          spacingBuffer: 3,
          minCount: 1,
          kind: "building",
        },
        {
          id: tile.ferrisWheel,
          chance: 0.008,
          scale: 0.28,
          scaleRange: 0.02,
          anchorY: 0.9,
          footprintWidth: 3,
          footprintHeight: 3,
          spacingX: 5,
          spacingY: 5,
          spacingBuffer: 2,
          minCount: 1,
          kind: "ferris-wheel",
        },
        {
          id: tile.rollerCoaster,
          chance: 0.008,
          scale: 0.46,
          scaleRange: 0.035,
          anchorY: 0.9,
          footprintWidth: 5,
          footprintHeight: 4,
          spacingX: 7,
          spacingY: 6,
          spacingBuffer: 3,
          minCount: 1,
          kind: "roller-coaster",
        },
        {
          id: tile.house1,
          chance: 0.018,
          scale: 0.25,
          scaleRange: 0.035,
          anchorY: 0.94,
          footprintWidth: 2,
          footprintHeight: 2,
          spacingX: 3,
          spacingY: 3,
          spacingBuffer: 1,
          kind: "house",
        },
      ];

      function countStructuresById(id) {
        return structures.filter((structure) => structure.id === id).length;
      }

      function makeStructure(type, x, y, seed) {
        return {
          id: type.id,
          x: x + (type.footprintWidth - 1) / 2,
          y: y + (type.footprintHeight - 1) / 2,
          scale: type.scale + randomUnit(seed + 3) * type.scaleRange,
          offsetX: (randomUnit(seed + 11) - 0.5) * 12,
          offsetY: (randomUnit(seed + 17) - 0.5) * 8,
          anchorX: 0.5,
          anchorY: type.anchorY,
          footprintX: x,
          footprintY: y,
          footprintWidth: type.footprintWidth,
          footprintHeight: type.footprintHeight,
          kind: type.kind,
        };
      }

      function placeStructure(type, x, y, seed) {
        if (!canPlaceStructure(x, y) || occupiedTiles.has(tileKey(x, y))) {
          return false;
        }

        if (!canPlaceStructureArea(x, y, type.footprintWidth, type.footprintHeight, occupiedTiles, type.spacingBuffer)) {
          return false;
        }

        if (hasNearbyObject(structures, x, y, type.spacingX, type.spacingY)) {
          return false;
        }

        structures.push(makeStructure(type, x, y, seed));
        occupyArea(occupiedTiles, x, y, type.footprintWidth, type.footprintHeight, type.spacingBuffer);
        return true;
      }

      function getGuaranteedCandidates(type, typeIndex) {
        const centerX = mapSize / 2 - type.footprintWidth / 2;
        const centerY = mapSize / 2 - type.footprintHeight / 2;
        const candidates = [];

        for (let y = 1; y < mapSize - 1; y += 1) {
          for (let x = 1; x < mapSize - 1; x += 1) {
            candidates.push({
              x,
              y,
              seed: x * 421 + y * 733 + typeIndex * 97,
              distance: Math.abs(x - centerX) + Math.abs(y - centerY),
              jitter: variation(x + typeIndex * 83, y + 211),
            });
          }
        }

        return candidates.sort((a, b) => a.distance - b.distance || a.jitter - b.jitter);
      }

      function placeEntertainmentNearRollerCoasters() {
        const entertainmentType = {
          id: tile.entertainment1 || "entertainment-1.png",
          scale: 0.2,
          scaleRange: 0.018,
          anchorY: 0.9,
          footprintWidth: 2,
          footprintHeight: 2,
          spacingBuffer: 2,
          kind: "building",
        };
        const rollerCoasters = structures.filter((structure) => structure.kind === "roller-coaster");

        function overlapsStructureFootprint(x, y, width, height, ignoredStructure) {
          return structures.some((structure) => {
            if (structure === ignoredStructure || !structure.footprintWidth || !structure.footprintHeight) {
              return false;
            }

            return (
              x < structure.footprintX + structure.footprintWidth &&
              x + width > structure.footprintX &&
              y < structure.footprintY + structure.footprintHeight &&
              y + height > structure.footprintY
            );
          });
        }

        rollerCoasters.forEach((rollerCoaster, rollerIndex) => {
          const candidates = [
            { x: rollerCoaster.footprintX + rollerCoaster.footprintWidth + 1, y: rollerCoaster.footprintY + 1 },
            { x: rollerCoaster.footprintX + 1, y: rollerCoaster.footprintY + rollerCoaster.footprintHeight + 1 },
            { x: rollerCoaster.footprintX - entertainmentType.footprintWidth - 1, y: rollerCoaster.footprintY + 1 },
            { x: rollerCoaster.footprintX + 1, y: rollerCoaster.footprintY - entertainmentType.footprintHeight - 1 },
            { x: rollerCoaster.footprintX + rollerCoaster.footprintWidth + 1, y: rollerCoaster.footprintY + rollerCoaster.footprintHeight - entertainmentType.footprintHeight },
            { x: rollerCoaster.footprintX - entertainmentType.footprintWidth - 1, y: rollerCoaster.footprintY + rollerCoaster.footprintHeight - entertainmentType.footprintHeight },
          ].sort((a, b) =>
            variation(a.x + rollerIndex * 43, a.y + 197) - variation(b.x + rollerIndex * 43, b.y + 197)
          );

          const placement = candidates.find(({ x, y }) =>
            canPlaceStructure(x, y) &&
            canPlaceStructureArea(
              x,
              y,
              entertainmentType.footprintWidth,
              entertainmentType.footprintHeight,
              new Set(),
              1,
            ) &&
            !overlapsStructureFootprint(
              x,
              y,
              entertainmentType.footprintWidth,
              entertainmentType.footprintHeight,
              rollerCoaster,
            )
          );

          if (!placement) {
            return;
          }

          const seed = placement.x * 421 + placement.y * 733 + rollerIndex * 97;
          structures.push(makeStructure(entertainmentType, placement.x, placement.y, seed));
          occupyArea(
            occupiedTiles,
            placement.x,
            placement.y,
            entertainmentType.footprintWidth,
            entertainmentType.footprintHeight,
            entertainmentType.spacingBuffer,
          );
        });
      }

      structureTypes.forEach((type, typeIndex) => {
        while (type.minCount && countStructuresById(type.id) < type.minCount) {
          const placed = getGuaranteedCandidates(type, typeIndex)
            .some((candidate) => placeStructure(type, candidate.x, candidate.y, candidate.seed));

          if (!placed) {
            break;
          }
        }
      });

      for (let y = 1; y < mapSize - 1; y += 1) {
        for (let x = 1; x < mapSize - 1; x += 1) {
          if (!canPlaceStructure(x, y) || occupiedTiles.has(tileKey(x, y))) {
            continue;
          }

          const seed = x * 421 + y * 733;
          const type = structureTypes[variation(x + 13, y + 29) % structureTypes.length];

          if (!canPlaceStructureArea(x, y, type.footprintWidth, type.footprintHeight, occupiedTiles, type.spacingBuffer)) {
            continue;
          }

          if (randomUnit(seed) > type.chance) {
            continue;
          }

          placeStructure(type, x, y, seed);
        }
      }

      placeEntertainmentNearRollerCoasters();

      return structures;
    }

    return [
      ...makeSpecialStructures(),
      ...makeStatues(),
      ...makeStructures(),
    ];
  }

  window.CityMapStructures = {
    createStructureObjects,
  };
})();
