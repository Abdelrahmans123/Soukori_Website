// add active class to sidebar links
const sidebarLinks = document.querySelectorAll(".sidebar nav a");
document.addEventListener("DOMContentLoaded", () => {
    sidebarLinks.forEach((link) => {
        console.log("🚀 ~ sidebarLinks:", sidebarLinks);
        link.classList.remove("active");
        if (link.href === window.location.href) {
            link.classList.add("active");
        }
    });
});
