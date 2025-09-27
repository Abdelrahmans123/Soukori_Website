// main.js - Updated integration
import { ProductFilters } from "./productFilter.js";

let productFilter;

document.addEventListener("DOMContentLoaded", async () => {
	try {
		// Initialize ProductFilters (it handles everything internally)
		productFilter = new ProductFilters();

		// Set up pagination event listeners to use ProductFilters methods
		setupPaginationEvents();

		console.log("Product system initialized successfully");
	} catch (error) {
		console.error("Error initializing product system:", error);
	}
});

function setupPaginationEvents() {
	// Previous button
	const prevBtn = document.querySelector(".pagination .previous button");
	if (prevBtn) {
		prevBtn.addEventListener("click", async () => {
			await productFilter.previousPage();
			updatePaginationUI();
		});
	}

	// Next button
	const nextBtn = document.querySelector(".pagination .next button");
	if (nextBtn) {
		nextBtn.addEventListener("click", async () => {
			await productFilter.nextPage();
			updatePaginationUI();
		});
	}

	// Page number clicks
	const paginationContainer = document.querySelector(".pagination .pages");
	if (paginationContainer) {
		paginationContainer.addEventListener("click", async (e) => {
			if (
				e.target.classList.contains("page") &&
				!e.target.classList.contains("dots") &&
				!e.target.classList.contains("active")
			) {
				const pageNumber = parseInt(e.target.dataset.page);
				if (pageNumber) {
					await productFilter.loadPage(pageNumber);
					updatePaginationUI();
				}
			}
		});
	}
}

function updatePaginationUI() {
	const paginationState = productFilter.getPaginationState();
	const { currentPage, totalPages, total, hasNext, hasPrev } = paginationState;

	// Update pagination controls
	const prevBtn = document.querySelector(".pagination .previous button");
	if (prevBtn) {
		prevBtn.disabled = !hasPrev;
		prevBtn.classList.toggle("disabled", !hasPrev);
	}

	const nextBtn = document.querySelector(".pagination .next button");
	if (nextBtn) {
		nextBtn.disabled = !hasNext;
		nextBtn.classList.toggle("disabled", !hasNext);
	}

	// Update page numbers
	const pagesList = document.querySelector(".pagination .pages");
	if (pagesList) {
		pagesList.innerHTML = generatePageNumbers(currentPage, totalPages);
	}
}

function generatePageNumbers(currentPage, totalPages) {
	let pagesHTML = "";
	const maxVisiblePages = 7;

	if (totalPages <= maxVisiblePages) {
		for (let i = 1; i <= totalPages; i++) {
			pagesHTML += `<li class="page ${
				i === currentPage ? "active" : ""
			}" data-page="${i}">${i}</li>`;
		}
	} else {
		pagesHTML += `<li class="page ${
			1 === currentPage ? "active" : ""
		}" data-page="1">1</li>`;

		if (currentPage > 4) {
			pagesHTML += '<li class="page dots">...</li>';
		}

		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);

		for (let i = start; i <= end; i++) {
			pagesHTML += `<li class="page ${
				i === currentPage ? "active" : ""
			}" data-page="${i}">${i}</li>`;
		}

		if (currentPage < totalPages - 3) {
			pagesHTML += '<li class="page dots">...</li>';
		}

		if (totalPages > 1) {
			pagesHTML += `<li class="page ${
				totalPages === currentPage ? "active" : ""
			}" data-page="${totalPages}">${totalPages}</li>`;
		}
	}

	return pagesHTML;
}

// Make productFilter available globally for debugging
window.productFilter = productFilter;

// Export functions if needed by other modules
export function getPaginationState() {
	return productFilter ? productFilter.getPaginationState() : null;
}

export async function loadPage(pageNumber) {
	if (productFilter) {
		const result = await productFilter.loadPage(pageNumber);
		updatePaginationUI();
		return result;
	}
	return false;
}
