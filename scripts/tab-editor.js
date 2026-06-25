/* Config*/

// Tile metadata
var metadata;
try {
    const metadataJSON = await fetch(`media/metadata/tiles.json`);
    if (!metadataJSON.ok) {
        throw new Error(`Response error status: ${metadataJSON.status}`);
    }
    const result = await metadataJSON.text(); ///

    metadata = JSON.parse(result);
} catch (error) {
    console.error(`Error parsing tile metadata: ${error}`); }
/* All supported & available metadata cell attributes
 * linker: does topology compress links? (is a pure conductor?) */

const keysmain = Object.keys(metadata.main);
const keysaux  = Object.keys(metadata.aux);

const selection = keysmain; // In order

function variants(ID) {
    return metadata.main[ID].variants ?? [ ID ];
}

const canvasBorderWidth = 1; // One edge, in px
const cursorBorderWidth = 2; // One edge, in px

const Modes = {
    "None": -1,
    "Place": 0,
    "Select": 1,
    "Delete": 2
};
/* Config END */

/* Runtime variables */
let canvasBox;
let canvasSizeTiles = { x: 0, y: 0 };
let ID = ""; // Internal non-varianting ID, do not set fallback ID
let trueID = ID; // Actual ID, takes care of variant
let rotation = 0; // 0, 1, 2, 3
let imageRotation = 0; // step=1, range +-360deg., that is mod 4
let totalVariants = 1;
let variant  = 0; // Code-wise zero-based, UI-wise one-based
let sizeX = 1; // Current selected tile size
let sizeY = 1; // Current selected tile size
let cursorTilePosition         = { x: 0, y: 0 };
let cursorTilePositionAbsolute = { x: 0, y: 0 };
let cursorCanvasPosition       = { x: 0, y: 0 }; // Does **NOT** include borders
let loaded = false;
//const tileSize = 64; // Not dynamic with CSS. Not dynamic in CSS.
let latestVariants = new Map();
let SVGregister = new Map();
let mode = Modes.None;

let tilehead = null;
let tiletrue  = null;

let cells = new Map(); // Map-of-Maps

// Needed globalization
window.editorCells = cells;

/* Runtime variables END */

/* Setup */

document.documentElement.style.setProperty("--tile-size", `${tileSize}px`);

const tileContainer = $("#editor-selector-container")[0];
Promise.all(selection.map(item =>
    fetch(`media/tiles/${item}.svg`)
        .then((res) => res.text())
        .then((text) => ({item, text}))
    )).then((results) => {
        tileContainer.innerHTML = "";

        // Sort and store
        const sortedResults = selection.map(item => 
            results.find(r => r.item === item)
        );
        
        // Build
        tileContainer.innerHTML = "";
        sortedResults.forEach(result => {
            tileContainer.innerHTML += `<span class="editor-item-wrapper" onclick="window.editorEditorSelect('${result.item}');">${result.text}</span>`;
        });

        colorSVG(tileContainer);
});

addEventListener("keypress", (event) => {
    if (loaded) {
        switch(event.key) {
            case 'd':
            case 'D':
                canvasClick(event, Modes.Delete);
                break;
            case 'e':
            case 'E':
                if (mode != Modes.Place) break;
                canvasClick(event, Modes.Place);
                break;
            case 'w':
            case 'W':
                if (mode != Modes.Place) break;
                variate(variant+(event.shiftKey ? -1 : +1));
                latestVariants.set(ID, variant);
                break;
            case 'r':
            case 'R':
                if (mode != Modes.Place) break;
                rotate(event.shiftKey ? -1 : +1);
                break;
            case 't':
            case 'T':
                if (mode != Modes.Place)
                rotate(event.shiftKey ? +1 : -1);
                break;
        }
    }
});

const editorViewport = $("#editor-viewport")[0];
const editorCanvas   = $("#editor-viewport-canvas")[0];
const underneath     = $("#editor-viewport-underneath")[0];
addEventListener("mousemove", (event) => { 
    mouseMove(event); });
function mouseMove(event) {
    const ctp = getCursorPosition(event, editorCanvas); // Current tile position input = ctp
    cursorCanvasPosition.x = ctp.x - canvasBorderWidth;
    cursorCanvasPosition.y = ctp.y - canvasBorderWidth;
    cursorTilePositionAbsolute.x = Math.floor(cursorCanvasPosition.x / 64);
    cursorTilePositionAbsolute.y = Math.floor(cursorCanvasPosition.y / 64);
    cursorTilePosition.x = cursorTilePositionAbsolute.x - Math.floor(canvasSizeTiles.x/2);
    cursorTilePosition.y = cursorTilePositionAbsolute.y - Math.floor(canvasSizeTiles.y/2);

    if (mode == Modes.Place) {
        const position = getCursorPosition(event, editorViewport);
        $("#editor-tiledetails-cursor")[0].style.left = `${position.x-(tileSize/2)}px`;
        $("#editor-tiledetails-cursor")[0].style.top  = `${position.y-(tileSize/2)}px`;

        // Underneath
        underneath.style.left = `${cursorTilePositionAbsolute.x * tileSize}px`;
        underneath.style.top  = `${cursorTilePositionAbsolute.y * tileSize}px`;
    }
}

// const editorCanvas = $("#editor-viewport-canvas")[0];
function updateCanvasBox() {
    canvasBox = editorCanvas.getBoundingClientRect();
    window.editorCanvasBox = canvasBox;
    canvasSizeTiles.x = Math.floor((canvasBox.width  - (2*canvasBorderWidth))/tileSize);
    canvasSizeTiles.y = Math.floor((canvasBox.height - (2*canvasBorderWidth))/tileSize);
}
addEventListener("resize", () => {
    updateCanvasBox();
});
updateCanvasBox();

editorCanvas.addEventListener("pointerdown", (event) => {
    canvasClick(event);
});

const editorRemoveButton = $("#editor-selector-remove")[0];
async function updateEditorRemoveButton() {
    editorRemoveButton.innerHTML = await SVG("media/icons/DELETE.svg");
    colorSVG(editorRemoveButton, "setstrokeH", "setfillH");
}
updateEditorRemoveButton();
/* Setup END */

const variantMenu      = $("#editor-tileVariants")[0];
const variantContainer = $("#editor-tileVariants-container")[0]; // Not needed by editorSelect(...)!
const parser = new DOMParser();                                  // Not needed by editorSelect(...)!
function editorSelect(name) {
    loaded = false;

    modeSelect(Modes.Place);

    // Assignment
    tilehead = metadata.main[name];

    // ID
    ID = name;

    // Total variant amount
    totalVariants = variants(ID).length;
    $("#editor-tiledetails-variantT")[0].innerText = totalVariants;

    // Rotation reset
    if (rotation != 0) rotate(4-rotation); // Resets to 0 (degrees)

    // Tile variants menu
    updateVariants(variants(ID));

    // Current variant, global variable `variant` set by function.
    // Done in updateVariants(...)!
    //variate(latestVariants.has(ID) ? latestVariants.get(ID) : 0); // Session-persistent

    // Name, after set variant
    $("#editor-tiledetails-name")[0].innerText = tilehead.display;

    // Image
    // Image is updated by variate(...).
}
function updateVariants(variantArray) {
    // Tile variants menu

    variantMenu.style.display = totalVariants > 1 ? "initial" : "none";

    Promise.all(variantArray.map(entry =>
        fetch(`media/tiles/${entry}.svg`)
            .then((res) => res.text())
            .then((text) => ({entry, text}))
        )).then((results) => {
            variantContainer.innerHTML = "";

            // Sort and store
            const sortedResults = variantArray.map(item => 
                results.find(r => r.entry === item)
            );
            
            let counter = 0;
            sortedResults.forEach((item) => {
                const string = `<span value="${counter}" onclick="window.editorUIvariantSelect(${counter});">${item.text}</span>`;
                const element = parser.parseFromString(string, "text/html").body.firstChild;

                // The SVG element
                const SVG = element.firstElementChild;
                const viewport = SVG.getAttribute("viewBox").split(" ");

                SVG.setAttribute("width",  `${viewport[2]}px`);
                SVG.setAttribute("height", `${viewport[3]}px`);
                element.style.gridRow    = `span ${viewport[3]/tileSize}`;
                element.style.gridColumn = `span ${viewport[2]/tileSize}`;
                colorSVG(SVG);

                // The label
                const labelString = `<span class="editor-tileVariants-label">${counter}</span>`;
                const label = parser.parseFromString(labelString, "text/html").body.firstChild;
                SVG.appendChild(label);

                variantContainer.appendChild(element);
                counter++;
            });
            
            // Current variant, global variable `variant` set by function.
            variate(latestVariants.has(ID) ? latestVariants.get(ID) : 0); // Session-persistent
    });
}
function UIvariantSelect(number) { variate(number); variantSelect(variant); }
function variantSelect(number) {
    const children = Array.from(variantContainer.children);
    children.forEach((element) => {
        element.style.backgroundColor = "unset";
    });
    children[number].style.backgroundColor = "var(--background-color)";
}

const cursorContainer = $("#editor-tiledetails-cursorWrapper")[0];
const imageContainer  = $("#editor-tiledetails-imageWrapper")[0];
function rotate(steps) {
    rotation = mod((rotation + steps), 4);
    imageRotation += steps;

    const angle = imageRotation * 90;
    $("#editor-tiledetails-rotation")[0].innerText      = rotation * 90;
    $("#editor-viewport-underneath")[0].style.transform = `rotate(${angle}deg)`;
    imageContainer.style.transform                      = `rotate(${angle}deg)`;
    cursorContainer.style.transform                     = `rotate(${angle}deg)`;
}
function variate(concrete) {
    variant = mod((concrete), totalVariants);
    $("#editor-tiledetails-variantN")[0].innerText = variant + 1;

    trueID = variants(ID)[variant];
    tiletrue = metadata.main[trueID] ?? metadata.aux[trueID];

    const size = tiletrue.size ?? tilehead.size;
    sizeX = size[0];
    sizeY = size[1];

    // Image is updated here, as late as possible as to not wait for the server.
    variate2(variant);

    variantSelect(variant);
} function variateStep(step) { variate(variant + step); }
/*const cursorContainer = $("#editor-tiledetails-cursorWrapper")[0];
const imageContainer  = $("#editor-tiledetails-imageWrapper")[0];*/
async function variate2(steps) {
    // Image is updated here, as late as possible as to not wait for the server.
    try {
        const response = await fetch(`media/tiles/${trueID}.svg`);
        if (!response.ok) {
            throw new Error(`Response error status: ${response.status}`);
        }
        const result = await response.text();

        // Image
        imageContainer.innerHTML = result;
        const imageElement = imageContainer.firstElementChild;

        imageElement.setAttribute("width",  "128px");
        imageElement.setAttribute("height", "128px");
        colorSVG(imageElement);

        // SizeX & SizeY
        $("#editor-tiledetails-sizeX")[0].innerText = sizeX;
        $("#editor-tiledetails-sizeY")[0].innerText = sizeY;

        // Cursor image
        cursorContainer.innerHTML = result;
        const cursorImageElement = cursorContainer.firstElementChild;
        cursorImageElement.setAttribute("width",  `${sizeX*tileSize}px`);
        cursorImageElement.setAttribute("height", `${sizeY*tileSize}px`);
        colorSVG(cursorImageElement);

        // Underneath
        underneath.style.width  = `${sizeX*tileSize}px`;
        underneath.style.height = `${sizeY*tileSize}px`;

        // Give the image its rotation
        rotate(0);

        loaded = true;
    }
    catch (error) {
        console.error(error.message);
    }
}

// Editor placing functionality
function canvasClick(event, _mode=mode) {
    /* Checks */
    if (!loaded) return;
    // Bounding checks done in the tile loop below.

    let cellsBuffer = cells;

    /* :OR Deletion */
    if (_mode == Modes.Delete) {
        if (cellsBuffer.has2Dv(cursorTilePosition)) {
            let tile = cellsBuffer.get2Dv(cursorTilePosition);
            let rootPosition = cursorTilePosition;

            if (tile instanceof Reserve) {
                rootPosition = tile.pointer; // BEFORE TILE ASSIGNMENT!
                tile = cellsBuffer.get2Dv(tile.pointer);
            } // tile is now guaranteed to be the header tile

            tile.reserves.forEach((reserve) => {
                cellsBuffer.del2Dv(reserve); // Delete all reserve tiles
            });
            cellsBuffer.del2Dv(rootPosition); // Delete the header tile

            SVGregister.get2Dv(rootPosition).remove();

            // Flush buffer
            cells = cellsBuffer;
        }

        //return;
    }

    /* :OR Data architecture and definitions */
    else if (_mode == Modes.Place) {
        const rootPoint = cursorTilePosition;
        let reserveCoords = [];
        for (let sx = 0; sx < sizeX; sx++) {
            for (let sy = 0; sy < sizeY; sy++) {
                const values = rotateAroundOrigin(sx, sy, rotation*90);
                const point = { x: values.x + rootPoint.x, y: values.y + rootPoint.y };

                if (cellsBuffer.has2D(point.x, point.y)) return; // Would conflict.

                const connections = (tiletrue.connections ?? tilehead.connections ?? [])
                    [toTextVector(sx, sy)].map(connection => ({
                        ...connection,
                        facing: Sides[(Sides[connection.facing] + rotation) % 4]
                }));
                const attributes = tiletrue.attributes ?? tilehead.attributes ?? [];

                if (sy != 0 || sx != 0) {
                    // `connections` DOES incorporate cell rotation
                    cellsBuffer.set2Dv(point, new Reserve(rootPoint.x, rootPoint.y,
                        connections, attributes)); //
                    
                    reserveCoords.push(new Vector2(point.x, point.y));
                } else {
                    // Write Tile to rootPoint
                    // `connections` DOES incorporate cell rotation
                    cellsBuffer.set2Dv(rootPoint, new Tile(trueID, rotation, reserveCoords,
                        connections, attributes)); //
                }
            }
        }

        // Flush buffer
        cells = cellsBuffer;

        canvasPlaceSVG(trueID, cursorTilePositionAbsolute, rotation);
    }
    
    //console.log(cells);
}
const editorCanvasCellWrapper = $("#editor-canvas-cellsWrapper")[0]
function canvasPlaceSVG(trueID, absoluteRootPoint, rotation) {
    /* SVG placement */
    const tile = document.createElement("span");

    /*try {
        const response = await fetch(`media/tiles/${trueID}.svg`);
        if (!response.ok) {
            throw new Error(`Response error status: ${response.status}`);
        }
        const result = await response.text();

        tile.innerHTML = result;
    } catch (error) {
        console.error(error);
    }*/
    tile.innerHTML = imageContainer.innerHTML;

    const SVG = tile.firstElementChild;
    // SizeX & SizeY
    SVG.setAttribute("width",  `${sizeX*tileSize}px`);
    SVG.setAttribute("height", `${sizeY*tileSize}px`);

    tile.style.left      = `${absoluteRootPoint.x * 64}px`;
    tile.style.top       = `${absoluteRootPoint.y * 64}px`;
    tile.style.transform = `rotate(${rotation*90}deg)`;

    editorCanvasCellWrapper.appendChild(tile);

    // Register the tile
    SVGregister.set2Dv(toRelativeTileCoordinates(absoluteRootPoint), tile);
}

// class Tile & class Reserve can be found in the editor utilities script.

function modeSelect(_mode) {
    mode = _mode;
    //                                        None           Place          Select         Delete         Processing
    const tiledetailsDisplay              = [ "inline-flex", "inline-flex", "inline-flex", "none",        "none"  ];
    const tiledetailsOpacity              = [ 0.5,           "unset",       "unset",       "unset",       "unset" ];
    const tiledetailsTextinfoDisplay      = [ "unset",       "unset",       "unset",       "unset",       "unset" ];
    const tilevardetWrapperDisplay        = [ "inline-flex", "inline-flex", "none",        "none",        "none"  ];
    const tiledetailsButtonsPointerEvents = [ "none",        "all",         "none",        "none",        "unset" ];
    const tiledetailsCursorDisplay        = [ "none",        "unset",       "none",        "none",        "none"  ];
    const tiledetailsSelectorDisplay      = [ "unset",       "unset",       "unset",       "unset",       "none"  ];

    const n = _mode + 1; // If begins with None, _mode is [-1]-based.

    $("#editor-tiledetails"          )[0].style.display        = tiledetailsDisplay[n];
    $("#editor-tiledetails"          )[0].style.opacity        = tiledetailsOpacity[n];
    $("#editor-tiledetails-textinfo" )[0].style.display        = tiledetailsTextinfoDisplay[n];
    $("#editor-tilevardetWrapper"    )[0].style.display        = tilevardetWrapperDisplay[n];
    $("#editor-tiledetails-buttons"  )[0].style.pointerEvents  = tiledetailsButtonsPointerEvents[n];
    $("#editor-tiledetails-cursor"   )[0].style.display        = tiledetailsCursorDisplay[n];
    $("#editor-selector"             )[0].style.display        = tiledetailsSelectorDisplay[n];
}

const errorSVGs = $("#editor-viewport-errorWrapper")[0];
function clearErrors() { errorSVGs.innerHTML = ""; }
function appendError(coordsX, coordsY) {
    const element = document.createElement("div");
    element.classList.add("editor-viewport-error");
    element.innerHTML = "&nwarr;";
    element.style.left = `${coordsX}px`;
    element.style.top  = `${coordsY}px`;
    errorSVGs.appendChild(element);
}

/* Function+ globalization */
window.editorRotate          = rotate;
window.editorVariateStep     = variateStep;
window.editorEditorSelect    = editorSelect;
window.editorUIvariantSelect = UIvariantSelect;
window.editorModeSelect      = modeSelect;
window.editorAppendError     = appendError;
window.editorClearErrors     = clearErrors;
window.editorModes           = Modes;
//window.editorTilesize      = tileSize;
//window.editorCanvasBox     = canvasBox;
/* Function+ globalization END */

/* Persistence */

/* Persistence END */

/* Utilities */

function colorSVG(elem, strokeclass="setstroke", fillclass="setfill") {
    const stroke = elem.getAttribute("stroke");
    const fill   = elem.getAttribute("fill");
    if (stroke != null && stroke != "none") elem.classList.add(strokeclass);
    if (fill   != null && fill   != "none") elem.classList.add(fillclass);
    
    // Recursively process child elements
    Array.from(elem.children).forEach(child => {
        colorSVG(child, strokeclass, fillclass);
    });
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

/* Source: https://dev.to/codepo8/quick-solution-getting-the-mouse-position-on-an-element-regardless-of-positioning-1pa2, modified*/
function getCursorPosition(event, element) {
  // Get the current mouse position in the browser
  let x = event.clientX;
  let y = event.clientY;
  // Get the position of the element the handler was applied to
  let pos = element.getBoundingClientRect();
  /* Subtract the position of the element
   * (rounded up to the next integer)
   * from the mouse position and return it. */
  return {
    x: x - pos.x|1,
    y: y - pos.y|1
  };
}
/* End of Source*/

// + scripts/tab-editor-utilities.js

async function SVG(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Response error status: ${response.status}`); return null;
        }
        return await response.text();
    } catch (error) {
        console.error(error);
        return null;
    }
}

/*function toAbsoluteTileCoordinates(vector) {
    return {
        x: vector.x + Math.floor(canvasSizeTiles.x/2),
        y: vector.y + Math.floor(canvasSizeTiles.y/2)
    };
}*/
function toRelativeTileCoordinates(vector) {
    return {
        x: vector.x - Math.floor(canvasSizeTiles.x/2),
        y: vector.y - Math.floor(canvasSizeTiles.y/2)
    };
}


/* Utilities END */