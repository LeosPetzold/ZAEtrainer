/*function saveText() {
    function mapReplacer(key, value) {
        if (value instanceof Map) {
            return {
            __dataType: 'Map',
            value: Array.from(value.entries()) // Converts Map to [key, value] pairs
            };
        }
        return value;
    }

    const string = JSON.stringify(window.editorCells, mapReplacer);

    return string;
}

function loadText(text) {
    function mapReviver(key, value) {
        if (typeof value === 'object' && value !== null && value.__dataType === 'Map') {
            return new Map(value.value);
        }
        return value;
    }

    const restored = JSON.parse(text, mapReviver);

    return restored;
}
function load(text) {
    clean();

    const cells = loadText(text);

    cells.forEach((column, columni) => {
        cells.forEach((cell, celli) => {
            const rootPoint = new Vector2(columni, celli);
            let reserveCoords = [];

        });
    });





    
    let cellsBuffer = new cells.constructor(cells);
        
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
                cellsBuffer.set2Dv(rootPoint, new Tile(trueID, rotation, family, reserveCoords,
                    connections, attributes)); //
            }
        }
    }

    // Register to family
    const rootCellPointer = cellsBuffer.get2Dv(rootPoint);

    var namer = canvasPlaceSVG(trueID, cursorTilePositionAbsolute, rotation, family, rootCellPointer);

    if (family != null) {
        if (familiesRegistry.has(family)) familiesRegistry.get(family).push([ rootCellPointer, namer ]);
        else                              familiesRegistry.set(family,    [ [ rootCellPointer, namer ] ]);
        
        updateTileNamers();
    }

    // Flush buffer
    cells = cellsBuffer;
}

function clean() {

}*/