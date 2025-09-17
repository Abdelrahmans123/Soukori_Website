const closeFilter = () => {
    const arrowUpIcon = document.querySelectorAll(".arrowUpIcon");
    const arrowDownIcon = document.querySelectorAll(".arrowDownIcon");
    arrowUpIcon.forEach((icon) => {
        icon.addEventListener("click", (e) => {
            e.target.classList.add("d-none");
            e.target.nextElementSibling.classList.remove("d-none");
            e.target.parentElement.nextElementSibling.classList.add("d-none");
        });
    });
    arrowDownIcon.forEach((icon) => {
        icon.addEventListener("click", (e) => {
            e.target.classList.add("d-none");
            e.target.previousElementSibling.classList.remove("d-none");
            e.target.parentElement.nextElementSibling.classList.remove(
                "d-none"
            );
        });
    });
};
export default closeFilter;
