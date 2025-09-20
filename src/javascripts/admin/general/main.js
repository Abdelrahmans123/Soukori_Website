// add active class to sidebar links
const sidebarLinks = document.querySelectorAll(".sidebar nav a");
document.addEventListener("DOMContentLoaded", () => {
    sidebarLinks.forEach((link) => {
        link.classList.remove("active");
        if (link.href === window.location.href) {
            link.classList.add("active");
        }
    });
});
