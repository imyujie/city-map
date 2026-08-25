(function () {
  "use strict";

  function createControls({
    canvas,
    readout,
    mapData,
    geometry,
    view,
    pressedKeys,
    getShowGrid,
    setShowGrid,
    getHoverTile,
    setHoverTile,
    resetView,
    requestRender,
    scheduleFrame,
    cancelAnimationLoop,
    setZoom,
    queueResize,
  }) {
    let isDragging = false;
    let lastPointer = { x: 0, y: 0 };

    function updateHoverTile(pointerX, pointerY) {
      const world = geometry.screenToWorld(view, pointerX, pointerY);
      const currentHoverTile = getHoverTile();
      const nextHoverTile = geometry.worldToTile(world.x, world.y);
      const hoverChanged =
        (!currentHoverTile && nextHoverTile) ||
        (currentHoverTile && !nextHoverTile) ||
        (
          currentHoverTile &&
          nextHoverTile &&
          (currentHoverTile.x !== nextHoverTile.x || currentHoverTile.y !== nextHoverTile.y)
        );

      if (!hoverChanged) {
        return;
      }

      setHoverTile(nextHoverTile);
      if (nextHoverTile) {
        const tile = mapData.layers.ground[nextHoverTile.y][nextHoverTile.x];
        readout.textContent = `tile ${nextHoverTile.x}, ${nextHoverTile.y} - ${tile.kind}`;
      } else {
        readout.textContent = `${geometry.columns} x ${geometry.rows} ground tiles`;
      }
      requestRender();
    }

    function handlePointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      if (isDragging) {
        lastPointer = { x: pointerX, y: pointerY };
      }

      updateHoverTile(pointerX, pointerY);
    }

    function bind({ gridToggle, zoomInButton, zoomOutButton, resetButton }) {
      canvas.addEventListener("pointerdown", (event) => {
        const rect = canvas.getBoundingClientRect();
        isDragging = true;
        canvas.classList.add("is-dragging");
        canvas.setPointerCapture(event.pointerId);
        lastPointer = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      });

      canvas.addEventListener("pointermove", handlePointerMove);

      canvas.addEventListener("pointerup", (event) => {
        isDragging = false;
        canvas.classList.remove("is-dragging");
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      });

      canvas.addEventListener("pointercancel", () => {
        isDragging = false;
        canvas.classList.remove("is-dragging");
      });

      canvas.addEventListener(
        "wheel",
        (event) => {
          event.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const anchorX = event.clientX - rect.left;
          const anchorY = event.clientY - rect.top;
          setZoom(view.zoom * Math.exp(-event.deltaY * 0.001), anchorX, anchorY);
        },
        { passive: false },
      );

      gridToggle.addEventListener("change", () => {
        setShowGrid(gridToggle.checked);
        requestRender();
      });

      zoomInButton.addEventListener("click", () => setZoom(view.zoom * 1.2));
      zoomOutButton.addEventListener("click", () => setZoom(view.zoom / 1.2));
      resetButton.addEventListener("click", resetView);

      window.addEventListener("keydown", (event) => {
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          pressedKeys.add(event.key);
          scheduleFrame();
        }
      });
      window.addEventListener("keyup", (event) => {
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          pressedKeys.delete(event.key);
        }
      });
      window.addEventListener("blur", () => pressedKeys.clear());
      window.addEventListener("resize", queueResize);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          cancelAnimationLoop();
          return;
        }

        requestRender();
        scheduleFrame();
      });
    }

    return {
      bind,
      getShowGrid,
    };
  }

  window.CityControls = {
    createControls,
  };
})();
