const decreaseProductQuantity = () => {
    const decrementBtn = document.querySelector(".quantity .removeIcon");
    const quantityInput = document.querySelector(".quantity .number");
    decrementBtn.addEventListener("click", (e) => {
        let currentValue = parseInt(quantityInput.innerText);
        if (currentValue > 1) {
            quantityInput.innerText = currentValue - 1;
        }
    });
};
export default decreaseProductQuantity;
