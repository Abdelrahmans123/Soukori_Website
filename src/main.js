// Global scripts (apply to all pages)
console.log("Main.js loaded");

// Optional: global navbar logic
const navToggle = document.querySelector("#navToggle");
if (navToggle) {
	navToggle.addEventListener("click", () => {
		document.querySelector("nav").classList.toggle("open");
	});
}

// Detect which page we’re on using body id or filename
const page =
	document.body.id || window.location.pathname.split("/").pop().split(".")[0];
console.log("🚀 ~ page:", page)

// Dynamically load feature scripts
switch (page) {
	case "product":
		import("./features/products/index.js")
			.then((module) => {
				console.log("✅ Product page logic loaded");
			})
			.catch((err) => console.error("Failed to load product page:", err));
		break;

	case "product-details":
		import("./features/products/details.js")
			.then((module) => {
				console.log("✅ Product details page logic loaded");
			})
			.catch((err) => console.error("Failed to load product details:", err));
		break;

	case "auth":
		import("./features/auth/auth.js")
			.then((module) => {
				console.log("✅ Auth page logic loaded");
			})
			.catch((err) => console.error("Failed to load auth logic:", err));
		break;

	default:
		console.log("No specific page logic found.");
}
