(function () {
  "use strict";

  const { variation } = window.CityGameMath;

  function createRoadMap(mapSize, tile) {
    const roads = Array.from({ length: mapSize }, () =>
      Array.from({ length: mapSize }, () => ({
        road: false,
        horizontal: false,
        vertical: false,
        horizontalCenter: false,
        verticalCenter: false,
        horizontalCenterY: null,
        verticalCenterX: null,
        horizontalOffset: null,
        verticalOffset: null,
        major: false,
      })),
    );

    function clampToMap(value) {
      return Math.max(0, Math.min(mapSize - 1, value));
    }

    function markRoad(x, y, axis, major, offset, centerCoordinate) {
      if (x < 0 || y < 0 || x >= mapSize || y >= mapSize) {
        return;
      }

      const cell = roads[y][x];
      cell.road = true;
      cell.major = cell.major || major;
      if (axis === "horizontal") {
        cell.horizontal = true;
        cell.horizontalCenter = cell.horizontalCenter || offset === 0;
        cell.horizontalCenterY = centerCoordinate;
        cell.horizontalOffset = offset;
      }
      if (axis === "vertical") {
        cell.vertical = true;
        cell.verticalCenter = cell.verticalCenter || offset === 0;
        cell.verticalCenterX = centerCoordinate;
        cell.verticalOffset = offset;
      }
    }

    function addHorizontalRoad(y, fromX, toX, major) {
      const start = clampToMap(Math.min(fromX, toX));
      const end = clampToMap(Math.max(fromX, toX));
      for (let x = start; x <= end; x += 1) {
        for (let offset = -1; offset <= 1; offset += 1) {
          markRoad(x, y + offset, "horizontal", major, offset, y);
        }
      }
    }

    function addVerticalRoad(x, fromY, toY, major) {
      const start = clampToMap(Math.min(fromY, toY));
      const end = clampToMap(Math.max(fromY, toY));
      for (let y = start; y <= end; y += 1) {
        for (let offset = -1; offset <= 1; offset += 1) {
          markRoad(x + offset, y, "vertical", major, offset, x);
        }
      }
    }

    function makeRoadCoordinates(baseCoordinates) {
      const coordinates = new Set();

      for (let offset = 0; offset < mapSize; offset += 60) {
        baseCoordinates.forEach((coordinate) => {
          const nextCoordinate = coordinate + offset;

          if (nextCoordinate > 1 && nextCoordinate < mapSize - 2) {
            coordinates.add(nextCoordinate);
          }
        });
      }

      return Array.from(coordinates).sort((a, b) => a - b);
    }

    const roadPaths = [
      ...makeRoadCoordinates([9, 25, 43, 55]).map((x) => ({
        axis: "vertical",
        x,
        from: 0,
        to: mapSize - 1,
        major: true,
      })),
      ...makeRoadCoordinates([12, 31, 49]).map((y) => ({
        axis: "horizontal",
        y,
        from: 0,
        to: mapSize - 1,
        major: true,
      })),
    ];

    roadPaths.forEach((path) => {
      if (path.axis === "vertical") {
        addVerticalRoad(path.x, path.from, path.to, path.major);
      } else {
        addHorizontalRoad(path.y, path.from, path.to, path.major);
      }
    });

    function hasRoad(x, y) {
      return Boolean(roads[y] && roads[y][x] && roads[y][x].road);
    }

    function getRoad(x, y) {
      return roads[y] && roads[y][x] ? roads[y][x] : null;
    }

    function isMajorIntersectionCenter(x, y) {
      const cell = getRoad(x, y);
      return Boolean(cell && cell.horizontalCenter && cell.verticalCenter && cell.major);
    }

    function crosswalkIndex(x, y, axis, cell) {
      if (axis === "horizontal") {
        const centerY = cell.horizontalCenterY;
        const offset = y - centerY;
        if (Math.abs(offset) > 1) {
          return 0;
        }

        return isMajorIntersectionCenter(x - 3, centerY)
          ? offset + 2
          : 0;
      }

      const centerX = cell.verticalCenterX;
      const offset = x - centerX;
      if (Math.abs(offset) > 1) {
        return 0;
      }

      return isMajorIntersectionCenter(centerX, y - 3)
        ? offset + 2
        : 0;
    }

    function hasDashSegment(x, y, axis, cell) {
      if ((axis === "horizontal" && !cell.horizontalCenter) || (axis === "vertical" && !cell.verticalCenter)) {
        return false;
      }

      const alongRoad = axis === "horizontal" ? x : y;
      return alongRoad % 2 === 0;
    }

    function getCrosswalkPart(axis, crosswalkIndexValue) {
      const part = axis === "horizontal" ? crosswalkIndexValue : 4 - crosswalkIndexValue;
      return {
        part,
        id: [tile.road1, tile.road2, tile.road3][part - 1],
      };
    }

    function makeRoadTile(x, y, cell) {
      if (cell.horizontal && cell.vertical) {
        return { id: tile.roadPlain, rotation: 0, kind: "intersection" };
      }

      const axis = cell.horizontal ? "horizontal" : "vertical";
      const rotation = axis === "horizontal" ? 0 : 1;
      const crosswalkPart = crosswalkIndex(x, y, axis, cell);

      if (crosswalkPart > 0) {
        const crosswalk = getCrosswalkPart(axis, crosswalkPart);
        return {
          id: crosswalk.id,
          rotation,
          kind: `crosswalk-${crosswalk.part}`,
        };
      }

      if (hasDashSegment(x, y, axis, cell)) {
        return {
          id: tile.roadDash,
          rotation,
          kind: "centerline-dash",
        };
      }

      if (cell.horizontal) {
        return {
          id: tile.roadPlain,
          rotation,
          kind: cell.horizontalCenter ? "road-center" : "road-lane",
        };
      }

      return {
        id: tile.roadPlain,
        rotation,
        kind: cell.verticalCenter ? "road-center" : "road-lane",
      };
    }

    function hasRoadOrMapEdge(x, y) {
      return x < 0 || y < 0 || x >= mapSize || y >= mapSize || hasRoad(x, y);
    }

    function makeBlockTile(x, y) {
      const north = hasRoadOrMapEdge(x, y - 1);
      const east = hasRoadOrMapEdge(x + 1, y);
      const south = hasRoadOrMapEdge(x, y + 1);
      const west = hasRoadOrMapEdge(x - 1, y);

      if (north && west) {
        return { id: tile.blockCornerNw, rotation: 0, kind: "block-corner-nw" };
      }
      if (north && east) {
        return { id: tile.blockCornerWs, rotation: 0, flipX: true, kind: "block-corner-ne" };
      }
      if (south && east) {
        return { id: tile.blockCornerSe, rotation: 2, kind: "block-corner-se" };
      }
      if (south && west) {
        return { id: tile.blockCornerWs, rotation: 3, kind: "block-corner-ws" };
      }
      if (north) {
        return { id: tile.blockEdgeNw, rotation: 0, kind: "block-edge-nw" };
      }
      if (east) {
        return { id: tile.blockEdgeSe, rotation: 1, kind: "block-edge-se" };
      }
      if (south) {
        return { id: tile.blockEdgeSe, rotation: 2, kind: "block-edge-se" };
      }
      if (west) {
        return { id: tile.blockEdgeNw, rotation: 3, kind: "block-edge-nw" };
      }

      return {
        id: tile.blockInner,
        rotation: variation(y + 11, x + 5) % 4,
        kind: "block-inner",
      };
    }

    function makeGround() {
      return Array.from({ length: mapSize }, (_, y) =>
        Array.from({ length: mapSize }, (_, x) => {
          const cell = roads[y][x];
          return cell.road ? makeRoadTile(x, y, cell) : makeBlockTile(x, y);
        }),
      );
    }

    return {
      roads,
      roadPaths,
      hasRoad,
      isMajorIntersectionCenter,
      makeGround,
    };
  }

  window.CityMapRoads = {
    createRoadMap,
  };
})();
