import { OrdersPage } from "./ordersUI.js";

const orders = new OrdersPage();
orders
	.render()
	.then((container) => {
		document.getElementById("main-content").innerHTML = "";
		document.getElementById("main-content").appendChild(container);
	})
	.catch((error) => {
		console.error("Error rendering orders page:", error);
		const errorContainer = orders.renderError();
		document.getElementById("main-content").innerHTML = "";
		document.getElementById("main-content").appendChild(errorContainer);
	});
document.addEventListener("DOMContentLoaded", async function () {
	try {
		const ordersPage = new OrdersPage();
		await ordersPage.render();
	} catch (error) {
		console.error("Failed to initialize orders page:", error);

		// Hide loading and show error
		const loadingElement = document.getElementById("loading");
		const mainContent = document.getElementById("main-content");

		if (loadingElement) {
			loadingElement.style.display = "none";
		}
		if (mainContent) {
			mainContent.style.display = "block";
			mainContent.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Failed to Load Orders</h4>
                    <p>There was an error loading the orders page. Please check the console for details.</p>
                    <small class="text-muted">${error.message}</small>
                </div>
            `;
		}
	}
});

// Handle sidebar toggle for mobile
document
	.getElementById("toggleSidebar")
	?.addEventListener("click", function () {
		const sidebar = document.querySelector(".sidebar");
		sidebar.classList.toggle("show");
	});

// Add some basic responsive behavior
window.addEventListener("resize", function () {
	if (window.innerWidth > 992) {
		document.querySelector(".sidebar")?.classList.remove("show");
	}
});
