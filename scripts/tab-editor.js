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
let ID = "resistor"; // Fallback name
let rotation = 0; // 0, 1, 2, 3
let imageRotation = 0; // step=1, range +-360deg., that is mod 4
let totalVariants = 1;
let variant  = 0; // Code-wise zero-based, UI-wise one-based
let sizeX = 1; // Current selected tile size
let sizeY = 1; // Current selected tile size
let cursorTilePosition         = { x: 0, y: 0 };
let cursorTilePositionAbsolute = { x: 0, y: 0 };
let cursorCanvasPosition       = { x: 0, y: 0 }; // Does **NOT** include borders
const tileSize = 64; // Not dynamic with CSS. Not dynamic in CSS.
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
});

// const editorCanvas = $("#editor-viewport-canvas")[0];
function updateCanvasBox() {
    canvasBox = editorCanvas.getBoundingClientRect();
    canvasSizeTiles.x = (canvasBox.width  - (2*canvasBorderWidth))/64;
    canvasSizeTiles.y = (canvasBox.height - (2*canvasBorderWidth))/64;
}
addEventListener("resize", () => {
    updateCanvasBox();
});
updateCanvasBox();

/* Setup END */

async function editorSelect(name) {
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

function rotate(steps) {
    rotation = mod((rotation + steps), 4);
    imageRotation += steps;

    const angle = imageRotation * 90;
    $("#editor-tiledetails-rotation")[0].innerText = rotation * 90;
    $("#editor-viewport-underneath")[0].style.transform       = `rotate(${angle}deg)`;
    $("#editor-tiledetails-imageWrapper")[0].style.transform  = `rotate(${angle}deg)`;
    $("#editor-tiledetails-cursorWrapper")[0].style.transform = `rotate(${angle}deg)`;
}
function variate(steps) {
    variant = mod((variant + steps), totalVariants);
    $("#editor-tiledetails-variantN")[0].innerText = variant + 1;

    // Image is updated here, as late as possible as to not wait for the server.
    variate2(steps);
}
const cursorContainer = $("#editor-tiledetails-cursorWrapper")[0];
const imageContainer  = $("#editor-tiledetails-imageWrapper")[0];
async function variate2(steps) {
    // Image is updated here, as late as possible as to not wait for the server.
    try {
        const response = await fetch(`media/tiles/${variants.get(ID)[variant]}.svg`);
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
        SizeY = viewport[3]/tileSize;
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
    }
    catch (error) {
        console.error(error.message);
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

/* Source: https://dev.to/codepo8/quick-solution-getting-the-mouse-position-on-an-element-regardless-of-positioning-1pa2 */
function getCursorPosition(event, element) {
  // get the current mouse position in the browser
  let x = event.clientX;
  let y = event.clientY;
  // get the position of the element you applied the handler to
  let pos = element.getBoundingClientRect();
  // subtract the position of the element (rounded up to the next
  // integer) from the mouse position and return it.
  return {
    x: x - pos.x|1,
    y: y - pos.y|1
  };
}


/* Utilities END */