const tabButtons = $(".tabb");
const tabs = $(".tab");
Array.from(tabButtons).forEach(button => {
    button.addEventListener("click", () => {
        Array.from(tabs).forEach(tab => {
            tab.style.display = "none";
        });
        document.getElementById(button.getAttribute("value")).style.display = "unset";
    });
});