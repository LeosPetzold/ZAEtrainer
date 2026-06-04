const tabButtons = $(".tabb");
const tabs = $(".tab");
Array.from(tabButtons).forEach(button => {
    button.addEventListener("mousedown", () => {
        Array.from(tabs).forEach(tab => {
            tab.style.display = "none";
        });
        document.getElementById(button.getAttribute("value")).style.display = "unset";

        Array.from(tabButtons).forEach(btn => {
            btn.setAttribute("active", false);
        });
        button.setAttribute("active", true);
    });
});