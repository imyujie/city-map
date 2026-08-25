(function () {
  "use strict";

  function createObjectLayers({ mapSize, tile, ground, roadMap }) {
    const blockTools = window.CityMapBlocks.createBlockTools({
      mapSize,
      ground,
      roadMap,
    });
    const terrain = window.CityMapTerrain.createTerrainLayers({
      mapSize,
      tile,
      ground,
      blockTools,
    });
    const occupiedTiles = new Set();
    const decorations = window.CityMapDecorations.createDecorationObjects({
      mapSize,
      tile,
      ground,
      pools: terrain.pools,
      blockTools,
      occupiedTiles,
    });
    const roadsideDecorations = decorations.createRoadsideDecorations();
    const structures = window.CityMapStructures.createStructureObjects({
      mapSize,
      tile,
      ground,
      blockTools,
      occupiedTiles,
    });
    const blockDecorations = decorations.createBlockDecorations(structures);
    const objects = [
      ...roadsideDecorations,
      ...structures,
      ...blockDecorations,
    ];

    return {
      pools: terrain.pools,
      grassAreas: terrain.grassAreas,
      objects,
      collision: window.CityMapCollision.makeCollision(mapSize, objects),
    };
  }

  window.CityMapObjects = {
    createObjectLayers,
  };
})();
