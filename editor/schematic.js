const tileSize = 80;

let draggedTile = null;
let schematic = [];
let rotation = 0;
let hoveredTile = null;

function viewportMouseMove(event) {
    const mousePos = getTilePosition(event.clientX, event.clientY);
    $("#coordsIndicator").text(`X: ${mousePos.x}, Y: ${mousePos.y}`);
}

function getTilePosition(x, y) { // Pixels to tiles (center-based, snapped)
    const viewportRect = $("#viewport")[0].getBoundingClientRect();
    const localX = x - (viewportRect.left + viewportRect.width / 2);
    const localY = y - (viewportRect.top + viewportRect.height / 2);

    return {
        x: Math.round(localX / tileSize),
        y: Math.round(localY / tileSize),
    };
}

function tileClick(name) {
    draggedTile = name;
    $("#draggedIndicator").html(`Dragging tile: <b>${name}</b>`);
}

// delegated handler: works for all current/future .tile elements
$("#viewport").off("contextmenu", ".tile").on("contextmenu", ".tile", function (e) {
    const idX = Number(this.dataset.x);
    const idY = Number(this.dataset.y);

    if (schematic[idX]) {
        schematic[idX][idY] = null;
    }

    this.remove();
    if (hoveredTile === this) hoveredTile = null;
    e.preventDefault();
    e.stopPropagation();
    console.table(schematic);
    return false;
});

// track hovered tile for E editing
$("#viewport")
    .off("mouseenter", ".tile")
    .on("mouseenter", ".tile", function () {
        hoveredTile = this;
    })
    .off("mouseleave", ".tile")
    .on("mouseleave", ".tile", function () {
        if (hoveredTile === this) hoveredTile = null;
    });

function viewportClick(event) {
    if (!draggedTile) return;

    const mousePos = getTilePosition(event.clientX, event.clientY);
    console.log(`Placing tile ${draggedTile} at X: ${mousePos.x}, Y: ${mousePos.y}`);

    if (!schematic[mousePos.x]) {
        schematic[mousePos.x] = [];
    }
    schematic[mousePos.x][mousePos.y] = { tile: draggedTile, rotation: rotation };

    const tileViewportPosition = tileToScreenCoords(mousePos.x, mousePos.y);
    const tileElement = $(
        `<img class="tile" data-x="${mousePos.x}" data-y="${mousePos.y}" src="../media/tiles/tile-${draggedTile}.svg">`
    );

    tileElement.css({
        left: tileViewportPosition.x,
        top: tileViewportPosition.y,
        transform: `rotate(${rotation}deg)`
    });

    $("#viewport").append(tileElement);
    console.table(schematic);
}

document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'Enter':
            assembleXML();
            break;
        case 'r': case 'R':
            rotation = (rotation + 90) % 360;
            $("#rotationIndicator")[0].innerText = `Rotation: ${rotation}°`;
            console.log(`Rotation is now ${rotation} degrees`);
            break;
        case 'e': case 'E':
            editHoveredTileXmlAttribute();
            break;
    }
});

function editHoveredTileXmlAttribute() {
    if (!hoveredTile) {
        alert("Hover a tile first, then press E.");
        return;
    }

    const x = Number(hoveredTile.dataset.x);
    const y = Number(hoveredTile.dataset.y);
    const tileData = schematic[x]?.[y];
    if (!tileData) return;

    const nameInput = prompt("XML attribute name?");
    if (nameInput === null) return;

    const attrName = nameInput.trim();
    if (!attrName) return;
    if (!/^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(attrName)) {
        alert("Invalid XML attribute name.");
        return;
    }

    const attrValue = prompt(`Value for "${attrName}"?`, "");
    if (attrValue === null) return;

    if (!tileData.attrs) tileData.attrs = {};
    tileData.attrs[attrName] = attrValue;
}

function escapeXmlAttr(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function tileToScreenCoords(tileX, tileY) { // Tiles to pixels (top-left)
    const viewportRect = $("#viewport")[0].getBoundingClientRect();
    const centerX = viewportRect.width / 2;
    const centerY = viewportRect.height / 2;

    const screenX = Math.floor(centerX + (tileSize * tileX) - (tileSize / 2));
    const screenY = Math.floor(centerY + (tileSize * tileY) - (tileSize / 2));
    return { x: screenX, y: screenY };
}

function assembleXML() {
    let xml = `<tiles>\n`;
    let tileCount = 0;

    const xKeys = Object.keys(schematic)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

    for (const x of xKeys) {
        const column = schematic[x];
        if (!column) continue;

        const yKeys = Object.keys(column)
            .map(Number)
            .filter(Number.isFinite)
            .sort((a, b) => a - b);

        for (const y of yKeys) {
            const tileData = column[y];
            if (!tileData) continue;

            const extraAttrs = tileData.attrs
                ? Object.entries(tileData.attrs)
                    .map(([k, v]) => ` ${escapeXmlAttr(k)}="${escapeXmlAttr(v)}"`)
                    .join("")
                : "";

            xml += `  <tile name="${escapeXmlAttr(tileData.tile)}" x="${x}" y="${y}" rotation="${tileData.rotation}"${extraAttrs}/>\n`;
            tileCount++;
        }
    }

    xml += `</tiles>`;
    setClipboard(xml);
    alert(`Schematic XML copied to clipboard! (${tileCount} tiles)`);
}

async function setClipboard(text) {
    const type = "text/plain";
    const clipboardItemData = {
        [type]: text,
    };
    const clipboardItem = new ClipboardItem(clipboardItemData);
    await navigator.clipboard.write([clipboardItem]);
}
