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
function dialogFuncView(schematic, variant, seed) {
    if (seed == "") seed = Math.floor(Math.random()*4294967295);
    if (variant == "") variant = 1;
    let invalid = false;
    if (!isNumber(seed)) {
        $("#seedInput")[0].value = "";
        $("#seedInput")[0].classList.add("border-flash");
            setTimeout(() => $("#seedInput")[0].classList.remove("border-flash"), 600);
            invalid = true;
    }
    if (!isNumber(variant)) {
        $("#variantInput")[0].value = "";
        $("#variantInput")[0].classList.add("border-flash");
            setTimeout(() => $("#variantInput")[0].classList.remove("border-flash"), 600);
            invalid = true;
    }
    if (invalid) return;
    
    console.log(`Drawing "${schematic}" variant ${variant} with seed ${seed}`);

    schematicLoader.clear();
    schematicLoader.loadXML(`schematics/${schematic}.xml`, variant, seed).then(() => {
        const viewport = document.getElementById("schematicViewport");
        schematicLoader.render(viewport.clientWidth, viewport.clientHeight);
    });

    $("#presetName")[0].innerText = schematics[schematic];
    $("#presetVariant")[0].innerText = variant;
    $("#presetSeed")[0].innerText = seed;

    dialogClose();
}

///// Other
function throwError(trace) {
    console.error(trace);
    $("#dialog_error-trace")[0].innerText = trace;
    dialogOpen("error");
}