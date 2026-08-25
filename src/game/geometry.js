(function () {
  "use strict";

  const { clamp } = window.CityGameMath;

  function createGeometry(mapData) {
    const { columns, rows, tileWidth, tileHeight } = mapData.world;
    const halfTileWidth = tileWidth / 2;
    const halfTileHeight = tileHeight / 2;
    const mapBounds = {
      minX: -(rows - 1) * halfTileWidth - halfTileWidth,
      maxX: (columns - 1) * halfTileWidth + halfTileWidth,
      minY: 0,
      maxY: (columns + rows - 2) * halfTileHeight + tileHeight,
    };

    function tileTopPoint(x, y) {
      return {
        x: (x - y) * halfTileWidth,
        y: (x + y) * halfTileHeight,
      };
    }

    function tileCenterPoint(x, y) {
      const point = tileTopPoint(x, y);
      return {
        x: point.x,
        y: point.y + halfTileHeight,
      };
    }

    function getTileAt(x, y) {
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);

      if (tileX < 0 || tileY < 0 || tileX >= columns || tileY >= rows) {
        return null;
      }

      return { x: tileX, y: tileY };
    }

    function screenToWorld(view, x, y) {
      return {
        x: (x - view.panX) / view.zoom,
        y: (y - view.panY) / view.zoom,
      };
    }

    function worldToTile(worldX, worldY) {
      const tileX = Math.floor((worldY / halfTileHeight + worldX / halfTileWidth) / 2);
      const tileY = Math.floor((worldY / halfTileHeight - worldX / halfTileWidth) / 2);

      if (tileX < 0 || tileY < 0 || tileX >= columns || tileY >= rows) {
        return null;
      }

      return { x: tileX, y: tileY };
    }

    function isTileVisible(view, topX, topY, bleed = 6) {
      const left = topX - halfTileWidth - bleed;
      const right = topX + halfTileWidth + bleed;
      const top = topY - bleed;
      const bottom = topY + tileHeight + bleed;

      return !(
        right * view.zoom + view.panX < 0 ||
        left * view.zoom + view.panX > view.viewportWidth ||
        bottom * view.zoom + view.panY < 0 ||
        top * view.zoom + view.panY > view.viewportHeight
      );
    }

    function isWorldRectVisible(view, x, y, width, height, bleed = 0) {
      return !(
        (x + width + bleed) * view.zoom + view.panX < 0 ||
        (x - bleed) * view.zoom + view.panX > view.viewportWidth ||
        (y + height + bleed) * view.zoom + view.panY < 0 ||
        (y - bleed) * view.zoom + view.panY > view.viewportHeight
      );
    }

    function clampToBounds(view, x, y, width, height) {
      return {
        left: clamp(x, mapBounds.minX, mapBounds.minX + width),
        top: clamp(y, mapBounds.minY, mapBounds.minY + height),
      };
    }

    return {
      columns,
      rows,
      tileWidth,
      tileHeight,
      halfTileWidth,
      halfTileHeight,
      mapBounds,
      tileTopPoint,
      tileCenterPoint,
      getTileAt,
      screenToWorld,
      worldToTile,
      isTileVisible,
      isWorldRectVisible,
      clampToBounds,
    };
  }

  window.CityGeometry = {
    createGeometry,
  };
})();
