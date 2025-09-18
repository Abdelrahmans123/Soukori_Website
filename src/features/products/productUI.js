// Simplified initialization for your main.js
import {
	collection,
	query,
	orderBy,
	limit,
	getDocs,
	getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js"; // Your Firebase config

// Simple pagination state
let currentPage = 1;
let totalPages = 0;
let totalProducts = 0;
const pageSize = 6;
let lastVisible = null;
let firstVisible = null;

// Get total count of products
async function getTotalProductCount() {
	try {
		const productsRef = collection(db, "products");
		const snapshot = await getCountFromServer(productsRef);
		totalProducts = snapshot.data().count;
		totalPages = Math.ceil(totalProducts / pageSize);
		return totalProducts;
	} catch (error) {
		console.error("Error getting total count:", error);
		return 0;
	}
}

// Get products for current page
async function getProducts(page = 1) {
	try {
		const productsRef = collection(db, "products");
		let q;

		if (page === 1) {
			// First page
			q = query(productsRef, orderBy("createdAt", "desc"), limit(pageSize));
		} else {
			// For simplicity, let's use offset-based pagination for jumping to specific pages
			// This is less efficient but more reliable for now
			const offset = (page - 1) * pageSize;
			q = query(
				productsRef,
				orderBy("createdAt", "desc"),
				limit(offset + pageSize)
			);
		}

		const querySnapshot = await getDocs(q);
		const allDocs = querySnapshot.docs;

		let products = [];

		if (page === 1) {
			// First page - take all results
			products = allDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
			if (allDocs.length > 0) {
				firstVisible = allDocs[0];
				lastVisible = allDocs[allDocs.length - 1];
			}
		} else {
			// Other pages - slice the results
			const offset = (page - 1) * pageSize;
			const pageProducts = allDocs.slice(offset, offset + pageSize);
			products = pageProducts.map((doc) => ({ id: doc.id, ...doc.data() }));

			if (pageProducts.length > 0) {
				firstVisible = pageProducts[0];
				lastVisible = pageProducts[pageProducts.length - 1];
			}
		}

		currentPage = page;

		return {
			products,
			currentPage,
			totalPages,
			totalProducts,
			hasNext: currentPage < totalPages,
			hasPrev: currentPage > 1,
		};
	} catch (error) {
		console.error("Error getting products:", error);
		throw error;
	}
}

// Initialize and load first page
export async function initializeProducts() {
	try {
		showLoadingState();

		// Get total count first
		await getTotalProductCount();

		// Load first page
		const result = await getProducts(1);

		renderProducts(result.products);
		updatePaginationUI(result);

		return result;
	} catch (error) {
		console.error("Error initializing products:", error);
		showErrorState(error);
		throw error;
	}
}

// Load specific page
export async function loadPage(pageNumber) {
	if (pageNumber < 1) {
		throw new Error("Page number must be at least 1");
	}

	// If we don't have total count yet, get it
	if (totalPages === 0) {
		await getTotalProductCount();
	}

	if (pageNumber > totalPages) {
		throw new Error(
			`Page ${pageNumber} does not exist. Maximum page is ${totalPages}`
		);
	}

	try {
		showLoadingState();
		const result = await getProducts(pageNumber);
		renderProducts(result.products);
		updatePaginationUI(result);
		return result;
	} catch (error) {
		console.error("Error loading page:", error);
		showErrorState(error);
		throw error;
	}
}

// Navigation functions
export async function nextPage() {
	if (currentPage < totalPages) {
		return await loadPage(currentPage + 1);
	}
}

export async function previousPage() {
	if (currentPage > 1) {
		return await loadPage(currentPage - 1);
	}
}

// Get current pagination state
export function getPaginationState() {
	return {
		currentPage,
		totalPages,
		totalProducts,
		hasNext: currentPage < totalPages,
		hasPrev: currentPage > 1,
	};
}

// Utility functions (keep your existing ones)
function showLoadingState() {
	const productsContainer = document.getElementById("productsContainer");
	productsContainer.innerHTML = `
        <div class="col-12">
            <div class="products-loading">
                <i class="fas fa-spinner"></i>
                Loading products...
            </div>
        </div>
    `;
}

function showErrorState(error) {
	const productsContainer = document.getElementById("productsContainer");
	productsContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Failed to load products. Please try again later.
                <br><small class="text-muted mt-2">${error.message}</small>
            </div>
        </div>
    `;
}

function generateStarRating(avgRating) {
	let starsHTML = "";
	for (let i = 0; i < 5; i++) {
		if (i < Math.floor(avgRating)) {
			starsHTML += '<i class="fas fa-star"></i>';
		} else if (i < avgRating) {
			starsHTML += '<i class="fas fa-star-half-alt"></i>';
		} else {
			starsHTML += '<i class="far fa-star"></i>';
		}
	}
	return starsHTML;
}

function getAverageRating(ratings) {
	if (!ratings) return 0;
	let totalStars = 0;
	let totalVotes = 0;
	for (const [stars, count] of Object.entries(ratings)) {
		totalStars += parseInt(stars) * count;
		totalVotes += count;
	}
	return totalVotes === 0 ? 0 : totalStars / totalVotes;
}

function getTotalRatings(ratings) {
	if (!ratings) return 0;
	return Object.values(ratings).reduce((total, count) => total + count, 0);
}

function renderProducts(products) {
	const productsContainer = document.getElementById("productsContainer");

	if (!products || products.length === 0) {
		productsContainer.innerHTML = `
            <div class="col-12">
                <div class="products-empty">
                    <i class="fas fa-box-open"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filters.</p>
                </div>
            </div>
        `;
		return;
	}

	productsContainer.innerHTML = "";

	products.forEach((product) => {
		const productCard = document.createElement("div");
		productCard.classList.add("col-12", "col-md-6", "col-lg-4");

		productCard.innerHTML = `
            <div class="productCard">
                <div class="productImage">
                    <img src="${
											product.variants?.[0]?.image || "/assets/placeholder.jpg"
										}" alt="${
			product.name
		}" class="img-fluid" onerror="this.src='/assets/placeholder.jpg'">
                    <div class="productActions">
                        <button class="actionBtn wishlistBtn" title="Add to Wishlist">
                            <i class="far fa-heart"></i>
                        </button>
                        <button class="actionBtn quickViewBtn" title="Quick View">
                            <i class="far fa-eye"></i>
                        </button>
                    </div>
                    ${
											product.discount && product.discount > 0
												? `<div class="discountBadge">-${product.discount}%</div>`
												: ""
										}
                </div>
                <div class="productInfo">
                    <h3 class="productTitle">${product.name}</h3>
                    <div class="productRating">
                        ${generateStarRating(getAverageRating(product.ratings))}
                        <span class="ratingCount">(${getTotalRatings(
													product.ratings
												)})</span>
                    </div>
                    <div class="productPrice">
                        ${
													product.discount && product.discount > 0
														? `<span class="currentPrice">$${(
																product.price *
																(1 - product.discount / 100)
														  ).toFixed(2)}</span>
                               <span class="originalPrice">$${product.price.toFixed(
																	2
																)}</span>`
														: `<span class="currentPrice">$${product.price.toFixed(
																2
														  )}</span>`
												}
                    </div>
                    <button class="addToCartBtn">
                        <i class="fas fa-shopping-cart me-2"></i>
                        Add to Cart
                    </button>
                </div>
            </div>
        `;

		productsContainer.appendChild(productCard);
	});

	// Add event listeners
	addProductEventListeners();
}

function updatePaginationUI(paginationData) {
	const { currentPage, totalPages, totalProducts, hasNext, hasPrev } =
		paginationData;

	// Update showing results text
	const showNumbers = document.querySelector(".showNumbers p");
	if (showNumbers) {
		const startItem = (currentPage - 1) * pageSize + 1;
		const endItem = Math.min(currentPage * pageSize, totalProducts);
		showNumbers.textContent = `Showing ${startItem}-${endItem} of ${totalProducts} results`;
	}

	// Update pagination controls
	const paginationContainer = document.querySelector(".pagination");
	if (paginationContainer) {
		const prevBtn = paginationContainer.querySelector(".previous button");
		if (prevBtn) {
			prevBtn.disabled = !hasPrev;
			prevBtn.classList.toggle("disabled", !hasPrev);
		}

		const nextBtn = paginationContainer.querySelector(".next button");
		if (nextBtn) {
			nextBtn.disabled = !hasNext;
			nextBtn.classList.toggle("disabled", !hasNext);
		}

		const pagesList = paginationContainer.querySelector(".pages");
		if (pagesList) {
			pagesList.innerHTML = generatePageNumbers(currentPage, totalPages);
		}
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

function addProductEventListeners() {
	document.querySelectorAll(".addToCartBtn").forEach((btn) => {
		btn.addEventListener("click", function (e) {
			e.preventDefault();
			this.innerHTML = '<i class="fas fa-check me-2"></i>Added!';
			this.style.backgroundColor = "#28a745";
			setTimeout(() => {
				this.innerHTML = '<i class="fas fa-shopping-cart me-2"></i>Add to Cart';
				this.style.backgroundColor = "";
			}, 2000);
		});
	});

	document.querySelectorAll(".wishlistBtn").forEach((btn) => {
		btn.addEventListener("click", function (e) {
			e.preventDefault();
			const icon = this.querySelector("i");
			if (icon.classList.contains("far")) {
				icon.classList.remove("far");
				icon.classList.add("fas");
				this.style.color = "#e74c3c";
			} else {
				icon.classList.remove("fas");
				icon.classList.add("far");
				this.style.color = "";
			}
		});
	});
}

// Initialize pagination event listeners
function initializePaginationEvents() {
	const prevBtn = document.querySelector(".pagination .previous button");
	if (prevBtn) {
		prevBtn.addEventListener("click", previousPage);
	}

	const nextBtn = document.querySelector(".pagination .next button");
	if (nextBtn) {
		nextBtn.addEventListener("click", nextPage);
	}

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
					await loadPage(pageNumber);
				}
			}
		});
	}
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	initializePaginationEvents();
	initializeProducts();
});
