const showSortDropdown = () => {
    const sortSelection = document.querySelector(".sortSelection");
    const sortDropdown = document.querySelector(".sortDropdown");
    const arrowUp = document.querySelector(".arrowUp");
    const arrowDown = document.querySelector(".arrowDown");

    sortSelection.addEventListener("click", () => {
        sortDropdown.classList.toggle("d-none");
        arrowUp.classList.toggle("d-none");
        arrowDown.classList.toggle("d-none");
    });
};
export default showSortDropdown;
