(function () {
  "use strict";

  const { randomUnit, wrapProgress } = window.CityGameMath;

  const vehicleCollisionGap = 0.16;
  const vehicleCollisionProfiles = {
    car: { length: 1.48, width: 0.68 },
    bus: { length: 2.34, width: 0.74 },
    truck: { length: 2.12, width: 0.74 },
  };

  function getCarPosition(car, progress = car.progress) {
    const length = car.path.to - car.path.from;
    const distance = car.path.from + progress * length;

    if (car.path.axis === "horizontal") {
      return {
        x: distance,
        y: car.path.y + car.laneOffset,
        directionX: car.direction,
        directionY: 0,
      };
    }

    return {
      x: car.path.x + car.laneOffset,
      y: distance,
      directionX: 0,
      directionY: car.direction,
    };
  }

  function getVehicleCollisionProfile(vehicle) {
    return vehicleCollisionProfiles[vehicle.kind] || vehicleCollisionProfiles.car;
  }

  function getVehicleCollisionBox(vehicle, position = getCarPosition(vehicle)) {
    const profile = getVehicleCollisionProfile(vehicle);
    const halfLength = profile.length / 2;
    const halfWidth = profile.width / 2;
    const movingHorizontally = Math.abs(position.directionX) >= Math.abs(position.directionY);

    if (movingHorizontally) {
      return {
        minX: position.x - halfLength,
        maxX: position.x + halfLength,
        minY: position.y - halfWidth,
        maxY: position.y + halfWidth,
      };
    }

    return {
      minX: position.x - halfWidth,
      maxX: position.x + halfWidth,
      minY: position.y - halfLength,
      maxY: position.y + halfLength,
    };
  }

  function boxesIntersect(a, b) {
    return (
      a.minX < b.maxX &&
      a.maxX > b.minX &&
      a.minY < b.maxY &&
      a.maxY > b.minY
    );
  }

  function paddedCollisionBox(box, padding = vehicleCollisionGap) {
    return {
      minX: box.minX - padding,
      maxX: box.maxX + padding,
      minY: box.minY - padding,
      maxY: box.maxY + padding,
    };
  }

  function overlapsPlacedVehicle(vehicle, placedVehicles) {
    const box = paddedCollisionBox(getVehicleCollisionBox(vehicle));

    return placedVehicles.some((placedVehicle) => boxesIntersect(
      box,
      paddedCollisionBox(getVehicleCollisionBox(placedVehicle)),
    ));
  }

  function findAvailableVehicleProgress(vehicle, preferredProgress, placedVehicles) {
    const attempts = 32;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      vehicle.progress = wrapProgress(preferredProgress + attempt / attempts);

      if (!overlapsPlacedVehicle(vehicle, placedVehicles)) {
        return vehicle.progress;
      }
    }

    return wrapProgress(preferredProgress);
  }

  function addVehicle(vehicles, vehicle, preferredProgress) {
    vehicle.progress = findAvailableVehicleProgress(vehicle, preferredProgress, vehicles);
    vehicles.push(vehicle);
  }

  function createCars(mapData) {
    const roadPaths = mapData.features.roadPaths || [];
    const verticalRoadPaths = roadPaths.filter((path) => path.axis === "vertical");
    const horizontalRoadPaths = roadPaths.filter((path) => path.axis === "horizontal");
    const vehicles = [];

    verticalRoadPaths.forEach((path, pathIndex) => {
      const carsOnPath = 2;

      for (let index = 0; index < carsOnPath; index += 1) {
        const seed = pathIndex * 149 + index * 37;
        const isCab = (pathIndex + index) % 3 === 1;
        addVehicle(vehicles, {
          id: `${isCab ? "cab" : "car"}-${pathIndex}-${index}`,
          assetId: isCab ? mapData.assets.cab : mapData.assets.car1,
          path,
          speed: (isCab ? 3.0 : 2.8) + randomUnit(seed + 11) * 1.1,
          direction: 1,
          laneOffset: 0.34,
          scale: (isCab ? 0.13 : 0.19) + randomUnit(seed + 17) * 0.02,
          kind: isCab ? "cab" : "car",
        }, randomUnit(seed + 5) + index / carsOnPath);
      }

      if (pathIndex % 2 === 0) {
        const seed = pathIndex * 211 + 83;
        addVehicle(vehicles, {
          id: `bus-${pathIndex}`,
          assetId: mapData.assets.bus,
          path,
          speed: 1.75 + randomUnit(seed + 11) * 0.45,
          direction: 1,
          laneOffset: 0.34,
          scale: 0.16,
          kind: "bus",
        }, randomUnit(seed + 5));
      }
    });

    horizontalRoadPaths.forEach((path, pathIndex) => {
      const seed = pathIndex * 257 + 109;

      addVehicle(vehicles, {
        id: `truck-${pathIndex}`,
        assetId: mapData.assets.truck,
        path,
        speed: 1.9 + randomUnit(seed + 11) * 0.5,
        direction: 1,
        laneOffset: 0.34,
        scale: 0.15 + randomUnit(seed + 17) * 0.014,
        kind: "truck",
      }, randomUnit(seed + 5));
    });

    return vehicles;
  }

  window.CityVehicles = {
    boxesIntersect,
    createCars,
    getCarPosition,
    getVehicleCollisionBox,
    paddedCollisionBox,
    vehicleCollisionGap,
  };
})();
