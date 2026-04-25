$("#viewSelect")[0].addEventListener("change", function() {
    updateMobileView();
});

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
}

window.mobile = false;
if (window.matchMedia("(max-width: 768px)").matches) {
    window.mobile = true;
    updateMobileView();
};