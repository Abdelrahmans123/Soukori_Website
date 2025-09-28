import { ReviewsPage } from "./reviewUI.js";

const reviews = new ReviewsPage();
reviews
	.render()
	.then((container) => {
		const mainContent = document.getElementById("main-content");
		if (mainContent) {
			mainContent.innerHTML = "";
			mainContent.appendChild(container);
		}
	})
	.catch((error) => {
		console.error("Error rendering reviews page:", error);
		const reviewsInstance = new ReviewsPage();
		const errorContainer = reviewsInstance.renderError(error);
		const mainContent = document.getElementById("main-content");
		if (mainContent) {
			mainContent.innerHTML = "";
			mainContent.appendChild(errorContainer);
		}
	});
