/* Setup */
window.editorTopologyAssemble = topologyAssemble;
/* Setup END */

/* UI */
/* UI END */

function topologyAssemble(cells) {
    console.log("Assembling topology:", cells);
    window.editorClearErrors();

    let topology = new Map(); // Map-of-maps

    cells.forEach((column, columni) => {
        column.forEach((cell, celli) => {
            const homePosition = new Vector2(columni, celli);
            const homePositionHead = cell.pointer ?? homePosition;

            const homePositionRelative = new Vector2(
                    homePosition.x - homePositionHead.x,
                    homePosition.y - homePositionHead.y);

            const homeHead = cells.get2Dv(homePositionHead);

            // Configure home topology data basis
            if (!topology.has2Dv(homePositionHead))
                topology.set2Dv(homePositionHead, new TopologyVertex(homeHead, new Map()));
            const topocell = topology.get2Dv(homePositionHead);
            const topocellIsLinker = topocell.attributes.includes("linker");

            let localLinks = [];
            // This runs for all (both normal and reserve) tile classes.
            (cell.connections ?? []).forEach((connection) => {
                const facing = Sides[connection.facing];
                const sideVector = SideVectors[facing];

                const neighborPosition = new Vector2(columni+sideVector.x, celli+sideVector.y);
                const neighborFacing = (facing + 2) % 4;
                let neighbor = cells.get2Dv(neighborPosition);
                let neighborHead = neighbor;
                if (!neighbor) { topologyError(columni, celli, facing); return; }
                    /*throw new Error(`Could not assemble the topology layer at cell ${columni},${celli}:
                        Open connection detected at ${columni+sideVector.x},${celli+sideVector.y}.`);*/

                let neighborPositionHead;
                if (neighbor instanceof Reserve) {
                    neighborPositionHead = neighbor.pointer;
                    neighborHead = cells.get2Dv(neighborPositionHead);
                    if (!neighbor)
                        throw new Error(`Could not assemble the topology layer at cell ${columni},${celli}:
                            No header tile of reserve tile at ${columni+sideVector.x},${celli+sideVector.y}. found.
                            This is a bug.`); // ?
                } else { neighborPositionHead = neighborPosition; }
                
                const neighborPositionRelative = new Vector2(
                    neighborPosition.x - neighborPositionHead.x,
                    neighborPosition.y - neighborPositionHead.y);

                // There is no support for multiple connections on one side at the moment.
                // ....find() returns the first found object.
                const neighborConnection = neighbor.connections.find(conn => conn.facing == Sides[neighborFacing]);
                if (!neighborConnection) { topologyError(columni, celli, facing); return; }
                    /*throw new Error(`Could not assemble the topology layer at cell ${columni},${celli}:
                        No neighboring connection found.
                        Firing from ${columni},${celli}:${connection.facing}
                        at target ${columni+sideVector.x},${celli+sideVector.y}:${Sides[neighborFacing]}`);*/
                
                // We now have our connection and the neighbor's connection.
                
                if (topocell.connections.get(facing)) return;
                    // Not `continue` as we are inside ....forEach(...)
                ///// RETURNING IF CONNECTION ALREADY EXISTS ON THE HOME SIDE! (if connector is linked already);

                if (!topology.has2Dv(neighborPositionHead))
                     topology.set2Dv(neighborPositionHead, new TopologyVertex(neighborHead, new Map()));
                const neighborTopocell = topology.get2Dv(neighborPositionHead);

                // Setting all only to head cells!
                topology.get2Dv(homePositionHead    ).connections.set(connection.name,         new CVector2(
                    neighborPosition.x, neighborPosition.y, neighborConnection.name));
                topology.get2Dv(neighborPositionHead).connections.set(neighborConnection.name, new CVector2(
                    homePositionHead.x, homePositionHead.y, connection.name        ));
            });

            // If is linker, simplify all links into one
            if (topocellIsLinker) {

                // Self-destruct linker
                //topology.del2Dv(homePositionHead);
            }
        });
    });

    console.log("Topology map:", topology);
    topology.consoleflush();
    
    return null;
}
function topologyError(posX, posY, facing) {
    const sideVector = SideVectors[facing];
    const x = (posX + (0.5 * sideVector.x)) * tileSize + (window.editorCanvasBox.width  / 2);
    const y = (posY + (0.5 * sideVector.y)) * tileSize + (window.editorCanvasBox.height / 2);
    console.warn("Contracted user topology building error at:", posX, posY, Sides[facing],
        "- placing arrow at:", x, y, "in canvas");
    window.editorAppendError(x, y);
}
class TopologyVertex {
    tile = null;
    connections = new Map(); // <connection face, int><array of connected ports>
    attributes = [];

    constructor (tile, connections) {
        this.name        = tile;
        this.connections = connections;
    }
}

class CVector2 {
    x; y; cnameh;

    constructor (x, y, cnameh) {
        //this.facing = facing; // meta connection name string
        this.x      = x;
        this.y      = y;
        this.cnameh = cnameh;
    } 
}