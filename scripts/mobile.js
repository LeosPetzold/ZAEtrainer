$("#viewSelect")[0].addEventListener("change", function() {
    updateMobileView();
});

function refreshMobileSchematicViewport() {
    const viewport = document.getElementById("schematicViewport");
    if (!viewport) {
        return;
    }

    const applyViewportUpdate = () => {
        if (viewport.clientWidth <= 0 || viewport.clientHeight <= 0) {
            return;
        }

        if (window.schematicLoader && typeof window.schematicLoader.render === "function") {
            window.schematicLoader.render(viewport.clientWidth, viewport.clientHeight);
        }
        if (window.schematicViewport && typeof window.schematicViewport.resetView === "function") {
            window.schematicViewport.resetView();
        }
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(applyViewportUpdate);
    });
}

function updateMobileView() {
    const view = $("#viewSelect")[0].value;

    let mobileStyle = "";

    switch (view) {
        case "schematic":
            mobileStyle = `#schematic { display: initial; } #viewSelect { background-color: var(--surface-color); }`;
            break;
        case "solving":
            mobileStyle = `#solvingbar { display: initial; }`;
            break;
        case "info":
            mobileStyle = `#infobar { display: initial; }`;
            break;
    }

    $("#mobileStyle")[0].innerText = mobileStyle;

    if (view === "schematic") {
        refreshMobileSchematicViewport();
    }
}

window.mobile = false;
if (window.matchMedia("(max-width: 768px)").matches) {
    window.mobile = true;
    updateMobileView();
};

window.addEventListener("resize", function() {
    if (!window.mobile) {
        return;
    }

    const currentView = $("#viewSelect")[0].value;
    if (currentView === "schematic") {
        refreshMobileSchematicViewport();
    }
});