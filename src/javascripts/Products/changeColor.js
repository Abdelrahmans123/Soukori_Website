const changeColor = () => {
	const colorSelectors = document.querySelectorAll(".colorOption");
	const checkIcon = document.querySelector(".checkIcon");

	colorSelectors.forEach((option) => {
		option.addEventListener("click", (e) => {
			colorSelectors.forEach(() => checkIcon.remove());
			e.target.append(checkIcon);
			e.target.classList.toggle("active");
		});
	});
};
export default changeColor;
