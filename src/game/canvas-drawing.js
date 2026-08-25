(function () {
  "use strict";

  function createCanvasDrawing({ mapData, geometry, view }) {
    const { tileSourceSize, tileHeight } = mapData.world;
    const { columns, rows, halfTileWidth, halfTileHeight, tileTopPoint } = geometry;

    function drawIsometricImage(ctx, image, topX, topY, bleed = 0) {
      const sourceOffset = -bleed;
      const sourceSize = tileSourceSize + bleed * 2;

      ctx.save();
      ctx.transform(
        halfTileWidth / tileSourceSize,
        halfTileHeight / tileSourceSize,
        -halfTileWidth / tileSourceSize,
        halfTileHeight / tileSourceSize,
        topX,
        topY,
      );
      ctx.drawImage(image, sourceOffset, sourceOffset, sourceSize, sourceSize);
      ctx.restore();
    }

    function drawDiamond(ctx, topX, topY, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(topX + halfTileWidth, topY + halfTileHeight);
      ctx.lineTo(topX, topY + tileHeight);
      ctx.lineTo(topX - halfTileWidth, topY + halfTileHeight);
      ctx.closePath();

      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }

      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1 / view.zoom, 1.25);
        ctx.stroke();
      }
    }

    function drawDirectionLabels(ctx) {
      const northEdge = tileTopPoint(Math.floor((columns - 1) / 2), 0);
      const eastEdge = tileTopPoint(columns - 1, Math.floor((rows - 1) / 2));
      const southEdge = tileTopPoint(Math.floor((columns - 1) / 2), rows - 1);
      const westEdge = tileTopPoint(0, Math.floor((rows - 1) / 2));
      const labels = [
        { text: "\u5317", x: northEdge.x + 34, y: northEdge.y - 46 },
        { text: "\u4e1c", x: eastEdge.x + 78, y: eastEdge.y + 8 },
        { text: "\u5357", x: southEdge.x - 34, y: southEdge.y + tileHeight + 46 },
        { text: "\u897f", x: westEdge.x - 78, y: westEdge.y + 8 },
      ];

      ctx.save();
      ctx.font = "800 58px Inter, ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";

      labels.forEach((label) => {
        ctx.lineWidth = 10;
        ctx.strokeStyle = "rgba(8, 12, 11, 0.72)";
        ctx.strokeText(label.text, label.x, label.y);
        ctx.fillStyle = "rgba(250, 255, 251, 0.96)";
        ctx.fillText(label.text, label.x, label.y);
      });

      ctx.restore();
    }

    function drawVignette(ctx) {
      ctx.save();
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      const gradient = ctx.createLinearGradient(0, 0, 0, view.viewportHeight);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.08)");
      gradient.addColorStop(0.64, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.22)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, view.viewportWidth, view.viewportHeight);
      ctx.restore();
    }

    return {
      drawDiamond,
      drawDirectionLabels,
      drawIsometricImage,
      drawVignette,
    };
  }

  window.CityCanvasDrawing = {
    createCanvasDrawing,
  };
})();
