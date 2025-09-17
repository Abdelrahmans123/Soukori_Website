const changeSortText = () => {
    const sortSelection = document.querySelector(".sortSelection p");
    const sortDropdown = document.querySelectorAll(".sortDropdown ul li");

    sortDropdown.forEach((item) => {
        item.addEventListener("click", () => {
            const selectedText = item.textContent;
            sortSelection.textContent = selectedText;
        });
    });
};
export default changeSortText;
