//const seed = 1081;
const schematics = {
    "metoda-linearni-superpozice": "Metoda lineární superpozice",
    "thevenin-1": "Théveninův teorém I.",
    "zatizeny-delic-napeti": "Zatížený napěťový dělič",
    "testing": "Testovací schéma"
}

const version="0.2.0-beta";
const production = true;
const seedRoof = 1000000;
window.dev = production;

///// Utilities
const isNumber = (value) => !isNaN(value) && !isNaN(parseFloat(value));