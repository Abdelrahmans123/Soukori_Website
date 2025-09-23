import {
	initializeProducts,
	loadPage,
	nextPage,
	previousPage,
	getPaginationState,
	
} from "./productUI.js";

import {
	ProductFilters,
} from "./productFilter.js"
const productFilter=new ProductFilters();
document.addEventListener("DOMContentLoaded", () => {
	initializeProducts();
	productFilter.initializeFilters();
});
