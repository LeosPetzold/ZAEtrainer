function dialogCleanup() {
    $("#dialogtopbar>*:not(#dialogclose)").hide();
    $("#dialogcontent>*").hide();
    $("#dialogclose").show();
}

function dialogClose() {
    $("#dialog")[0].style.display = "none";
}

function dialogOpen(title, force=false) {
    dialogCleanup();
    $(".dialog_" + title).show();

    // Special overrides
    switch(title) {
        case "error":
            $("#dialogclose").hide();
            break;
        case "status":
        case "view":
            if (force) $("#dialogclose").hide();
            break;
        case "share":
            $("#shareLink")[0].value = `${window.location.origin}${window.location.pathname}?s=${window.schematic}&v=${window.variant}&f=${window.seed}`;
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

// Helper: Ensure schematic SVG is rendered before printing on mobile
function ensureSchematicRenderedBeforePrint(callback) {
    if (!window.mobile) {
        // On desktop, just call the callback immediately
        callback();
        return;
    }

    // On mobile, switch to schematic view and wait for render
    const viewSelect = $("#viewSelect")[0];
    const originalView = viewSelect.value;

    if (originalView === "schematic") {
        // Already on schematic view, just ensure render is current
        callback();
        return;
    }

    // Switch to schematic view
    viewSelect.value = "schematic";
    if (window.updateMobileView) {
        updateMobileView();
    }

    // Wait for render to complete and then call callback
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            callback();
        });
    });
}

function dialogFuncPrintSchematic() {
    dialogClose();

    ensureSchematicRenderedBeforePrint(() => {
        print();
    });
}

function dialogFuncPrintSolution() {
    dialogClose();

    const html = document.documentElement;
    const body = document.body;
    const meta = document.getElementById("printSolutionMeta");
    const presetName = document.getElementById("presetName");
    const presetVariant = document.getElementById("presetVariant");
    const presetSeed = document.getElementById("presetSeed");
    const methodSelect = document.getElementById("methodSelect");

    const nameText = presetName ? presetName.textContent.trim() : "Nevybráno";
    const variantText = presetVariant ? presetVariant.textContent.trim() : "?";
    const seedText = presetSeed ? presetSeed.textContent.trim() : "?";
    const methodText = methodSelect && methodSelect.selectedOptions && methodSelect.selectedOptions[0]
        ? methodSelect.selectedOptions[0].textContent.trim()
        : "Neuvedeno";

    if (meta) {
        meta.textContent = `Schéma: ${nameText} | Varianta: ${variantText} | Seed: ${seedText} | Metoda: ${methodText}`;
    }

    html.classList.add("print-solution-mode");
    body.classList.add("print-solution-mode");

    function cleanupPrintSolutionMode() {
        html.classList.remove("print-solution-mode");
        body.classList.remove("print-solution-mode");
        if (meta) {
            meta.textContent = "";
        }
        window.removeEventListener("afterprint", cleanupPrintSolutionMode);
    }

    window.addEventListener("afterprint", cleanupPrintSolutionMode);

    // Ensure schematic is rendered before printing on mobile
    ensureSchematicRenderedBeforePrint(() => {
        print();
    });
}

function dialogFuncReload() {
    window.location.reload();
    dialogClose();
}

const schematicSvg = document.getElementById("schematicSvg");
const schematicLoader = window.schematicLoader;
function dialogFuncView(schematic, variant, seed) {
    // DEBUG ONLY DEBUG ONLY DEBUG ONLY
    variant = 1;
    // DEBUG END DEBUG END DEBUG END

    // Schematic override parsing
    schematic = schematicOverrides[schematic] || schematic;

    if (seed == "") seed = Math.floor(Math.random()*seedRoof);
    else seed = seed % seedRoof;
    if (variant == "") variant = -1;
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

    window.schematic = schematic;
    window.variant = variant;
    window.seed = seed;

    schematicLoader.clear();
    schematicLoader.loadXML(`schematics/${schematic}.xml`, variant, seed).then(() => {
        const viewport = document.getElementById("schematicViewport");
        schematicLoader.render(viewport.clientWidth, viewport.clientHeight);
    });

    $("#presetName")[0].innerText = schematics[schematic];
    //$("#presetVariant")[0].innerText = variant;
    $("#presetSeed")[0].innerText = seed;

    dialogClose();
}

///// Other
function throwError(trace) {
    console.error(trace);
    $("#dialog_error-trace")[0].innerText = trace;
    dialogOpen("error");
    loadstatShow();
    loadstatStatus("CHYBA");
}