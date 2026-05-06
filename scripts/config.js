//const seed = 1081;
const schematics = {
    "jednoduchy-vicezdrojovy-obvod": "Obvod s více zdroji o dvou smyčkách",
    "transfigurace": "Transfigurace",
    "thevenin-1": "Théveninův teorém I.",
    "zatizeny-delic-napeti": "Zatížený napěťový dělič",
    "testing": "Testovací schéma"
}
const schematicOverrides = {
    "metoda-linearni-superpozice": "jednoduchy-vicezdrojovy-obvod"
}

const version="0.3.2-beta";
const production = true;
const schematicOverride = "metoda-linearni-superpozice";
const seedRoof = 1000000;
window.dev = production;
window.schematicOverride = schematicOverride;

///// Utilities
const isNumber = (value) => !isNaN(value) && !isNaN(parseFloat(value));