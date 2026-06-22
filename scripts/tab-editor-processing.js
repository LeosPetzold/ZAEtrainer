/* Setup */
window.editorTopologyAssemble = topologyAssemble;
/* Setup END */

/* UI */
/* UI END */

function topologyAssemble(cells) {
    console.log("Assembling topology:", cells);
    window.editorClearErrors();

    let topology = new Map(); // Map-of-maps

    let linkRegister = new Map();
    let linkIDcounter = 0;

    cells.forEach((column, columni) => {
        column.forEach((cell, celli) => {
            const homePosition = new Vector2(columni, celli);
            let homePositionHead;
            if (cell instanceof Reserve) homePositionHead = cell.pointer;
            else                         homePositionHead = homePosition;

            const homeHead = cells.get2Dv(homePositionHead);
            
            const homePositionRelative = new Vector2(
                    homePosition.x - homePositionHead.x,
                    homePosition.y - homePositionHead.y);

            // Configure home topology data basis
            if (!topology.has2Dv(homePositionHead))
                topology.set2Dv(homePositionHead, new TopologyVertex(homeHead.ID, new Map(), cell.attributes));
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
                            This is a bug.`);
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

                const homeLinkKey     = `${    homePositionRelative.x},${    homePositionRelative.y}:${        facing}`;
                const neighborLinkKey = `${neighborPositionRelative.x},${neighborPositionRelative.y}:${neighborFacing}`;
                
                if (topocell.connectors.get(homeLinkKey)) return; // Not `continue` as we are inside ....forEach(...)
                ///// RETURNING IF CONNECTION ALREADY EXISTS ON THE HOME SIDE! (if is connector is linked already);

                if (!topology.has2Dv(neighborPositionHead))
                    topology.set2Dv(neighborPositionHead, new TopologyVertex(neighbor.ID, new Map(), neighbor.attributes));
                const neighborTopocell = topology.get2Dv(neighborPositionHead);

                // Define the new connectors
                const homeConnector     = new TopologyConnector(    cell.ID, facing,        
                    linkIDcounter);
                const neighborConnector = new TopologyConnector(neighbor.ID, neighborFacing,
                    linkIDcounter);
                
                // Define link
                const link = new TopologyLink([ homeConnector, neighborConnector ]); // Neighbor shall always be second in the array!
                if (topocellIsLinker) linkRegister.set(linkIDcounter, link); // and //linkIDcounter++;
                else                  localLinks.push(link);

                // Setting all only to head cells!
                topology.get2Dv(homePositionHead    ).connectors.set(
                    homeLinkKey,     homeConnector    );
                topology.get2Dv(neighborPositionHead).connectors.set(
                    neighborLinkKey, neighborConnector);
            });

            // If is linker, simplify all links into one
            if (topocellIsLinker) {

                // Self-destruct linker
                //topology.del2Dv(homePositionHead);
            }
        });
    });

    console.log("Link register flush:", linkRegister);

    console.log("Topology map:", topology);
    
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
    name = "vertex";
    connectors = new Map();
    attributes = [];

    constructor (name, connectors, attributes) {
        this.name       = name;
        this.connectors = connectors;
        this.attributes = attributes;
    }
}
class TopologyConnector {
    name = "connection";
    facing = Sides.bottom;
    linkID = null;
    // linked = false; // If exists, is already ALWAYS linked

    constructor (name, facing, linkID
    ) {
        this.name   = name;
        this.facing = facing;
        this.linkID = linkID;
    }
}
class TopologyLink {
    //id = null; // May not be needed?
    name = null;
    connectors = [];

    constructor (id, connectors=[], name="link") {
        this.id         = id;
        this.name       = name;
        this.connectors = connectors;
    }
}