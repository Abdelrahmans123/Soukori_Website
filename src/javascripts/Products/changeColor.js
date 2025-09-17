const changeColor = () => {
    const colorSelectors = document.querySelectorAll(
        ".colorOptions .colorOption"
    );
    const checkIcon = document.querySelector(".checkIcon");

    colorSelectors.forEach((option) => {
        option.addEventListener("click", (e) => {
            colorSelectors.forEach(() => checkIcon.remove());
            e.target.append(checkIcon);
        });
    });
};
export default changeColor;
