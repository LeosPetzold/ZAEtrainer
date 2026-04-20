/**
 * Schematic Tile System
 * Loads XML schematics and renders modular circuit tiles with seamless wire connections.
 * 
 * Design Principle:
 *   - Tiles are INVISIBLE; only the circuit diagram is visible
 *   - Wires extend edge-to-edge within each tile so adjacent tiles connect seamlessly
 *   - Components are modular but appear as one continuous circuit
 * 
 * Coordinate System:
 *   - Origin (0, 0) is at the center of the schematic viewport
 *   - X and Y are expressed in TILE UNITS (1.0 = one tile width/height ~= 20mm)
 *   - Example: x=1, y=0 places tile one tile-width to the right of center
 * 
 * Component Design (all tiles ~= 20mm × 20mm):
 *   - Each component has wires extending to tile edges for seamless connection
 *   - Resistor: left wire (32px) + elongated rectangle body (64px wide) + right wire (32px)
 *   - Voltage source: left wire (40px) + circle+symbol (24px dia) + right wire (40px)
 *   - Amperage source: left wire (40px) + circle+arrow (24px dia) + right wire (40px)
 *   - Capacitor: left wire (48px) + two plates (16px apart) + right wire (48px)
 *   - Wire: full 120px wire across entire tile edge-to-edge
 *   - Half-wire: extends from tile center (64,64) to edge (128,64), rotates for corners
 * 
 * Corner Formation:
 *   - Two half-wires at the same position with different rotations form a corner
 *   - Half-wire rotation 0°: points up; 90°: points right; 180°: points down; 270°: points left
 *   - Example: half-wire at rot=90° + half-wire at rot=180° = L-shaped corner
 */

let magnitudes = new Map();
magnitudes.set(-15, "f");
magnitudes.set(-12, "p");
magnitudes.set(-9, "n");
magnitudes.set(-6, "µ");
magnitudes.set(-3, "m");
magnitudes.set(0, "");
magnitudes.set(3, "k");
magnitudes.set(6, "M");
magnitudes.set(9, "G");
magnitudes.set(12, "T");
magnitudes.set(15, "P");

let methods = new Map();

const tileSize = 20 * (96 / 25.4); // 20mm tiles on screen, // ! change approach here.
const isSafariEngine = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

class SchematicTile {
    constructor(type, x, y, rotation, data = {}) {
        this.type = type;
        this.x = x; // schematic center is origin
        this.y = y - 1;
        this.rotation = rotation || 0;
        this.data = data;
        this.element = null;
    }

    render(container, centerX, centerY, scale = 1) {
        const size = tileSize * scale;

        const screenX = centerX + (this.x * size);
        const screenY = centerY + (this.y * size);

        // Create tile group
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", `tile-${this.id}`);
        group.setAttribute("class", `schematic-tile tile-${this.type}`);
        group.setAttribute("data-tile-id", this.id);
        group.setAttribute("transform", `translate(${screenX}, ${screenY}) rotate(${this.rotation})`);

        // Load tile SVG
        const tileImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
        // Safari compatibility: set both href and xlink:href on SVG <image>.
        tileImage.setAttribute("href", `media/tiles/tile-${this.type}.svg`);
        tileImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `media/tiles/tile-${this.type}.svg`);
        tileImage.setAttribute("x", -size / 2);
        tileImage.setAttribute("y", -size / 2);
        tileImage.setAttribute("width", size);
        tileImage.setAttribute("height", size);
        group.appendChild(tileImage);

        // Add data label if present
        if (this.data.id || this.data.voltage || this.data.amperage || this.data.resistance || this.data.capacity) {

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("class", "schematic-tile-label");
            label.setAttribute("text-anchor", "middle");

            let textOffsetX = 0;
            let textOffsetY = 0;

            let closeupOffset = 0;

            let doLines = this.rotation % 180 == 0;
            label.setAttribute("x", 0);
            switch (this.type) {
                case "voltage-source":
                    closeupOffset = 14;
                    break;
                case "amperage-source":
                    closeupOffset = 16;
                    break;
                case "resistor":
                    doLines = this.rotation % 180 != 0; // ! Fix .svg!
                    closeupOffset = 22;
                    break;
                case "capacitor":
                    doLines = this.rotation % 180 != 0; // ! Fix .svg!
                    closeupOffset = 12;
                    break;
                case "terminal":
                    closeupOffset = 30;
                    break;
            }

            // Set y AFTER switch, so it uses the final doLines value
            label.setAttribute("y", doLines ? size / 2 : size / 2 + 14);

            const textRotation = parseFloat(-this.rotation);

            let lineIndex = 0;
            const addLine = (text, subText = "", /*newLine = true*/) => {
                let newLine = doLines;
                const t = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                if (newLine) {
                    t.setAttribute("x", "0");
                    if (lineIndex > 0) t.setAttribute("dy", "1.2em");
                    t.appendChild(document.createTextNode(text));
                } else {
                    const inlineText = lineIndex > 0 ? ` ${text}` : text;
                    t.appendChild(document.createTextNode(inlineText));
                }

                const sub = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                sub.setAttribute("baseline-shift", "sub");
                sub.setAttribute("font-size", "70%");
                sub.textContent = subText;
                t.appendChild(sub);

                label.appendChild(t);
                lineIndex += 1;

                let transformAttr = "";
                if (textRotation % 360 != 0) {
                    const bbox = label.getBBox();
                    const cx = bbox.x + bbox.width / 2;
                    const cy = bbox.y + bbox.height / 2;
                    transformAttr += `rotate(${textRotation} ${cx} ${cy})`;
                }
                if (newLine) {
                    const pom = 0.5 * tileSize;
                    const safariLabelYOffset = isSafariEngine ? 4 : 0;
                    transformAttr += ` translate(${textOffsetX + pom - closeupOffset} ${textOffsetY - pom + 1.5 + safariLabelYOffset})`;
                    label.setAttribute("dominant-baseline", "middle");

                } else
                    transformAttr += ` translate(${textOffsetX} ${textOffsetY - closeupOffset})`;
                label.setAttribute("transform", transformAttr);

                label.setAttribute("text-anchor", newLine ? "start" : "middle");
            };

            if (this.data.id) {
                const idData = this.data.id.split(" ");
                addLine(idData[0], idData[1] || "");
            }
            if (this.data.voltage) addLine(this.data.voltage + "V");
            if (this.data.amperage) addLine(this.data.amperage + "A");
            if (this.data.resistance) addLine(this.data.resistance + "Ω");
            if (this.data.capacity) addLine(this.data.capacity + "F");

            // Center text block around label y-anchor (both single and multiple lines)
            if (doLines) {
                const lineStepEm = 1.2; // must match tspan dy
                const shiftUpEm = lineIndex > 1 ? ((lineIndex - 1) * lineStepEm) / 2 : 0;
                label.setAttribute("dy", `-${shiftUpEm}em`);
                label.setAttribute("dominant-baseline", "middle");
                label.setAttribute("text-anchor", "start");
            }

            if (lineIndex > 0) group.appendChild(label);
        }

        container.appendChild(group);
        this.element = group;
        return group;
    }
}

class SchematicLoader {
    constructor(svgContainer) {
        this.svgContainer = svgContainer;
        this.tiles = [];
        this.scale = 1;
        this.loadVersion = 0;
    }

    /**
     * Load schematic from XML
     * Expected XML format (each component = 1 tile):
     * <schematic>
     *   <tiles>
     *     <!-- Voltage source: single tile (wire + body + wire) -->
     *     <tile type="voltage-source" id="V1" x="0" y="0" rotation="0" name="V1" value="12" unit="V"/>
     *     
     *     <!-- Resistor: single tile (wire + body + wire) -->
     *     <tile type="resistor" id="R1" x="1" y="0" rotation="0" name="R1" value="120" unit="Ω"/>
     *     
     *     <!-- Wire: single tile -->
     *     <tile type="wire" id="W1" x="2" y="0" rotation="0"/>
     *     
     *     <!-- Corner: two half-wires at same position, different rotations -->
     *     <tile type="half-wire" id="HW1" x="3" y="0" rotation="90"/>
     *     <tile type="half-wire" id="HW2" x="3" y="0" rotation="180"/>
     *   </tiles>
     * </schematic>
     */

    async loadXML(xmlPath, variant, seed) {
        const requestVersion = ++this.loadVersion;
        this.rng = new RandomNumberGenerator(seed);

        // Start each load from a clean state.
        this.tiles = [];
        this.clear();

        try {
            $("#instructionsparams")[0].innerHTML = ""; // Clear out instructions

            const response = await fetch(xmlPath);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            if (requestVersion !== this.loadVersion) {
                return false;
            }

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throwError("XML Parse Error: "+xmlDoc.getElementsByTagName("parsererror")[0].textContent)
                return false;
            }

            const tilesRoot = xmlDoc.getElementsByTagName("tiles")[0];

            const tileElements = tilesRoot.getElementsByTagName("tile");
            const parsedTiles = [];
            for (const tileEl of tileElements) {
                const type = tileEl.getAttribute("type");
                //const id = tileEl.getAttribute("id");
                const x = parseFloat(tileEl.getAttribute("x")) || 0;
                const y = parseFloat(tileEl.getAttribute("y")) || 0;
                const rotation = parseFloat(tileEl.getAttribute("rotation")) || 0;

                const data = {
                    id: tileEl.getAttribute("id"),
                    voltage: this.processInput(tileEl.getAttribute("voltage")),
                    amperage: this.processInput(tileEl.getAttribute("amperage")),
                    resistance: this.processInput(tileEl.getAttribute("resistance")),
                    capacity: this.processInput(tileEl.getAttribute("capacity")),
                };

                // Register all into instructions &
                // Register all into global circuit
                if (data.id) {
                    const parts = data.id.split(' ');
                    parts[1] = parts[1] || "";

                    let base; let primaryValue; let unit; let instructionWorthy = true;
                    if (data.voltage) { base = "U"; unit = "V"; primaryValue = data.voltage }
                    else if (data.amperage) { base = "I"; unit = "A"; primaryValue = data.amperage }
                    else if (data.resistance) { base = "R"; unit = "&ohm;"; primaryValue = data.resistance }
                    else if (data.capacity) { base = "C"; unit = "F"; primaryValue = data.capacity }
                    else instructionWorthy = false;
                    
                    if (instructionWorthy) {
                        circuit[base + parts[1]] = primaryValue;
                        $("#instructionsparams")[0].innerHTML += `${base}<sub>${parts[1]}</sub> = <b>${primaryValue}</b>${unit}<br>`;
                    }
                }

                const tile = new SchematicTile(type, x, y, rotation, data);
                parsedTiles.push(tile);
            }

            // Parse solutions
            const methodsElement = xmlDoc.getElementsByTagName("methods")[0];
            methods = new Map();
            let options = "";
            if (methodsElement) {
                const methodsList = methodsElement.getElementsByTagName("method");
                for (const method of methodsList) {
                    methods.set(method.getAttribute("name") || "[Bez názvu]", eval(method.textContent) || "[Prázdné řešení]");
                }
                methods.forEach((value, key) => {
                    options += `<option value="${key}">${key}</option>`;
                });
            }

            $("#methodSelect")[0].innerHTML = options;
            $("#methodSelect").off("change").on("change", function() {
                updateMethod(this.value);
            });
            updateMethodBlind();


            if (requestVersion !== this.loadVersion) {
                return false;
            }

            this.tiles = parsedTiles;

            console.log(`Loaded ${this.tiles.length} tiles from XML`);
            return true;
        } catch (error) {
            throwError("Error loading XML: "+error)
            return false;
        }
    }
    processInput(value) {
        if (!value) return null;

        try {
            const parts = value.split('e');

            if (value.includes("rand")) {
                const randParts = value.split(';'); // rand;<min>;<max>;<multiplier-exponential>
                parts[0] = this.rng.int(randParts[1], randParts[2]);
                parts[1] = randParts[3];
            }

            const exp = parseInt(parts[1]) || 0;
            const remainder = exp % 3;
            const base = parseFloat(parts[0]) * (10 ** remainder);
            const magnitude = exp - remainder;
            const suffix = magnitudes.get(magnitude);

            return base + suffix;
        }
        catch (error) {
            throwError("Error processing tile XML: "+error);
            return false;
        }
    }

    clear() {
        // Clear all tiles
        this.svgContainer.querySelectorAll(".schematic-tile").forEach(el => el.remove());
    }

    render(containerWidth, containerHeight) {
        // Clear previous tiles
        this.clear();

        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        // Render regular tiles first
        const regularTiles = this.tiles.filter(t => !['junction', 'dot'].includes(t.type));
        regularTiles.forEach(tile => {
            tile.render(this.svgContainer, centerX, centerY, this.scale);
        });

        // Render junction, dot, and terminal tiles last (on top) so they override
        const topTiles = this.tiles.filter(t => ['junction', 'dot', 'terminal'].includes(t.type));
        topTiles.forEach(tile => {
            tile.render(this.svgContainer, centerX, centerY, this.scale);
        });
    }

    setScale(scale) {
        this.scale = scale;
    }

    getTile(id) {
        return this.tiles.find(t => t.id === id);
    }

    updateTileData(id, data) {
        const tile = this.getTile(id);
        if (tile) {
            tile.data = { ...tile.data, ...data };
            // Re-render if already rendered
            if (tile.element) {
                // Remove old element
                tile.element.remove();
                // Re-render
                const container = this.svgContainer;
                const centerX = container.parentElement.clientWidth / 2;
                const centerY = container.parentElement.clientHeight / 2;
                tile.render(container, centerX, centerY, this.scale);
            }

            // Variant overrides
            const variants = tile.getElementsByName("variant");
            if (variants.length > 0) {
                const variant = variants[0];
                for (i=0; i<variant.attributes.length; i++) {
                    tile.setAttribute(variant.attributes[i].nodeName, variant.attributes[i].nodeValue);
                }
            }
        }
    }
}

// Export for use in global scope
window.SchematicTile = SchematicTile;
window.SchematicLoader = SchematicLoader;

function pseudoRandom(seed) {
    let value = seed;

    return function () {
        value = value * 16807 % 2147483647;
        return value;
    }
}

function updateMethodBlind() {
    updateMethod($("#methodSelect").val());
}
function updateMethod(key) {
    $('#solutionContents')[0].innerHTML = methods.get(key) || "<i>Žádné definované řešení.</i>";
}

const circuit = {};
window.circuit = circuit;