function dialogCleanup() {
    $("#dialogtopbar>*:not(#dialogclose)").hide();
    $("#dialogcontent>*").hide();
    $("#dialogclose").show();
}

function dialogClose() {
    $("#dialog")[0].style.display = "none";
}

function dialogOpen(title) {
    dialogCleanup();
    $(".dialog_" + title).show();

    // Special overrides
    switch(title) {
        case "error":
            $("#dialogclose").hide();
            break;
    }

    $("#dialog").show();
}

///// Setup
for (var key in schematics) {
    $("#schematicInput")[0].innerHTML +=
        `<option value=${key}>${schematics[key]}</option>`;
}

///// Specific dialog functions
function dialogFuncPrint() {
    dialogClose();
    print();
}

function dialogFuncReload() {
    window.location.reload();
    dialogClose();
}

const schematicSvg = document.getElementById("schematicSvg");
const schematicLoader = window.schematicLoader;
function dialogFuncView(schematic, seed) {
    if (seed == "") seed = Math.floor(Math.random()*4294967295)
    if (!isNumber(seed)) {
        $("#seedInput")[0].value = "";
        $("#seedInput")[0].classList.add("border-flash");
            setTimeout(() => $("#seedInput")[0].classList.remove("border-flash"), 600);
            return;
    }
    
    console.log(`Drawing "${schematic}" with seed ${seed}`);

    schematicLoader.clear();
    schematicLoader.loadXML(`schematics/${schematic}.xml`, seed).then(() => {
        const viewport = document.getElementById("schematicViewport");
        schematicLoader.render(viewport.clientWidth, viewport.clientHeight);
    });

    $("#presetName")[0].innerText = schematics[schematic];
    $("#presetSeed")[0].innerText = seed;

    dialogClose();
}

///// Other
function throwError(trace) {
    console.error(trace);
    $("#dialog_error-trace")[0].innerText = trace;
    dialogOpen("error");
}