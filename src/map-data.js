(function () {
  "use strict";

  const MAP_SIZE = 120;
  const tile = window.CityMapAssets;
  const roadMap = window.CityMapRoads.createRoadMap(MAP_SIZE, tile);
  const ground = roadMap.makeGround();
  const objectLayers = window.CityMapObjects.createObjectLayers({
    mapSize: MAP_SIZE,
    tile,
    ground,
    roadMap,
  });

  window.CityMapData = {
    world: {
      columns: MAP_SIZE,
      rows: MAP_SIZE,
      tileSourceSize: 200,
      tileWidth: 96,
      tileHeight: 48,
    },
    assets: tile,
    layers: {
      ground,
      objects: objectLayers.objects,
      collision: objectLayers.collision,
    },
    features: {
      pools: objectLayers.pools,
      grassAreas: objectLayers.grassAreas,
      roadPaths: roadMap.roadPaths.map(({ axis, x, y, from, to, major }) => ({ axis, x, y, from, to, major })),
    },
  };
})();
