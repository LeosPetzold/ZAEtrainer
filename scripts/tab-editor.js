/* Config*/
const selection = ["capacitor", "resistor-base", "source-current", "source-voltage", "terminal-wire-X", "wire-X"]; // In order

const componentNames = new Map();
componentNames.set("capacitor", "Kondenzátor");
componentNames.set("resistor-base", "Rezistor");
componentNames.set("source-current", "Proudový zdroj");
componentNames.set("source-voltage", "Napěťový zdroj");
componentNames.set("terminal-wire-X", "Vodič se svorkou");
componentNames.set("wire-X", "Vodič");

const variants = new Map();
// Capacitor
variants.set("capacitor", [ "capacitor" ]);
// Resistor
variants.set("resistor-base", [ "resistor-base", "resistor-arrow" ]);
// Current source
variants.set("source-current", [ "source-current" ])
// Voltage source
variants.set("source-voltage", [ "source-voltage" ])
// Terminal wire
variants.set("terminal-wire-X", [ "terminal-wire-I", "terminal-wire-L", "terminal-wire-T", "terminal-wire-X" ]);
// Wire
variants.set("wire-X", [ "wire-I", "wire-L", "wire-T", "wire-X" ]);

const canvasBorderWidth = 1; // One edge, in px
/* Config END */

/* Runtime variables */
let canvasBox;
let canvasSizeTiles = { x: 0, y: 0 };
let launched = false;
let ID = "resistor"; // Internal non-varianting ID, fallback ID set
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
const tileSize = 64; // Not dynamic with CSS. Not dynamic in CSS.

let cells = new Map() // Map-of-Maps;
/* Runtime variables END */

/* Setup */

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
            tileContainer.innerHTML += `<span class="editor-item-wrapper" onclick="editorSelect('${result.item}');">${result.text}</span>`;
        });

        colorSVG(tileContainer);
});

addEventListener("keypress", (event) => {
    if (launched) {
        switch(event.key) {
            case 'e':
            case 'E':
                variate(event.shiftKey ? -1 : +1);
                break;
            case 'r':
            case 'R':
                rotate(event.shiftKey ? -1 : +1);
                break;
            case 't':
            case 'T':
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

    if (launched) {
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
    canvasSizeTiles.x = Math.floor((canvasBox.width  - (2*canvasBorderWidth))/64);
    canvasSizeTiles.y = Math.floor((canvasBox.height - (2*canvasBorderWidth))/64);
}
addEventListener("resize", () => {
    updateCanvasBox();
});
updateCanvasBox();

editorCanvas.addEventListener("pointerdown", (event) => {
    canvasClick(event);
});

/* Setup END */

async function editorSelect(name) {
    loaded = false;
    launched = true;

    // Window opacity unsetting
    $("#editor-tiledetails")[0].style.opacity = "unset";

    // ID, Name
    ID = name;
    $("#editor-tiledetails-name")[0].innerText = componentNames.get(name);

    // Current variant
    variate(4-variant); // Resets to 0 (degrees)
    // Variate before rotation as rotation needs image.

    // Rotation reset
    if (rotation != 0) rotate(4-rotation); // Resets to 0 (degrees)

    // Total variant amount
    totalVariants = variants.get(name).length;
    $("#editor-tiledetails-variantT")[0].innerText = totalVariants;

    // Image is updated by variate(...).
}

const cursorContainer = $("#editor-tiledetails-cursorWrapper")[0];
const imageContainer  = $("#editor-tiledetails-imageWrapper")[0];
function rotate(steps) {
    rotation = mod((rotation + steps), 4);
    imageRotation += steps;

    const angle = imageRotation * 90;
    $("#editor-tiledetails-rotation")[0].innerText       = rotation * 90;
    $("#editor-viewport-underneath")[0].style.transform  = `rotate(${angle}deg)`;
    imageContainer.style.transform                       = `rotate(${angle}deg)`;
    cursorContainer.style.transform                      = `rotate(${angle}deg)`;
}
function variate(steps) {
    variant = mod((variant + steps), totalVariants);
    $("#editor-tiledetails-variantN")[0].innerText = variant + 1;

    // Image is updated here, as late as possible as to not wait for the server.
    trueID = variants.get(ID)[variant]
    variate2(steps);
}
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
        const viewport = imageElement.getAttribute("viewBox").split(" ");
        sizeX = viewport[2]/tileSize;
        sizeY = viewport[3]/tileSize;
        $("#editor-tiledetails-sizeX")[0].innerText = sizeX;
        $("#editor-tiledetails-sizeY")[0].innerText = sizeY;

        // Cursor image
        cursorContainer.innerHTML = result;
        const cursorImageElement = cursorContainer.firstElementChild;
        cursorImageElement.setAttribute("width",  `${viewport[2]}px`);
        cursorImageElement.setAttribute("height", `${viewport[3]}px`);
        colorSVG(cursorImageElement);

        // Underneath
        underneath.style.width  = `${viewport[2]}px`;
        underneath.style.height = `${viewport[3]}px`;

        // Give the image its rotation
        rotate(0);

        loaded = true;
    }
    catch (error) {
        console.error(error.message);
    }
}

// Editor placing functionality
function canvasClick(event) {
    /* Checks */
    if (!launched) return;
    if (!loaded) return;
    // Bounding checks done in the tile loop below.

    let cellsBuffer = cells;

    /* Data architecture and definitions */
    const rootPoint = cursorTilePosition;
    let reserveCoords = [];
    for (let sx = 0; sx < sizeX; ++sx) {
        for (let sy = 0; sy < sizeY; ++sy) {
            const values = rotateAroundOrigin(sx, sy, rotation*90);
            const point = { x: sx + rootPoint.x, y: sy + rootPoint.y };

            console.log(point);

            if (cellsBuffer.has2D(point.x, point.y)) return; // Would conflict.

            if (sy != 0 || sx != 0) {
                cellsBuffer.set2D(point.x, point.y, new Reserve(rootPoint.x, rootPoint.y));
                reserveCoords.push(new Vector2(point.x, point.y));
            }
        }
    }
    // Write Tile to rootPoint
    cellsBuffer.set2D(rootPoint.x, rootPoint.y, new Tile(trueID, rotation, reserveCoords));
    
    // Flush buffer
    cells = cellsBuffer;
    console.log(cells);
    
    canvasPlaceSVG(trueID, cursorTilePositionAbsolute, rotation);
}
const editorCanvasCellWrapper = $("#editor-canvas-cellsWrapper")[0]
/*async */function canvasPlaceSVG(trueID, absoluteRootPoint, rotation) {
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
}

class Tile {
    ID;
    rotation;
    reserves = [];

    constructor(ID, rotation, reserves) {
        this.ID = ID;
        this.rotation = rotation;
        this.reserves = reserves;
    }
}
class Reserve {
    pointer;
    constructor(tileX, tileY) {
        this.pointer = new Vector2(tileX, tileY);
    }
}

/* Utilities */

function colorSVG(elem) {
    const stroke = elem.getAttribute("stroke");
    const fill   = elem.getAttribute("fill");
    if (stroke != null && stroke != "none") elem.classList.add("setstroke");
    if (fill   != null && fill   != "none") elem.classList.add("setfill");
    
    // Recursively process child elements
    Array.from(elem.children).forEach(child => {
        colorSVG(child);
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

function rotateAroundOrigin(x, y, angle) { // Origin is always (0;0).
    // Accounting for clockwise nature of the canvas's web-coordinate system
    const radians = (angle / 180) * Math.PI; /// Ordering to minimise imprecisions

    const sin = Math.sin(radians);
    const cos = Math.cos(radians);

    // Apply rotation matrix formulas
    // (See: https://en.wikipedia.org/wiki/Rotation_matrix)
    const X = (x*cos)-(y*sin);
    const Y = (x*sin)+(y*cos);

    // Rounding to *6 DECIMAL DIGITS*!
    return { x: parseFloat(X.toFixed(6)), y: parseFloat(Y.toFixed(6)) };
}

// cell Map-of-Maps; Source: web boilerplate, modified
Map.prototype.set2D = function setCell(x, y, value) {
    let col = this.get(x);
    if (!col) {
        col = new Map();
        this.set(x, col);
    }
    col.set(y, value);
}
Map.prototype.get2D = function getCell(x, y) {
    const col = this.get(x);
    return col ? (col.get(y) ?? null) : null;
}
Map.prototype.has2D = function hasCell(x, y) {
    const col = this.get(x);
    return !!col && col.has(y);
}
Map.prototype.del2D = function delCell(x, y) {
    const col = this.get(x);
    if (!col) return;
    col.delete(y);
    if (col.size === 0) this.delete(x);
}

class Vector2 {
    x; y;
    constructor(x, y) { this.x = x; this.y = y; }
}

/* Utilities END */