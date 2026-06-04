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
/* Config END */

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

/* Setup END */

/* Runtime variables */
let launched = false;
let ID = "resistor"; // Fallback name
let rotation = 0; // 0, 1, 2, 3
let totalVariants = 1;
let variant  = 0; // code-wise zero-based, UI-wise one-based
/* Runtime variables END */

async function editorSelect(name) {
    launched = true;

    // ID, Name
    ID = name;
    $("#editor-tiledetails-name")[0].innerText = componentNames.get(name);

    // Current variant
    variate(4-variant); // Resets to 0 (degrees)
    // Variate before rotation as rotation needs image.

    // Rotation reset
    rotate(4-rotation); // Resets to 0 (degrees)

    // Total variant amount
    totalVariants = variants.get(name).length;
    $("#editor-tiledetails-variantT")[0].innerText = totalVariants;

    // Image is updated by variate(...).
}

function rotate(steps) {
    rotation = mod((rotation + steps), 4);
    $("#editor-tiledetails-rotation")[0].innerText = rotation * 90;
    // Here, firstElementChild as to not rotate the background too!.
    // This will be the main SVG tag pair.
    console.log($("#editor-tiledetails-image")[0]);
    $("#editor-tiledetails-image")[0].firstElementChild.setAttribute("transform", `rotate(${rotation*90})`);
}
function variate(steps) {
    variant = mod((variant + steps), totalVariants);
    $("#editor-tiledetails-variantN")[0].innerText = variant + 1;

    // Image is updated here, as late as possible as to not wait for the server.
    variate2(steps);
}
async function variate2(steps) {
    // Image is updated here, as late as possible as to not wait for the server.
    try {
        const response = await fetch(`media/tiles/${variants.get(ID)[variant]}.svg`);
        if (!response.ok) {
            throw new Error(`Response error status: ${response.status}`);
        }
        const result = await response.text();

        // Image
        const container = $("#editor-tiledetails-image")[0];
        container.innerHTML = result;
        const imageElement = container.firstElementChild;

        imageElement.setAttribute("width",  "128px");
        imageElement.setAttribute("height", "128px");
        colorSVG(imageElement);

        // SizeX & SizeY
        const viewport = imageElement.getAttribute("viewBox").split(" ");
        $("#editor-tiledetails-sizeX")[0].innerText = viewport[2]/64;
        $("#editor-tiledetails-sizeY")[0].innerText = viewport[3]/64;
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
    if (fill   != null && fill   != "none")   elem.classList.add("setfill");
    
    // Recursively process child elements
    Array.from(elem.children).forEach(child => {
        colorSVG(child);
    });
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

/* Utilities END */