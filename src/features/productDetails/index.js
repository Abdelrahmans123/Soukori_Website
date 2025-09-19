// index.js
import { ProductPage } from "./productDetailsUI.js";

document.addEventListener("DOMContentLoaded", async () => {
	// Initialize Product Page
	const productPage = new ProductPage();
	window.updateStock = async function (
		productId,
		variantIndex,
		sizeSelected,
		newQuantity
	) {
		return await productPage.updateStock(
			productId,
			variantIndex,
			sizeSelected,
			newQuantity
		);
	};
});
