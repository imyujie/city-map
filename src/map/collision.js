(function () {
  "use strict";

  function makeCollision(mapSize, objects) {
    const blocked = Array.from({ length: mapSize }, () => Array(mapSize).fill(false));

    objects.forEach((object) => {
      if (
        object.kind === "building" ||
        object.kind === "house" ||
        object.kind === "stadium" ||
        object.kind === "ferris-wheel" ||
        object.kind === "roller-coaster" ||
        object.kind === "flags" ||
        object.kind === "gas" ||
        object.kind === "coffee-shop"
      ) {
        for (let offsetY = 0; offsetY < object.footprintHeight; offsetY += 1) {
          for (let offsetX = 0; offsetX < object.footprintWidth; offsetX += 1) {
            const tileX = object.footprintX + offsetX;
            const tileY = object.footprintY + offsetY;

            if (blocked[tileY] && blocked[tileY][tileX] !== undefined) {
              blocked[tileY][tileX] = true;
            }
          }
        }
        return;
      }

      if (
        object.kind === "tree" ||
        object.kind === "planter" ||
        object.kind === "fense" ||
        object.kind === "chair" ||
        object.kind === "umbrella-chair" ||
        object.kind === "traffic-light" ||
        object.kind === "street-light" ||
        object.kind === "statue"
      ) {
        blocked[object.y][object.x] = true;
      }
    });

    return {
      blocked,
    };
  }

  window.CityMapCollision = {
    makeCollision,
  };
})();
