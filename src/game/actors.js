(function () {
  "use strict";

  const { directionToAngle, randomUnit, shortestAngleDelta, tileKey, variation } = window.CityGameMath;
  const { createPlayers } = window.CityPlayerData;
  const {
    createCars,
    getCarPosition,
    getVehicleCollisionBox,
    paddedCollisionBox,
    vehicleCollisionGap,
  } = window.CityVehicles;

  const playerSpeed = 3.6;
  const otherPlayerSpeed = 1.55;
  const playerCollisionRadius = 0.26;
  const walkableKinds = new Set([
    "road-center",
    "road-lane",
    "centerline-dash",
    "intersection",
    "block-inner",
    "grass",
    "floor",
    "crosswalk-1",
    "crosswalk-2",
    "crosswalk-3",
  ]);

  function createActors(mapData, geometry, pressedKeys) {
    const { columns, rows } = geometry;
    const players = createPlayers();
    const localPlayer = players[0];
    const cars = createCars(mapData);

    function circleIntersectsBox(x, y, radius, box) {
      const closestX = Math.max(box.minX, Math.min(box.maxX, x));
      const closestY = Math.max(box.minY, Math.min(box.maxY, y));
      const distanceX = x - closestX;
      const distanceY = y - closestY;

      return distanceX * distanceX + distanceY * distanceY < radius * radius;
    }

    function isWalkableTile(x, y) {
      if (x < 0 || y < 0 || x >= columns || y >= rows) {
        return false;
      }

      const tile = mapData.layers.ground[y][x];
      const blocked = mapData.layers.collision.blocked[y][x];
      const walkable =
        walkableKinds.has(tile.kind) ||
        tile.kind.startsWith("block-") ||
        tile.kind.startsWith("grass-") ||
        tile.kind.startsWith("floor-");
      return Boolean(tile && walkable && !blocked);
    }

    function isWalkablePosition(x, y) {
      const tile = geometry.getTileAt(x, y);
      return Boolean(tile && isWalkableTile(tile.x, tile.y));
    }

    function isVehicleBlockingPosition(x, y, radius = playerCollisionRadius) {
      const paddedRadius = radius + vehicleCollisionGap;

      return cars.some((car) => circleIntersectsBox(
        x,
        y,
        paddedRadius,
        getVehicleCollisionBox(car),
      ));
    }

    function wouldVehicleHitPlayer(box) {
      return players.some((player) => circleIntersectsBox(
        player.x,
        player.y,
        player.collisionRadius ?? playerCollisionRadius,
        paddedCollisionBox(box),
      ));
    }

    function wouldVehicleHitVehicle(vehicle, box) {
      const paddedBox = paddedCollisionBox(box);

      return cars.some((otherVehicle) => {
        if (otherVehicle === vehicle) {
          return false;
        }

        return window.CityVehicles.boxesIntersect(
          paddedBox,
          paddedCollisionBox(getVehicleCollisionBox(otherVehicle)),
        );
      });
    }

    function canMoveVehicleTo(vehicle, progress) {
      const box = getVehicleCollisionBox(vehicle, getCarPosition(vehicle, progress));

      return !wouldVehicleHitPlayer(box) && !wouldVehicleHitVehicle(vehicle, box);
    }

    function canOccupyPosition(entity, x, y) {
      const radius = entity.collisionRadius ?? playerCollisionRadius;
      return isWalkablePosition(x, y) && !isVehicleBlockingPosition(x, y, radius);
    }

    function findNearestWalkableTile(x, y, reservedTiles) {
      const originX = Math.floor(x);
      const originY = Math.floor(y);

      for (let radius = 0; radius <= 8; radius += 1) {
        for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
          for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
            if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== radius) {
              continue;
            }

            const tileX = originX + offsetX;
            const tileY = originY + offsetY;

            if (isWalkableTile(tileX, tileY) && !reservedTiles.has(tileKey(tileX, tileY))) {
              return { x: tileX, y: tileY };
            }
          }
        }
      }

      return { x: originX, y: originY };
    }

    function initializePlayers() {
      const reservedTiles = new Set();

      players.forEach((player) => {
        const tile = findNearestWalkableTile(player.x, player.y, reservedTiles);
        player.x = tile.x;
        player.y = tile.y;
        player.targetAngle = directionToAngle(player.directionX, player.directionY);
        player.displayAngle = player.targetAngle;
        reservedTiles.add(tileKey(tile.x, tile.y));
      });
    }

    function getMovementVector() {
      let dx = 0;
      let dy = 0;

      if (pressedKeys.has("ArrowLeft")) {
        dx -= 1;
        dy += 1;
      }
      if (pressedKeys.has("ArrowRight")) {
        dx += 1;
        dy -= 1;
      }
      if (pressedKeys.has("ArrowUp")) {
        dx -= 1;
        dy -= 1;
      }
      if (pressedKeys.has("ArrowDown")) {
        dx += 1;
        dy += 1;
      }

      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        dx /= distance;
        dy /= distance;
      }

      return { dx, dy };
    }

    function moveEntity(entity, dx, dy) {
      if (dx === 0 && dy === 0) {
        entity.isWalking = false;
        return;
      }

      const nextX = entity.x + dx;
      const nextY = entity.y + dy;
      let movedX = false;
      let movedY = false;

      if (canOccupyPosition(entity, nextX, entity.y)) {
        entity.x = nextX;
        movedX = true;
      }
      if (canOccupyPosition(entity, entity.x, nextY)) {
        entity.y = nextY;
        movedY = true;
      }

      if (movedX || movedY) {
        entity.directionX = dx;
        entity.directionY = dy;
        entity.targetAngle = directionToAngle(dx, dy);
      } else {
        entity.targetAngle = directionToAngle(dx, dy);
      }
      entity.isWalking = movedX || movedY;
    }

    function updateCharacterFacing(deltaSeconds) {
      players.forEach((player) => {
        if (player.displayAngle === undefined) {
          player.displayAngle = directionToAngle(player.directionX, player.directionY);
        }
        if (player.targetAngle === undefined) {
          player.targetAngle = player.displayAngle;
        }

        const turnAmount = 1 - Math.exp(-deltaSeconds * 12);
        player.displayAngle += shortestAngleDelta(player.displayAngle, player.targetAngle) * turnAmount;
      });
    }

    function updateLocalPlayer(deltaSeconds) {
      const movement = getMovementVector();
      moveEntity(
        localPlayer,
        movement.dx * playerSpeed * deltaSeconds,
        movement.dy * playerSpeed * deltaSeconds,
      );
    }

    function updateOtherPlayers(deltaSeconds, elapsedSeconds) {
      const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 0 },
      ];

      players.forEach((player, index) => {
        if (player.local) {
          return;
        }

        player.wanderDelay -= deltaSeconds;
        if (player.wanderDelay <= 0) {
          const choice = directions[variation(Math.floor(elapsedSeconds * 2) + index * 7, Math.floor(player.x * 11 + player.y * 13)) % directions.length];
          player.directionX = choice.dx;
          player.directionY = choice.dy;
          player.wanderDelay = 0.8 + randomUnit(elapsedSeconds + index * 31) * 1.6;
        }

        moveEntity(
          player,
          player.directionX * otherPlayerSpeed * deltaSeconds,
          player.directionY * otherPlayerSpeed * deltaSeconds,
        );
      });
    }

    function updateCars(deltaSeconds) {
      cars.forEach((car) => {
        const length = Math.max(1, car.path.to - car.path.from);
        let nextProgress = car.progress + (car.speed * car.direction * deltaSeconds) / length;

        if (nextProgress > 1) {
          nextProgress -= 1;
        }
        if (nextProgress < 0) {
          nextProgress += 1;
        }

        if (canMoveVehicleTo(car, nextProgress)) {
          car.progress = nextProgress;
        }
      });
    }

    function update(deltaSeconds, elapsedSeconds) {
      updateLocalPlayer(deltaSeconds);
      updateOtherPlayers(deltaSeconds, elapsedSeconds);
      updateCars(deltaSeconds);
      updateCharacterFacing(deltaSeconds);
    }

    return {
      players,
      localPlayer,
      cars,
      initializePlayers,
      update,
      getCarPosition,
    };
  }

  window.CityActors = {
    createActors,
  };
})();
