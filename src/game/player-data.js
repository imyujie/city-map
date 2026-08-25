(function () {
  "use strict";

  function createPlayers() {
    return [
      {
        id: "you",
        name: "You",
        local: true,
        x: 60,
        y: 61,
        targetX: 60,
        targetY: 61,
        directionX: 0,
        directionY: 1,
        isWalking: false,
        bodyColor: "#22d3ee",
        accentColor: "#f8fafc",
      },
      {
        id: "mika",
        name: "Mika",
        x: 57,
        y: 57,
        targetX: 57,
        targetY: 57,
        directionX: 1,
        directionY: 0,
        isWalking: false,
        bodyColor: "#f97316",
        accentColor: "#fff7ed",
        wanderDelay: 0,
      },
      {
        id: "sol",
        name: "Sol",
        x: 63,
        y: 56,
        targetX: 63,
        targetY: 56,
        directionX: -1,
        directionY: 0,
        isWalking: false,
        bodyColor: "#a78bfa",
        accentColor: "#faf5ff",
        wanderDelay: 0.6,
      },
      {
        id: "ren",
        name: "Ren",
        x: 65,
        y: 64,
        targetX: 65,
        targetY: 64,
        directionX: 0,
        directionY: -1,
        isWalking: false,
        bodyColor: "#84cc16",
        accentColor: "#f7fee7",
        wanderDelay: 1.1,
      },
      {
        id: "ivy",
        name: "Ivy",
        x: 54,
        y: 63,
        targetX: 54,
        targetY: 63,
        directionX: 1,
        directionY: 0,
        isWalking: false,
        bodyColor: "#fb7185",
        accentColor: "#fff1f2",
        wanderDelay: 1.5,
      },
    ];
  }

  window.CityPlayerData = {
    createPlayers,
  };
})();
