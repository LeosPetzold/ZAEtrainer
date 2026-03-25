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

class SchematicTile {
    constructor(type, x, y, rotation, data = {}) {
        this.type = type;
        this.x = x; // center-origin coordinates
        this.y = y;
        this.rotation = rotation || 0; // 0, 90, 180, 270
        this.data = data; // { name, value, unit }
        this.element = null;
    }

    getTileSize() {
        // Approximate 20mm in CSS px at 96dpi: 20 * 96 / 25.4
        return 75.5905511811;
    }

    render(container, centerX, centerY, scale = 1) {
        const size = this.getTileSize() * scale;
        
        // Position in screen space
        // x, y are in tile units (1.0 = one tile width)
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
        tileImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `media/tiles/tile-${this.type}.svg`);
        tileImage.setAttribute("x", -size / 2);
        tileImage.setAttribute("y", -size / 2);
        tileImage.setAttribute("width", size);
        tileImage.setAttribute("height", size);
        group.appendChild(tileImage);

console.log(this.data);

        // Add data label if present
        if (this.data.id || this.data.voltage || this.data.amperage || this.data.resistance) {

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("class", "schematic-tile-label");
            label.setAttribute("text-anchor", "middle");

            let textOffsetX = 0;
            let textOffsetY = 0;

            let closeupOffset = 0;

            let doLines = this.rotation % 180 == 0;
                label.setAttribute("x", 0);
                label.setAttribute("y", size / 2 + 14);
            switch (this.type) {
                case "voltage-source":
                    closeupOffset = 9;
                    break;
                case "amperage-source":
                    closeupOffset = 13;
                    break;
                case "resistor":
                    doLines = this.rotation % 180 != 0; // ! Fix .svg!
                    closeupOffset = 22;
                    break;
                case "capacitor":
                    doLines = this.rotation % 180 != 0; // ! Fix .svg!
                    closeupOffset = 7;
                    break;
            }

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
                    const pom = 0.5*this.getTileSize();
                    transformAttr += ` translate(${textOffsetX + pom - closeupOffset} ${textOffsetY - pom})`;
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

            // Center multiline vertical text block around label y-anchor
            if (doLines && lineIndex > 1) {
                const lineStepEm = 1.2; // must match tspan dy
                const shiftUpEm = ((lineIndex - 1) * lineStepEm) / 2 + lineStepEm / 2;
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
    async loadXML(xmlPath) {
        try {
            const response = await fetch(xmlPath);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                console.error("XML Parse Error:", xmlDoc.getElementsByTagName("parsererror")[0].textContent);
                return false;
            }

            const tilesRoot = xmlDoc.getElementsByTagName("tiles")[0];

            const tileElements = tilesRoot.getElementsByTagName("tile");
            for (const tileEl of tileElements) {
                const type = tileEl.getAttribute("type");
                //const id = tileEl.getAttribute("id");
                const x = parseFloat(tileEl.getAttribute("x")) || 0;
                const y = parseFloat(tileEl.getAttribute("y")) || 0;
                const rotation = parseFloat(tileEl.getAttribute("rotation")) || 0;

                const data = {
                    id: tileEl.getAttribute("id"),
                    voltage: tileEl.getAttribute("voltage"),
                    amperage: tileEl.getAttribute("amperage"),
                    resistance: tileEl.getAttribute("resistance"),
                };

                const tile = new SchematicTile(type, x, y, rotation, data);
                this.tiles.push(tile);
            }

            console.log(`Loaded ${this.tiles.length} tiles from XML`);
            return true;
        } catch (error) {
            console.error("Error loading XML:", error);
            return false;
        }
    }

    render(containerWidth, containerHeight) {
        // Clear previous tiles
        this.svgContainer.querySelectorAll(".schematic-tile").forEach(el => el.remove());

        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        // Render regular tiles first
        const regularTiles = this.tiles.filter(t => !['junction', 'dot'].includes(t.type));
        regularTiles.forEach(tile => {
            tile.render(this.svgContainer, centerX, centerY, this.scale);
        });

        // Render junction and dot tiles last (on top) so they override
        const topTiles = this.tiles.filter(t => ['junction', 'dot'].includes(t.type));
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
        }
    }
}

// Export for use in global scope
window.SchematicTile = SchematicTile;
window.SchematicLoader = SchematicLoader;
