/**
 * Schematic viewport interaction manager
 * Handles pan, zoom, reset, and the subtle cursor coordinate indicator.
 */

(function () {
    const viewport = document.getElementById("schematicViewport");
    const schematicSvg = document.getElementById("schematicSvg");
    const coordinateIndicator = document.getElementById("viewportCoordinates");

    if (!viewport || !schematicSvg || !coordinateIndicator) {
        return;
    }

    const metrics = window.schematicViewportMetrics || {
        tileSize: 20 * (96 / 25.4),
        globalTileOffsetX: 0,
        globalTileOffsetY: 0.7
    };

    const state = {
        panX: 0,
        panY: 0,
        zoom: 1,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
    };

    function updateTransform() {
        schematicSvg.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }

    function formatTileValue(value) {
        const normalized = Math.abs(value) < 0.05 ? 0 : value;
        const rounded = Math.round(normalized * 10) / 10;
        return (rounded >= 0 ? "+" : "") + rounded.toFixed(1);
    }

    function setIndicatorText(clientX, clientY, active) {
        if (!active) {
            coordinateIndicator.textContent = "x: --  y: --";
            return;
        }

        const rect = viewport.getBoundingClientRect();
        const localX = (clientX - rect.left - state.panX) / state.zoom;
        const localY = (clientY - rect.top - state.panY) / state.zoom;
        const centerX = viewport.clientWidth / 2;
        const centerY = viewport.clientHeight / 2;

        const tileX = (localX - centerX) / metrics.tileSize;
        const tileY = (localY - centerY) / metrics.tileSize;

        coordinateIndicator.textContent = `x: ${formatTileValue(tileX)}  y: ${formatTileValue(tileY)}`;
    }

    function resetView() {
        state.panX = 0;
        state.panY = 0;
        state.zoom = 1;
        updateTransform();
    }

    viewport.addEventListener("mousedown", (e) => {
        state.isDragging = true;
        state.dragStartX = e.clientX - state.panX;
        state.dragStartY = e.clientY - state.panY;
        viewport.style.cursor = "grabbing";
        setIndicatorText(e.clientX, e.clientY, true);
    });

    document.addEventListener("mousemove", (e) => {
        const rect = viewport.getBoundingClientRect();
        const isInsideViewport = e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (state.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            state.panX = e.clientX - state.dragStartX;
            state.panY = e.clientY - state.dragStartY;
            updateTransform();
        }

        if (state.isDragging || isInsideViewport) {
            setIndicatorText(e.clientX, e.clientY, true);
        } else {
            setIndicatorText(0, 0, false);
        }
    });

    document.addEventListener("mouseup", () => {
        state.isDragging = false;
        viewport.style.cursor = "grab";
    });

    viewport.addEventListener("mouseleave", () => {
        setIndicatorText(0, 0, false);
    });

    viewport.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetView();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Home") {
            resetView();
        }
    });

    viewport.addEventListener("wheel", (e) => {
        e.preventDefault();

        const rect = viewport.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const svgX = (cursorX - state.panX) / state.zoom;
        const svgY = (cursorY - state.panY) / state.zoom;

        const baseSpeed = 0.1;
        const zoomSpeed = baseSpeed * Math.sqrt(state.zoom);
        const newZoom = state.zoom + (e.deltaY > 0 ? -zoomSpeed : zoomSpeed);
        state.zoom = Math.max(1 / 3, Math.min(5, newZoom));

        state.panX = cursorX - svgX * state.zoom;
        state.panY = cursorY - svgY * state.zoom;

        updateTransform();
        setIndicatorText(e.clientX, e.clientY, true);
    }, { passive: false });

    window.schematicViewport = {
        resetView,
        updateIndicatorFromClientPoint: setIndicatorText,
    };

    updateTransform();
    setIndicatorText(0, 0, false);
})();