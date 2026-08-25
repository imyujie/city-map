(function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function directionToAngle(dx, dy) {
    return Math.atan2(dx, -dy);
  }

  function shortestAngleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function variation(x, y) {
    const hash = (x * 73856093) ^ (y * 19349663);
    return Math.abs(hash) % 100;
  }

  function randomUnit(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function wrapProgress(progress) {
    return ((progress % 1) + 1) % 1;
  }

  function tileKey(x, y) {
    return `${x},${y}`;
  }

  window.CityGameMath = {
    clamp,
    directionToAngle,
    shortestAngleDelta,
    variation,
    randomUnit,
    wrapProgress,
    tileKey,
  };
})();
