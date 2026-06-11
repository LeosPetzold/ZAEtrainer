/* Setup */
window.editorTopologyAssemble = topologyAssemble;
/* Setup END */

/* UI */
/* UI END */

function topologyAssemble(cells) {
    console.log("Assembling topology:", cells);

    let topology = new Map(); // Map-of-maps

    let linkRegister = new Map();
    let linkIDcounter = 0;

    cells.forEach((column, columni) => {
        column.forEach((cell, celli) => {
            const homePosition = new Vector2(columni, celli);
            if (cell instanceof Reserve) const homePositionHead = cell.pointer;
            else                         const homePositionHead = homePosition;

            // Configure home topology data basis
            if (!topology.has2Dv(homePosition))
                topology.set2Dv(homePosition, new TopologyVertex(cell.ID, [], cell.attributes));

            // This runs for all (both normal and reserve) tile classes.
            (cell.connections ?? []).forEach((connection) => {
                const facing = Sides[connection.facing];
                const sideVector = SideVectors[facing];

                const neighborPosition = new Vector2(columni+sideVector.x, celli+sideVector.y);
                const neighborFacing = (facing + 2) % 4;
                let neighbor = cells.get2Dv(neighborPosition);
                let neighborHead = neighbor;
                if (!neighbor) throw new 
                    Error(`Could not assemble the topology layer at cell ${columni},${celli}:
                        Open connection detected at ${columni+sideVector.x},${celli+sideVector.y}.`);

                if (neighbor instanceof Reserve) {
                    const neighborPositionHead = neighbor.pointer;
                    neighborHead = cells.get2Dv(neighborPositionHead);
                    if (!neighbor) throw new 
                        Error(`Could not assemble the topology layer at cell ${columni},${celli}:
                            No header tile of reserve tile at ${columni+sideVector.x},${celli+sideVector.y}. found.
                            This is a bug.`);
                } else { const neighborPositionHead = neighborPosition; }

                // There is no support for multiple connections on one side at the moment.
                // ....find() returns the first found object.
                const neighborConnection = neighbor.connections.find(conn => conn.facing == Sides[neighborFacing]);
                if (!neighborConnection) throw new
                    Error(`Could not assemble the topology layer at cell ${columni},${celli}:
                        No neighboring connection found.
                        Firing from ${columni},${celli}:${connection.facing}
                        at target ${columni+sideVector.x},${celli+sideVector.y}:${Sides[neighborFacing]}`);
                
                // We now have our connection and the neighbor's connection.

                if (!topology.has2Dv(neighborPositionHead))
                    topology.set2Dv(neighborPositionHead, new TopologyVertex(neighbor.ID, [], neighbor.attributes));

                const homeConnector     = new TopologyConnector(cell.ID,     facing,         linkIDcounter);
                const neighborConnector = new TopologyConnector(neighbor.ID, neighborFacing, linkIDcounter);

                const link = new TopologyLink(linkIDcounter, [ homeConnector, neighborConnector ]);
                linkRegister.set(linkIDcounter, link);
                linkIDcounter++;

                // Setting all only to head cells!
                topology.get2Dv(homePositionHead    ).links.set(facing,         homeConnector);
                topology.get2Dv(neighborPositionHead).links.set(neighborFacing, neighborConnector);
                    
            });
        });
    });

    console.log("Topology map:", topology);
    
    return null;
}
class TopologyVertex {
    name = "vertex";
    connectors = [];
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

    constructor (name, facing, linkID) {
        this.name   = name;
        this.facing = facing;
        this.linkID = linkID;
    }
}
class TopologyLink {
    id = null; // May not be needed?
    name = null;
    connectors = [];

    constructor (id, connectors=[], name="link") {
        this.id         = id;
        this.name       = name;
        this.connectors = connectors;
    }
}