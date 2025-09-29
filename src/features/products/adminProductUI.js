import {
	collection,
	query,
	orderBy,
	limit,
	getDocs,
	getCountFromServer,
	doc,
	deleteDoc,
	getDoc,
	setDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { ProductPagination } from "./firebase.js";
import db from "../../config/firebase.js";
import {
	showDeleteConfirmation,
	showSuccessMessage as swalSuccess,
	showErrorMessage as swalError,
} from "../general/utils.js";

// Get auth instance
const auth = getAuth();
const pageSize = 8;
const productPagination = new ProductPagination(pageSize);
// Global state management
let currentState = {
	products: [],
	currentPage: 1,
	totalPages: 0,
	isLoading: false,
};

// Render single product card with consistent styling
function renderAdminProductCard(product) {
	const displayPrice = product.variants[0].sizes[0].price;
	const discountedPrice =
		product.discount > 0
			? (displayPrice * (1 - product.discount)).toFixed(2)
			: displayPrice;

	return `
    <div class="col-lg-3 col-md-6 mb-4" data-product-id="${product.id}">
      <div class="card product-card h-100">
        <div class="product-header">
          <div class="d-flex align-items-center">
            <img src="${
							product.variants?.[0]?.image || "/assets/placeholder.jpg"
						}" 
                 class="product-image"
                 alt="${product.name}" 
                 style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
            <div class="ms-3 flex-grow-1">
              <div class="product-title fw-bold">${product.name}</div>
              <div class="product-category text-muted small">${
								product.brand
							}</div>
              <div class="product-price">
                ${
									product.discount > 0
										? `<span class="text-decoration-line-through text-muted me-2">$${displayPrice}</span>
                   <span class="text-success fw-bold">$${discountedPrice}</span>`
										: `<span class="fw-bold">$${displayPrice} </span>`
								}
              </div>
            </div>
          </div>
          <div class="dropdown">
            <button class="btn btn-link p-1" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="fas fa-ellipsis-vertical"></i>
            </button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="edit.html?id=${product.id}">
                <i class="fas fa-edit me-2"></i>Edit</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item text-danger" onclick="handleDeleteProduct('${
								product.id
							}')">
                <i class="fas fa-trash me-2"></i>Delete</button></li>
            </ul>
          </div>
        </div>
        
        <div class="product-summary mt-3">
          <div class="summary-title fw-semibold">Summary</div>
          <div class="summary-text text-muted small text-truncate-3">
            ${product.description || "No description available"}
          </div>
        </div>
        
        <div class="product-stats mt-auto">
          <div class="stat-row d-flex justify-content-between mb-1">
            <span class="small">Sales</span>
            <span class="small">
              <i class="fa-solid fa-arrow-up text-success"></i> 
              ${getTotalRatings(product)}
            </span>
          </div>
          <div class="stat-row d-flex justify-content-between align-items-center">
            <span class="small">Stock</span>
            <div class="d-flex align-items-center">
              <div class="progress me-2" style="width: 60px; height: 4px;">
                <div class="progress-bar bg-primary" 
                     style="width: ${Math.min(
												(getTotalStock(product) / 100) * 100,
												100
											)}%"></div>
              </div>
              <span class="small fw-bold">${getTotalStock(product)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helper functions
function getTotalStock(product) {
	if (!product.variants || !Array.isArray(product.variants)) return 0;
	return product.variants.reduce((total, variant) => {
		if (variant.sizes && Array.isArray(variant.sizes)) {
			return (
				total +
				variant.sizes.reduce(
					(sizeTotal, size) => sizeTotal + (size.quantity || 0),
					0
				)
			);
		}
		return total;
	}, 0);
}

function getTotalRatings(product) {
	if (!product.ratings || typeof product.ratings !== "object") return 0;
	return Object.values(product.ratings).reduce(
		(total, count) => total + count,
		0
	);
}

function calculateStock(product) {
	const total = getTotalStock(product);
	const max = 1000;
	return Math.min((total / max) * 100, 100);
}

// Render products in container
function renderAdminProducts(products, container) {
	if (!container) {
		console.error("Container not found!");
		return;
	}

	if (!products || products.length === 0) {
		container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info text-center py-5">
          <i class="fas fa-box-open fs-1 mb-3 text-muted"></i>
          <h5>No Products Found</h5>
          <p class="text-muted">Start by adding your first product to get started.</p>
          <a href="add.html" class="btn btn-primary mt-2">
            <i class="fas fa-plus"></i> Add New Product
          </a>
        </div>
      </div>
    `;
		return;
	}

	// Clear container and render new products
	container.innerHTML = products
		.map((product) => renderAdminProductCard(product))
		.join("");

	// Store current products in state
	currentState.products = products;
}

// Loading state management
function showLoading(container) {
	if (!container) return;
	container.innerHTML = `
    <div class="col-12">
      <div class="text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <h5>Loading products...</h5>
      </div>
    </div>
  `;
}

// Error state management
function showError(container, message) {
	if (!container) return;
	container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        ${message}
        <button class="btn btn-outline-danger btn-sm ms-3" onclick="location.reload()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    </div>
  `;
}

// Load specific page
async function loadPage(pageNumber) {
	const container =
		document.querySelector(".container .row") ||
		document.getElementById("productsContainer");

	if (!container) {
		return;
	}

	if (currentState.isLoading) {
		return;
	}

	try {
		currentState.isLoading = true;
		showLoading(container);

		let result;
		http: if (pageNumber === 1) {
			result = await productPagination.getFirstPage();
		} else {
			result = await productPagination.goToPage(pageNumber);
		}
		currentState.currentPage = result.currentPage;
		currentState.totalPages = result.totalPages;
		renderAdminProducts(result.products, container);
		updatePaginationControls(result);
	} catch (error) {
		console.error("Error loading page:", error);
		showError(container, `Failed to load page ${pageNumber}. ${error.message}`);
	} finally {
		currentState.isLoading = false;
	}
}

function updatePaginationControls(result) {
	const paginationContainer = document.querySelector(".pagination");
	if (!paginationContainer) return;

	const prevBtn = paginationContainer.querySelector(".previous button");
	const nextBtn = paginationContainer.querySelector(".next button");
	const pagesList = paginationContainer.querySelector(".pages");
	if (prevBtn) {
		prevBtn.disabled = !result.hasPrev;
		prevBtn.onclick = result.hasPrev
			? () => loadPage(result.currentPage - 1)
			: null;
	}
	if (nextBtn) {
		nextBtn.disabled = !result.hasNext;
		nextBtn.onclick = result.hasNext
			? () => loadPage(result.currentPage + 1)
			: null;
	}
	if (pagesList) {
		pagesList.innerHTML = "";
		const startPage = Math.max(1, result.currentPage - 2);
		const endPage = Math.min(result.totalPages, startPage + 4);
		for (let i = startPage; i <= endPage; i++) {
			const li = document.createElement("li");
			li.className = i === result.currentPage ? "active" : "";
			li.innerHTML = `<button class="btn ${
				i === result.currentPage ? "btn-dark" : "btn-outline-dark"
			}">${i}</button>`;
			li.onclick = () => loadPage(i);
			pagesList.appendChild(li);
		}
		if (endPage < result.totalPages) {
			if (endPage < result.totalPages - 1) {
				const ellipsis = document.createElement("li");
				ellipsis.innerHTML = '<span class="px-3">...</span>';
				pagesList.appendChild(ellipsis);
			}

			const lastLi = document.createElement("li");
			lastLi.innerHTML = `	<button class="btn btn-outline-dark">${result.totalPages}</button>`;
			lastLi.onclick = () => loadPage(result.totalPages);
			pagesList.appendChild(lastLi);
		}
	}

	const info = document.querySelector(".pagination-info");
	if (info) {
		info.textContent = `Page ${result.currentPage} of ${result.totalPages} (${result.totalProducts} total products)`;
	}
}

window.handleDeleteProduct = async function (productId) {
	if (!productId) {
		alert("Invalid product ID");
		return;
	}

	try {
		const result = await showDeleteConfirmation();
		if (!result || !result.isConfirmed) return;
	} catch (err) {
		console.error("Confirmation dialog failed:", err);
		return;
	}

	try {
		const productCard = document.querySelector(
			`[data-product-id="${productId}"]`
		);
		if (productCard) {
			productCard.style.opacity = "0.6";
			productCard.style.pointerEvents = "none";
		}

		await deleteDoc(doc(db, "products", productId));
		if (productCard) {
			productCard.style.transition = "all 0.3s ease";
			productCard.style.transform = "scale(0.8)";
			productCard.style.opacity = "0";

			setTimeout(() => {
				productCard.remove();
				const remainingCards = document.querySelectorAll("[data-product-id]");
				if (remainingCards.length === 0) {
					const pageToLoad =
						currentState.currentPage > 1 && currentState.products.length === 1
							? currentState.currentPage - 1
							: currentState.currentPage;
					loadPage(pageToLoad);
				}
			}, 300);
		}

		await swalSuccess("Deleted!", "Product deleted successfully.");
	} catch (error) {
		console.error("Error deleting product:", error);
		try {
			await swalError("Failed to delete product. Please try again.");
		} catch (e) {
			alert(`Failed to delete product: ${error.message}`);
		}
		const productCard = document.querySelector(
			` [data-product-id="${productId}"]`
		);
		if (productCard) {
			productCard.style.opacity = "1";
			productCard.style.pointerEvents = "auto";
		}
	}
};

function initializePaginationControls() {
	const paginationContainer = document.querySelector(".pagination");
	if (!paginationContainer) {
		createPaginationContainer();
	}
}

// Create pagination container if it doesn't exist
function createPaginationContainer() {
	const main = document.querySelector(".main");
	if (!main) return;

	const paginationHTML = `
    <div class="pagination d-flex justify-content-between align-items-center mt-4 px-4">
      <div class="previous">
        <button class="btn btn-outline-secondary" disabled>
          <i class="fa-solid fa-arrow-left me-1"></i>
          Previous
        </button>
      </div>
      <ul class="pages d-flex list-unstyled mb-0"></ul>
      <div class="next">
        <button class="btn btn-outline-secondary" disabled>
          Next
          <i class="fa-solid fa-arrow-right ms-1"></i>
        </button>
      </div>
    </div>
  `;

	main.insertAdjacentHTML("beforeend", paginationHTML);
}

// Main initialization function
export async function initializeAdminProducts() {
	const container =
		document.querySelector(".container .row") ||
		document.getElementById("productsContainer");

	if (!container) {
		console.error("Products container not found!");
		return;
	}

	try {
		await productPagination.getTotalCount();
		await loadPage(1);

		// Initialize pagination controls
		initializePaginationControls();
	} catch (error) {
		console.error(" Error initializing admin products:", error);
		showError(container, "Failed to load products. Please refresh the page.");
	}
}
document.addEventListener("DOMContentLoaded", () => {
	initializeAdminProducts();
});

export {
	renderAdminProducts,
	renderAdminProductCard,
	loadPage,
	getTotalStock,
	calculateStock,
};
