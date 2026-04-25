const tiles = [ 
    'amperage-source',
    'capacitor',
    'dot',
    'half-wire',
    'resistor-arrow',
    'resistor',
    'terminal-half-wire-corner',
    'terminal-half-wire',
    'terminal',
    'voltage-source',
    'wire',
]

// Tile menu setup
for (i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const tileElement = $(`<img id="${tile}" width=70 src="../media/tiles/tile-${tile}.svg">`);
    tileElement.click(() => tileClick(tile));
    $("#schematic #menu").append(tileElement);
}