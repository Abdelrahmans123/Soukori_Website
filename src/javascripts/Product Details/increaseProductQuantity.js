const increaseProductQuantity = () => {
    const incrementBtn = document.querySelector(".quantity .addIcon");
    const quantityInput = document.querySelector(".quantity .number");
    incrementBtn.addEventListener("click", (e) => {
        let currentValue = parseInt(quantityInput.innerText);
        quantityInput.innerText = currentValue + 1;
    });
};
export default increaseProductQuantity;
