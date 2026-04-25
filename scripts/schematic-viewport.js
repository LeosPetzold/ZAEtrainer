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
        globalTileOffsetY: 0
    };

    const state = {
        panX: 0,
        panY: 0,
        zoom: 1,
        isDragging: false,
        isPinching: false,
        dragStartX: 0,
        dragStartY: 0,
        touchId: null,
        pinchStartDistance: 0,
        pinchStartZoom: 1,
        pinchAnchorSvgX: 0,
        pinchAnchorSvgY: 0,
        touchStartX: 0,
        touchStartY: 0,
        touchMoved: false,
        lastTapTime: 0,
        lastTapX: 0,
        lastTapY: 0,
    };

    viewport.style.touchAction = "none";

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

    function startDragging(clientX, clientY) {
        state.isDragging = true;
        state.dragStartX = clientX - state.panX;
        state.dragStartY = clientY - state.panY;
        viewport.style.cursor = "grabbing";
        setIndicatorText(clientX, clientY, true);
    }

    function moveDragging(clientX, clientY) {
        state.panX = clientX - state.dragStartX;
        state.panY = clientY - state.dragStartY;
        updateTransform();
        setIndicatorText(clientX, clientY, true);
    }

    function stopDragging() {
        state.isDragging = false;
        state.touchId = null;
        viewport.style.cursor = "grab";
    }

    function stopPinching() {
        state.isPinching = false;
        state.pinchStartDistance = 0;
    }

    function getTouchById(touchList, id) {
        for (let i = 0; i < touchList.length; i += 1) {
            if (touchList[i].identifier === id) {
                return touchList[i];
            }
        }
        return null;
    }

    function getTouchDistance(firstTouch, secondTouch) {
        const dx = firstTouch.clientX - secondTouch.clientX;
        const dy = firstTouch.clientY - secondTouch.clientY;
        return Math.hypot(dx, dy);
    }

    function getTouchCenter(firstTouch, secondTouch) {
        return {
            x: (firstTouch.clientX + secondTouch.clientX) / 2,
            y: (firstTouch.clientY + secondTouch.clientY) / 2,
        };
    }

    function startPinching(firstTouch, secondTouch) {
        const center = getTouchCenter(firstTouch, secondTouch);
        const rect = viewport.getBoundingClientRect();
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;

        state.isPinching = true;
        state.pinchStartDistance = getTouchDistance(firstTouch, secondTouch);
        state.pinchStartZoom = state.zoom;
        state.pinchAnchorSvgX = (centerX - state.panX) / state.zoom;
        state.pinchAnchorSvgY = (centerY - state.panY) / state.zoom;
        state.lastTapTime = 0;

        if (state.isDragging) {
            stopDragging();
        }

        setIndicatorText(center.x, center.y, true);
    }

    function movePinching(firstTouch, secondTouch) {
        const center = getTouchCenter(firstTouch, secondTouch);
        const rect = viewport.getBoundingClientRect();
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;
        const currentDistance = getTouchDistance(firstTouch, secondTouch);

        if (state.pinchStartDistance <= 0) {
            return;
        }

        const scaleRatio = currentDistance / state.pinchStartDistance;
        const newZoom = state.pinchStartZoom * scaleRatio;
        state.zoom = Math.max(1 / 3, Math.min(5, newZoom));
        state.panX = centerX - state.pinchAnchorSvgX * state.zoom;
        state.panY = centerY - state.pinchAnchorSvgY * state.zoom;

        updateTransform();
        setIndicatorText(center.x, center.y, true);
    }

    function tryHandleDoubleTap(clientX, clientY) {
        const now = Date.now();
        const tapInterval = now - state.lastTapTime;
        const dx = clientX - state.lastTapX;
        const dy = clientY - state.lastTapY;
        const tapDistance = Math.hypot(dx, dy);

        if (tapInterval > 0 && tapInterval < 300 && tapDistance < 30) {
            resetView();
            state.lastTapTime = 0;
            return true;
        }

        state.lastTapTime = now;
        state.lastTapX = clientX;
        state.lastTapY = clientY;
        return false;
    }

    viewport.addEventListener("mousedown", (e) => {
        startDragging(e.clientX, e.clientY);
    });

    document.addEventListener("mousemove", (e) => {
        const rect = viewport.getBoundingClientRect();
        const isInsideViewport = e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (state.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            moveDragging(e.clientX, e.clientY);
        }

        if (state.isDragging || isInsideViewport) {
            setIndicatorText(e.clientX, e.clientY, true);
        } else {
            setIndicatorText(0, 0, false);
        }
    });

    document.addEventListener("mouseup", () => {
        stopDragging();
    });

    viewport.addEventListener("touchstart", (e) => {
        if (e.touches.length === 0) {
            return;
        }

        if (e.touches.length >= 2) {
            startPinching(e.touches[0], e.touches[1]);
            e.preventDefault();
            return;
        }

        if (state.isPinching || state.isDragging) {
            return;
        }

        const touch = e.touches[0];
        state.touchId = touch.identifier;
        state.touchStartX = touch.clientX;
        state.touchStartY = touch.clientY;
        state.touchMoved = false;
        startDragging(touch.clientX, touch.clientY);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener("touchmove", (e) => {
        if (state.isPinching) {
            if (e.touches.length < 2) {
                stopPinching();
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            movePinching(e.touches[0], e.touches[1]);
            return;
        }

        if (!state.isDragging || state.touchId === null) {
            return;
        }

        const touch = getTouchById(e.touches, state.touchId) || getTouchById(e.changedTouches, state.touchId);
        if (!touch) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (!state.touchMoved) {
            const movedDistance = Math.hypot(touch.clientX - state.touchStartX, touch.clientY - state.touchStartY);
            state.touchMoved = movedDistance > 8;
        }
        moveDragging(touch.clientX, touch.clientY);
    }, { passive: false });

    function handleTouchStop(e) {
        if (state.isPinching) {
            if (e.touches.length >= 2) {
                startPinching(e.touches[0], e.touches[1]);
                return;
            }

            stopPinching();

            if (e.touches.length === 1) {
                const remainingTouch = e.touches[0];
                state.touchId = remainingTouch.identifier;
                state.touchStartX = remainingTouch.clientX;
                state.touchStartY = remainingTouch.clientY;
                state.touchMoved = false;
                startDragging(remainingTouch.clientX, remainingTouch.clientY);
                return;
            }

            setIndicatorText(0, 0, false);
            return;
        }

        if (!state.isDragging || state.touchId === null) {
            return;
        }

        const endedTouch = getTouchById(e.changedTouches, state.touchId);

        const remainingTouch = getTouchById(e.touches, state.touchId);
        if (!remainingTouch) {
            stopDragging();
            if (endedTouch && !state.touchMoved) {
                tryHandleDoubleTap(endedTouch.clientX, endedTouch.clientY);
            }
            setIndicatorText(0, 0, false);
        }
    }

    document.addEventListener("touchend", handleTouchStop, { passive: true });
    document.addEventListener("touchcancel", handleTouchStop, { passive: true });

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