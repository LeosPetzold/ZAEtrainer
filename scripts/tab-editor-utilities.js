/// CONFIG
const tileSize = 64;

/// VECTORS
class Vector2 {
    x; y;
    constructor(x, y) { this.x = x; this.y = y; }
}
function fromTextVector(text) {
    const parts = text.split(',');
    return new Vector2(parts[0], parts[1]);
}
function toTextVector(x, y) {
    return `${x},${y}`;
}
function toTextVectorv(vector) {
    return `${vector.x},${vector.y}`;
}

/// SIDES
const Sides = {
    "top":    0, 0: "top",
    "right":  1, 1: "right",
    "bottom": 2, 2: "bottom",
    "left":   3, 3: "left"
};
// Y values are swapped due to the nature of the web Cartesian system.
const SideVectors = {
    0:        new Vector2(0, -1), // top
    1:        new Vector2(+1, 0), // right
    2:        new Vector2(0, +1), // bottom
    3:        new Vector2(-1, 0), // left

    "top":    new Vector2(0, -1), // 0
    "right":  new Vector2(+1, 0), // 1
    "bottom": new Vector2(0, +1), // 2
    "left":   new Vector2(-1, 0)  // 3
};

/// ROTATION (Mathematical)
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

/// MAP OF MAPS (Cartesian 2D system)
// cell Map-of-Maps; Source: web/AI boilerplate, heavily modified
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
    if (col.size == 0) this.delete(x);
}
Map.prototype.set2Dv = function setCellV(vector, value) { return this.set2D(vector.x, vector.y, value); }
Map.prototype.get2Dv = function getCellV(vector       ) { return this.get2D(vector.x, vector.y       ); }
Map.prototype.has2Dv = function hasCellV(vector       ) { return this.has2D(vector.x, vector.y       ); }
Map.prototype.del2Dv = function delCellV(vector       ) { return this.del2D(vector.x, vector.y       ); }

// Source: Google's AI mode
Map.prototype.consoleflush = function MoMconsoleFlush() {
    const MAP = structuredClone(this);

    const s = (v) => v < 0 ? ` ${v}` : `  ${v}`;
    const kX = Array.from(MAP.keys()).sort((a, b) => a - b);
    const kY = Array.from(new Set(Array.from(MAP.values()).flatMap(m => Array.from(m.keys())))).sort((a, b) => a - b);
    if (!kY.length) return console.table({});

    const grid = {};
    kY.forEach(y => {
        grid[s(y)] = {};
        kX.forEach(x => grid[s(y)][s(x)] = (MAP.get(x)?.has(y)) ? MAP.get(x).get(y) : "-");
    });
    console.table(grid, kX.map(s));
}


/// TILE CLASSES
class Tile {
    ID;
    rotation;
    family = null;
    reserves = [];
    connections;
    attributes = [];

    familyIndex = null;

    constructor(ID, rotation, family, reserves, connections, attributes) {
        this.ID          = ID;
        this.rotation    = rotation;
        this.family      = family;
        this.reserves    = reserves;
        this.connections = connections;
        this.attributes  = attributes;
    }
}
class Reserve {
    pointer;
    connections;
    attributes = [];
    constructor(tileX, tileY, connections, attributes) {
        this.pointer     = new Vector2(tileX, tileY);
        this.connections = connections;
        this.attributes  = attributes;
    }
}


/// OTHER
// DJB2, simple quick hashing algorithm
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Zajistí nezáporné celé číslo
}