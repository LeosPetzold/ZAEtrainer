//const seed = 1081;
const schematics = {
    "thevenin-1": "Théveninův teorém I.",
    "zatizeny-delic-napeti": "Zatížený napěťový dělič",
    "testing": "Testovací schéma"
}

///// Utilities
const isNumber = (value) => !isNaN(value) && !isNaN(parseFloat(value));
