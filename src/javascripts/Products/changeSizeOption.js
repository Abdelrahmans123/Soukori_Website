const changeSizeOption = () => {
    const sizeOptions = document.querySelectorAll(".sizeOptions .sizeOption");
    sizeOptions.forEach((option) => {
        option.addEventListener("click", (e) => {
            sizeOptions.forEach((opt) => opt.classList.remove("active"));
            e.target.classList.add("active");
        });
    });
};
export default changeSizeOption;
