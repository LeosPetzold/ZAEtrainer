const magnitudes = new Map([
    [-15, "f"],
    [-12, "p"],
    [-9, "n"],
    [-6, "µ"],
    [-3, "m"],
    [0, ""],
    [3, "k"],
    [6, "M"],
    [9, "G"],
    [12, "T"],
    [15, "P"],
]);

let methods = new Map();

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const TOP_TILE_TYPES = ["junction", "dot", "terminal"];

const tileSize = 20 * (96 / 25.4); // 20mm tiles on screen, // ! change approach here.
const isSafariEngine = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const tileSvgTemplateCache = new Map();
const tileSvgTemplatePromiseCache = new Map();

const globalTileOffsetX = 0;
const globalTileOffsetY = 0;

window.schematicViewportMetrics = {
    tileSize,
    globalTileOffsetX,
    globalTileOffsetY,
};

function toLatexFraction(value, inMath) {
    const simplified = new Fraction(value).simplify(1e-8);
    const latex = simplified.toLatex();
    return inMath ? latex : `$${latex}$`;
}

function rethemeTileSvg(svgRoot) {
    const paintTargets = svgRoot.querySelectorAll("[stroke], [fill]");
    for (const node of paintTargets) {
        const stroke = node.getAttribute("stroke");
        if (stroke && stroke !== "none") {
            node.setAttribute("stroke", "currentColor");
        }

        const fill = node.getAttribute("fill");
        if (fill && fill !== "none") {
            node.setAttribute("fill", "currentColor");
        }
    }
}

async function getTileSvgTemplate(tilePath) {
    if (tileSvgTemplateCache.has(tilePath)) {
        return tileSvgTemplateCache.get(tilePath);
    }

    if (tileSvgTemplatePromiseCache.has(tilePath)) {
        return tileSvgTemplatePromiseCache.get(tilePath);
    }

    const loadingPromise = (async () => {
        const response = await fetch(tilePath);
        if (!response.ok) {
            throw new Error(`Failed to load tile SVG: ${tilePath}`);
        }

        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const template = svgDoc.documentElement;

        if (!template || template.nodeName.toLowerCase() !== "svg") {
            throw new Error(`Invalid SVG tile file: ${tilePath}`);
        }

        template.removeAttribute("width");
        template.removeAttribute("height");
        template.setAttribute("class", "schematic-tile-svg");
        template.setAttribute("overflow", "visible");
        rethemeTileSvg(template);

        tileSvgTemplateCache.set(tilePath, template);
        return template;
    })();

    tileSvgTemplatePromiseCache.set(tilePath, loadingPromise);

    try {
        return await loadingPromise;
    } finally {
        tileSvgTemplatePromiseCache.delete(tilePath);
    }
}

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

        const screenX = centerX + ((this.x + globalTileOffsetX) * size);
        const screenY = centerY + ((this.y + globalTileOffsetY) * size);

        // Create tile group
        const group = document.createElementNS(SVG_NS, "g");
        group.setAttribute("id", `tile-${this.id}`);
        group.setAttribute("class", `schematic-tile tile-${this.type}`);
        group.setAttribute("data-tile-id", this.id);
        group.setAttribute("transform", `translate(${screenX}, ${screenY}) rotate(${this.rotation})`);

        const tilePath = `media/tiles/tile-${this.type}.svg`;

        // Fallback image is shown only if inline SVG loading fails.
        const tileImage = document.createElementNS(SVG_NS, "image");
        tileImage.setAttribute("href", tilePath);
        tileImage.setAttributeNS(XLINK_NS, "xlink:href", tilePath);
        tileImage.setAttribute("x", -size / 2);
        tileImage.setAttribute("y", -size / 2);
        tileImage.setAttribute("width", size);
        tileImage.setAttribute("height", size);
        tileImage.setAttribute("visibility", "hidden");
        group.appendChild(tileImage);

        getTileSvgTemplate(tilePath)
            .then((template) => {
                const inlineSvg = document.importNode(template, true);
                inlineSvg.setAttribute("x", -size / 2);
                inlineSvg.setAttribute("y", -size / 2);
                inlineSvg.setAttribute("width", size);
                inlineSvg.setAttribute("height", size);
                inlineSvg.setAttribute("viewBox", template.getAttribute("viewBox") || "0 0 128 128");
                inlineSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

                if (group.contains(tileImage)) {
                    group.replaceChild(inlineSvg, tileImage);
                }
            })
            .catch(() => {
                tileImage.setAttribute("visibility", "visible");
            });

        // Add data label if present
        if (this.data.id || this.data.voltage || this.data.amperage || this.data.resistance || this.data.capacity) {
            const label = document.createElementNS(SVG_NS, "text");
            label.setAttribute("class", "schematic-tile-label");
            label.setAttribute("text-anchor", "middle");

            let textOffsetX = 0;
            let textOffsetY = 0;
            let closeupOffset = 0;

            const normalizedRotation = this.rotation % 360;
            let doLines = normalizedRotation % 180 === 0;

            label.setAttribute("x", 0);

            switch (this.type) {
                case "voltage-source":
                    closeupOffset = 14;
                    break;
                case "amperage-source":
                    closeupOffset = 16;
                    break;
                case "resistor":
                    doLines = normalizedRotation % 180 !== 0; // ! Fix .svg!
                    closeupOffset = 22;
                    break;
                case "capacitor":
                    doLines = normalizedRotation % 180 !== 0; // ! Fix .svg!
                    closeupOffset = 12;
                    break;
                case "terminal":
                    closeupOffset = 30;
                    break;
                case "wire":
                case "terminal-wire":
                case "terminal-half-wire-corner":
                    doLines = normalizedRotation % 180 !== 0; // ! Fix .svg!
                    closeupOffset = 30;
                    break;
                case "half-wire":
                case "terminal-half-wire":
                    doLines = normalizedRotation % 180 !== 0; // ! Fix .svg!
                    textOffsetX = (doLines ? 0 : tileSize / 4) + (normalizedRotation === 180 ? -tileSize / 2 : 0);
                    textOffsetY = (doLines ? tileSize / 4 : 0) + (normalizedRotation === 270 ? -tileSize / 2 : 0);
                    closeupOffset = 30;
                    break;
            }

            label.setAttribute("y", doLines ? size / 2 : size / 2 + 14);

            const textRotation = -normalizedRotation;

            let lineIndex = 0;
            const addLine = (text, subText = "", /*newLine = true*/) => {
                let newLine = doLines;
                const t = document.createElementNS(SVG_NS, "tspan");
                if (newLine) {
                    t.setAttribute("x", "0");
                    if (lineIndex > 0) t.setAttribute("dy", "1.2em");
                    t.appendChild(document.createTextNode(text));
                } else {
                    const inlineText = lineIndex > 0 ? ` ${text}` : text;
                    t.appendChild(document.createTextNode(inlineText));
                }

                if (subText) {
                    const sub = document.createElementNS(SVG_NS, "tspan");
                    sub.setAttribute("font-size", "70%");
                    sub.setAttribute("dy", "0.35em");
                    sub.setAttribute("dx", "0.04em");
                    sub.textContent = subText;
                    t.appendChild(sub);
                }

                label.appendChild(t);
                lineIndex += 1;

                let transformAttr = "";
                if (textRotation % 360 !== 0) {
                    const bbox = label.getBBox();
                    const cx = bbox.x + bbox.width / 2;
                    const cy = bbox.y + bbox.height / 2;
                    transformAttr += `rotate(${textRotation} ${cx} ${cy})`;
                }
                if (newLine) {
                    const halfTileSize = 0.5 * tileSize;
                    const safariLabelYOffset = isSafariEngine ? 4 : 0;
                    transformAttr += ` translate(${textOffsetX + halfTileSize - closeupOffset} ${textOffsetY - halfTileSize + 1.5 + safariLabelYOffset})`;
                    label.setAttribute("dominant-baseline", "middle");

                } else {
                    transformAttr += ` translate(${textOffsetX} ${textOffsetY - closeupOffset})`;
                }
                label.setAttribute("transform", transformAttr);

                label.setAttribute("text-anchor", newLine ? "start" : "middle");
            };

            if (this.data.id) {
                const idData = this.data.id.split(" ");
                //addLine(idData[0], idData[1] || "");
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
    constructor(svgContainer, inline = false, scale = 1) { // Inline (dry) run only renders schematic, doesn't process instructions or methods
        this.svgContainer = svgContainer;
        this.tiles = [];
        this.scale = scale;
        this.loadVersion = 0;
        this.full = !inline;
    }

    async loadXML(xmlPath, variant, seed) {
        loadstatShow();
        loadstatStatus("Načítám XML schéma..");

        const requestVersion = ++this.loadVersion; // Same-time loading prevention
        const setupResult = this.initializeLoadState(seed, variant);
        if (!setupResult.ok) {
            return false;
        }
        variant = setupResult.variant;

        try {
            $("#instructionsparams")[0].innerHTML = "";
            const xmlDoc = await this.fetchXmlDocument(xmlPath);

            if (requestVersion !== this.loadVersion) {
                return false;
            }

            if (!this.ensureXmlIsValid(xmlDoc)) {
                return false;
            }

            variant = this.applyTaskSection(xmlDoc, variant);
            const parsedTiles = this.parseTiles(xmlDoc, variant);

            loadstatStatus("Data post-processing..");
            this.renderInstructionRows(parsedTiles.instructionRows);
            this.parseMethods(xmlDoc, variant);

            if (requestVersion !== this.loadVersion) {
                return false;
            }

            this.tiles = parsedTiles.tiles;

            loadstatStatus("Načteno!");
            setTimeout(() => {
                loadstatHide();
            }, 800);

            console.log(`Loaded ${this.tiles.length} tiles from XML`);
            return true;
        } catch (error) {
            throwError("Error loading XML: " + error);
            return false;
        }
    }

    initializeLoadState(seed, variant) {
        try {
            window.circuit = circuit;
            Object.keys(circuit).forEach((key) => {
                delete circuit[key];
            });

            this.rng = new RandomNumberGenerator(seed);
            this.tiles = [];
            this.clear();

            return { ok: true, variant: Number(variant) };
        } catch (error) {
            throwError("Error setting up XML loader: " + error);
            return { ok: false, variant };
        }
    }

    async fetchXmlDocument(xmlPath) {
        const response = await fetch(xmlPath);
        const xmlText = await response.text();
        const parser = new DOMParser();
        return parser.parseFromString(xmlText, "text/xml");
    }

    ensureXmlIsValid(xmlDoc) {
        const parserErrors = xmlDoc.getElementsByTagName("parsererror");
        if (parserErrors.length > 0) {
            throwError("XML Parse Error: " + parserErrors[0].textContent);
            return false;
        }
        return true;
    }

    applyTaskSection(xmlDoc, variant) {
        const tasksRoot = xmlDoc.getElementsByTagName("task")[0];
        const taskVariants = tasksRoot ? Array.from(tasksRoot.getElementsByTagName("variant")) : [];
        const resolvedVariant = this.resolveVariant(variant, taskVariants);

        this.renderTaskInstructions(tasksRoot, taskVariants, resolvedVariant);
        $("#presetVariant")[0].innerText = resolvedVariant === -1 ? "základní" : resolvedVariant;

        return resolvedVariant;
    }

    resolveVariant(variant, taskVariants) {
        if (variant !== -1 || taskVariants.length === 0) {
            return variant;
        }

        const taskVariantIds = taskVariants
            .map((candidate) => Number.parseInt(candidate.getAttribute("id") || "", 10))
            .filter((id) => Number.isFinite(id));

        if (taskVariantIds.length > 0) {
            return this.rng.pick(taskVariantIds);
        }

        return variant;
    }

    renderTaskInstructions(tasksRoot, taskVariants, variant) {
        const hasVariant = variant >= 0;
        const selectedVariant = String(variant);

        if (!tasksRoot) {
            $("#instructionsquests")[0].innerHTML = "<i>Instrukce nebyly dány.</i>";
            return;
        }

        if (hasVariant && taskVariants.length > 0) {
            const taskVariant = taskVariants.find(
                (candidate) => (candidate.getAttribute("id") || "1") === selectedVariant
            ) || null;

            $("#instructionsquests")[0].innerHTML = taskVariant ? taskVariant.innerHTML : tasksRoot.textContent;
            return;
        }

        $("#instructionsquests")[0].innerHTML = tasksRoot.textContent;
    }

    parseTiles(xmlDoc, variant) {
        const tilesRoot = xmlDoc.getElementsByTagName("tiles")[0];
        const tilesOffsetX = parseFloat(tilesRoot?.getAttribute("offX")) || 0;
        const tilesOffsetY = parseFloat(tilesRoot?.getAttribute("offY")) || 0;
        const tileElements = tilesRoot.getElementsByTagName("tile");

        window.schematicXmlOffsets = {
            x: tilesOffsetX,
            y: tilesOffsetY,
        };

        const hasVariant = variant >= 0;
        const selectedVariant = String(variant);
        const parsedTiles = [];
        const instructionRows = [];

        let counter = 0;
        const tileElementsLength = tileElements.length;

        for (const tileEl of tileElements) {
            loadstatStatus(`Načítám blok ${counter + 1} z ${tileElementsLength}..`);

            const tile = this.parseSingleTile(tileEl, {
                hasVariant,
                selectedVariant,
                tilesOffsetX,
                tilesOffsetY,
            });

            parsedTiles.push(tile.instance);
            if (tile.instructionRow) {
                instructionRows.push(tile.instructionRow);
            }
        }

        return {
            tiles: parsedTiles,
            instructionRows,
        };
    }

    parseSingleTile(tileEl, options) {
        const { hasVariant, selectedVariant, tilesOffsetX, tilesOffsetY } = options;

        const type = tileEl.getAttribute("type");
        const x = (parseFloat(tileEl.getAttribute("x")) || 0) + tilesOffsetX;
        const y = (parseFloat(tileEl.getAttribute("y")) || 0) + tilesOffsetY;
        const rotation = parseFloat(tileEl.getAttribute("rotation")) || 0;

        const mergedAttributes = this.getMergedTileAttributes(tileEl, hasVariant, selectedVariant);
        const getTileAttribute = (name) => mergedAttributes[name] ?? null;

        const data = {
            id: tileEl.getAttribute("id"),
            voltage: this.processInput(getTileAttribute("voltage")),
            amperage: this.processInput(getTileAttribute("amperage")),
            resistance: this.processInput(getTileAttribute("resistance")),
            capacity: this.processInput(getTileAttribute("capacity")),
        };

        const instructionRow = this.buildInstructionRow(data);
        if (instructionRow) {
            circuit[instructionRow.base + instructionRow.sub] = Number(instructionRow.value);
        }

        return {
            instance: new SchematicTile(type, x, y, rotation, data),
            instructionRow,
        };
    }

    getMergedTileAttributes(tileEl, hasVariant, selectedVariant) {
        const tileVariants = tileEl.getElementsByTagName("variant");
        const variantTile = hasVariant
            ? Array.from(tileVariants).find((candidate) => (candidate.getAttribute("id") || "1") === selectedVariant) || null
            : null;

        if (hasVariant && variantTile) {
            return {
                ...this.collectAttributes(variantTile),
                ...this.collectAttributes(tileEl),
            };
        }

        return this.collectAttributes(tileEl);
    }

    collectAttributes(element) {
        const attributes = {};
        for (const attribute of element.attributes) {
            attributes[attribute.name] = attribute.value;
        }
        return attributes;
    }

    buildInstructionRow(data) {
        if (!data.id) {
            return null;
        }

        const parts = data.id.split(" ");
        const sub = parts[1] || "";

        let base;
        let value;
        let unit;

        if (data.voltage) {
            base = "U";
            unit = "V";
            value = data.voltage;
        } else if (data.amperage) {
            base = "I";
            unit = "A";
            value = data.amperage;
        } else if (data.resistance) {
            base = "R";
            unit = "&ohm;";
            value = data.resistance;
        } else if (data.capacity) {
            base = "C";
            unit = "F";
            value = data.capacity;
        } else {
            return null;
        }

        return {
            base,
            sub,
            value,
            unit,
        };
    }

    renderInstructionRows(instructionRows) {
        const instructionOrder = { U: 0, I: 1, R: 2, C: 3 };

        instructionRows.sort((a, b) => {
            const baseDiff = instructionOrder[a.base] - instructionOrder[b.base];
            if (baseDiff !== 0) {
                return baseDiff;
            }
            return a.sub.localeCompare(b.sub, undefined, { numeric: true, sensitivity: "base" });
        });

        $("#instructionsparams")[0].innerHTML = instructionRows
            .map((row) => `${row.base}<sub>${row.sub}</sub> = <b>${row.value}</b>${row.unit}<br>`)
            .join("");
    }

    parseMethods(xmlDoc, variant) {
        const methodsElement = xmlDoc.getElementsByTagName("methods")[0];
        const methodsList = methodsElement ? methodsElement.getElementsByTagName("method") : [];

        methods = new Map();

        if (methodsElement && methodsList.length > 0) {
            $("#methodSelectDiv")[0].style.display = "initial";
            this.registerMethods(methodsList, variant);
            this.attachMethodSelector();
            return;
        }

        $("#methodSelectDiv")[0].style.display = "none";
        this.attachMethodSelector();
    }

    registerMethods(methodsList, variant) {
        for (const method of methodsList) {
            const methodSource = this.extractMethodSource(method);

            // EVALUATION UTILITIES BEGIN
            function parallel() {
                let sum = 0;
                for (const value of arguments) {
                    sum += 1 / value;
                }
                return 1 / sum;
            }
            // EVALUATION UTILITIES END

            const evaluatedMethod = eval(methodSource);
            methods.set(
                method.getAttribute("name") || "[Bez názvu]",
                formatMethodOutput(evaluatedMethod ?? "[Prázdné řešení]", variant)
            );
        }
    }

    extractMethodSource(method) {
        for (const child of method.children) {
            if (child.tagName && child.tagName.toLowerCase() === "data") {
                return child.textContent || "";
            }
        }
        return "";
    }

    attachMethodSelector() {
        let options = "";
        methods.forEach((_value, key) => {
            options += `<option value="${key}">${key}</option>`;
        });

        $("#methodSelect")[0].innerHTML = options;
        $("#methodSelect").off("change").on("change", function() {
            updateMethod(this.value);
        });
        updateMethodBlind();
    }

    // Input processing - exponential numbers and "rand" (random number) expressions
    processInput(value) {
        if (!value) return null;

        try {
            const parts = value.split("e");

            if (value.includes("rand")) {
                const randParts = value.split(";"); // rand;<min>;<max>;<multiplier-exponential>
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
            throwError("Error processing tile XML: " + error);
            return false;
        }
    }

    clear() {
        // Clear all tiles
        this.svgContainer.querySelectorAll(".schematic-tile").forEach((el) => el.remove());
    }

    render(containerWidth, containerHeight) {
        try {
            // Clear previous tiles
            this.clear();

            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;

            // Render regular tiles first
            const regularTiles = this.tiles.filter((tile) => !TOP_TILE_TYPES.includes(tile.type));
            regularTiles.forEach((tile) => {
                tile.render(this.svgContainer, centerX, centerY, this.scale);
            });

            // Render junction, dot, and terminal tiles last (on top) so they override
            const topTiles = this.tiles.filter((tile) => TOP_TILE_TYPES.includes(tile.type));
            topTiles.forEach((tile) => {
                tile.render(this.svgContainer, centerX, centerY, this.scale);
            });
        }
        catch (error) {
            throwError("Error rendering: " + error);
        }
    }

    setScale(scale) {
        this.scale = scale;
    }

    getTile(id) {
        return this.tiles.find((tile) => tile.id === id);
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

const circuit = {};
window.circuit = circuit;


//// UTILITY FUNCTIONS

// Method text handling
function updateMethodBlind() {
    updateMethod($("#methodSelect").val());
}
function updateMethod(key) {
    $("#solutionContents")[0].innerHTML = methods.get(key) || "<i>Žádné definované řešení.</i>";
    window.renderMathInElement($("#solutionContents")[0], {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
        ],
    });
}
function convertFractionsInSegment(segment, inMath) {
    return segment
        .replace(/(-?\d+)\.(\d*)\((\d+)\)/g, (_m, i, n, r) => toLatexFraction(`${i}.${n}(${r})`, inMath))
        .replace(/(-?\d+)\.(\d+)(?:\.\.\.|…)/g, (_m, i, r) => toLatexFraction(`${i}.(${r})`, inMath))
        .replace(/-?\d+\.\d{4,}/g, (decimal) => toLatexFraction(decimal, inMath));
}
function convertFractionsForKatex(text) {
    const source = String(text ?? "");
    const segments = source.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*\$)/g);

    return segments.map((segment) => {
        if (!segment) {
            return segment;
        }

        if (segment.startsWith("$$") && segment.endsWith("$$")) {
            const inner = segment.slice(2, -2);
            return `$$${convertFractionsInSegment(inner, true)}$$`;
        }

        if (segment.startsWith("$") && segment.endsWith("$")) {
            const inner = segment.slice(1, -1);
            return `$${convertFractionsInSegment(inner, true)}$`;
        }

        return convertFractionsInSegment(segment, false);
    }).join("");
}
function convertNewlinesOutsideMath(text) {
    const source = String(text ?? "");
    const segments = source.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*\$)/g);

    return segments.map((segment) => {
        if (!segment) {
            return segment;
        }

        if ((segment.startsWith("$$") && segment.endsWith("$$")) ||
            (segment.startsWith("$") && segment.endsWith("$"))) {
            return segment;
        }

        return segment.replace(/\n/g, "<br>");
    }).join("");
}
function formatMethodOutput(output, variant) {
    // Method sources in XML are often indented; trim to avoid leading <br> gaps.
    const normalizedOutput = String(output ?? "").trim();
    return convertNewlinesOutsideMath(convertFractionsForKatex(normalizedOutput))
        .replace(/@(\d+)([\s\S]*?)@/g, (_match, id, content) => `<var style="display:${id == variant ? "initial" : "none"};">${content}</var>`);
}
// Method text handling END

// Viewport loading status text
function loadstatShow() {
    $("#viewportLoading")[0].style.display = "initial";
}
function loadstatStatus(value) {
    $("#viewportLoading")[0].innerHTML = value;
}
function loadstatHide() {
    $("#viewportLoading")[0].style.display = "none";
}
// Viewport loading status text END