import { ShipmentsPage } from "./shipmentsUI.js";

const shipments = new ShipmentsPage();
shipments
	.render()
	.then((container) => {
		document.getElementById("main-content").innerHTML = "";
		document.getElementById("main-content").appendChild(container);
	})
	.catch((error) => {
		console.error("Error rendering shipments page:", error);
		const errorContainer = shipments.renderError(error);
		document.getElementById("main-content").innerHTML = "";
		document.getElementById("main-content").appendChild(errorContainer);
	});
