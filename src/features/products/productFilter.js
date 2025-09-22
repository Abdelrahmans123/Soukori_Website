import { Pagination } from "../Pagination/firebase.js";
import {
	collection,
	query,
	where,
	orderBy,
	limit,
	getDocs,
	startAfter,
	endBefore,
	limitToLast,
	getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";

class ProductFilters {
	constructor() {
		this.pageSize = 6;
		this.tableName = "products";
		this.currentPage = 1;
		this.totalPages = 0;
		this.total = 0;
		this.firstVisible = null;
		this.lastVisible = null;

		// Active filters
		this.filters = {
			categories: [],
			priceRange: { min: 0, max: 500 },
			colors: [],
			sizes: [],
			dressStyles: [],
			brands: [],
			sortBy: "popular",
		};

		this.initializeFilters();
	}

	initializeFilters() {
		this.setupCategoryFilters();
		this.setupPriceRange();
		this.setupColorFilters();
		this.setupSizeFilters();
		this.setupDressStyleFilters();
		this.setupSortOptions();
		this.setupApplyButton();
	}

	setupCategoryFilters() {
		const categoryFilters = document.querySelectorAll(
			'.category_filter input[type="radio"]'
		);
		categoryFilters.forEach((filter, index) => {
			const categoryNames = ["T-Shirt", "Shorts", "Shirts", "Hoodie", "Jeans"];

			filter.addEventListener("change", (e) => {
				if (e.target.checked) {
					this.filters.categories = [categoryNames[index]];
					this.applyFilters();
				}
			});
		});
	}

	setupPriceRange() {
		const rangeMin = document.getElementById("range-min");
		const rangeMax = document.getElementById("range-max");
		const minLabel = document.getElementById("min-label");
		const maxLabel = document.getElementById("max-label");
		const sliderRange = document.getElementById("slider-range");

		// Mobile elements
		const rangeMobileMin = document.getElementById("range-min-mobile");
		const rangeMobileMax = document.getElementById("range-max-mobile");
		const minMobileLabel = document.getElementById("min-label-mobile");
		const maxMobileLabel = document.getElementById("max-label-mobile");
		const sliderMobileRange = document.getElementById("slider-range-mobile");

		const updatePriceRange = (minVal, maxVal, isDesktop = true) => {
			// Ensure min doesn't exceed max
			if (parseInt(minVal) > parseInt(maxVal)) {
				if (isDesktop) {
					rangeMin.value = maxVal;
					minVal = maxVal;
				} else {
					rangeMobileMin.value = maxVal;
					minVal = maxVal;
				}
			}

			// Update labels
			if (isDesktop) {
				minLabel.textContent = `$${minVal}`;
				maxLabel.textContent = `$${maxVal}`;

				// Update slider visual
				const percent1 = (minVal / rangeMin.max) * 100;
				const percent2 = (maxVal / rangeMax.max) * 100;
				sliderRange.style.left = percent1 + "%";
				sliderRange.style.width = percent2 - percent1 + "%";
			} else {
				minMobileLabel.textContent = `$${minVal}`;
				maxMobileLabel.textContent = `$${maxVal}`;

				// Update mobile slider visual
				const percent1 = (minVal / rangeMobileMin.max) * 100;
				const percent2 = (maxVal / rangeMobileMax.max) * 100;
				sliderMobileRange.style.left = percent1 + "%";
				sliderMobileRange.style.width = percent2 - percent1 + "%";
			}

			// Update filter state
			this.filters.priceRange = {
				min: parseInt(minVal),
				max: parseInt(maxVal),
			};
		};

		// Desktop price range
		if (rangeMin && rangeMax) {
			rangeMin.addEventListener("input", (e) => {
				updatePriceRange(e.target.value, rangeMax.value, true);
			});

			rangeMax.addEventListener("input", (e) => {
				updatePriceRange(rangeMin.value, e.target.value, true);
			});
		}

		// Mobile price range
		if (rangeMobileMin && rangeMobileMax) {
			rangeMobileMin.addEventListener("input", (e) => {
				updatePriceRange(e.target.value, rangeMobileMax.value, false);
			});

			rangeMobileMax.addEventListener("input", (e) => {
				updatePriceRange(rangeMobileMin.value, e.target.value, false);
			});
		}
	}

	setupColorFilters() {
		const colorOptions = document.querySelectorAll(".colorOption");
		const colorMap = {
			green: "#00FF00",
			red: "#FF0000",
			yellow: "#FFFF00",
			orange: "#FFA500",
			aqua: "#00FFFF",
			blue: "#0000FF",
			purple: "#800080",
			pink: "#FFC0CB",
			white: "#FFFFFF",
			black: "#000000",
		};

		colorOptions.forEach((option) => {
			option.addEventListener("click", () => {
				const colorClass = Array.from(option.classList).find(
					(cls) => cls !== "colorOption" && colorMap[cls]
				);

				if (colorClass) {
					const colorValue = colorMap[colorClass];
					const checkIcon = option.querySelector(".checkIcon");

					if (option.classList.contains("selected")) {
						option.classList.remove("selected");
						if (checkIcon) checkIcon.style.display = "none";
						this.filters.colors = this.filters.colors.filter(
							(c) => c !== colorValue
						);
					} else {
						option.classList.add("selected");
						if (checkIcon) checkIcon.style.display = "block";
						this.filters.colors.push(colorValue);
					}
				}
			});
		});
	}

	setupSizeFilters() {
		const sizeOptions = document.querySelectorAll(".sizeOption");

		sizeOptions.forEach((option) => {
			option.addEventListener("click", () => {
				const sizeText = option.querySelector("p").textContent;

				if (
					option.classList.contains("active") ||
					option.classList.contains("selected")
				) {
					option.classList.remove("active", "selected");
					this.filters.sizes = this.filters.sizes.filter((s) => s !== sizeText);
				} else {
					option.classList.add("active");
					this.filters.sizes.push(sizeText);
				}
			});
		});
	}

	setupDressStyleFilters() {
		const dressStyleFilters = document.querySelectorAll(
			'.dressCode_Filter input[type="radio"]'
		);
		dressStyleFilters.forEach((filter, index) => {
			const styleNames = ["Casual", "Formal", "Party", "Gym"];

			filter.addEventListener("change", (e) => {
				if (e.target.checked) {
					this.filters.dressStyles = [styleNames[index]];
					this.applyFilters();
				}
			});
		});
	}

	setupSortOptions() {
		const sortDropdown = document.querySelector(".sortDropdown");
		const sortSelection = document.querySelector(".sortSelection");

		if (sortSelection) {
			sortSelection.addEventListener("click", () => {
				if (sortDropdown) {
					sortDropdown.classList.toggle("d-none");
				}
			});
		}

		if (sortDropdown) {
			const sortOptions = sortDropdown.querySelectorAll("li");
			sortOptions.forEach((option) => {
				option.addEventListener("click", () => {
					const sortText = option.textContent;
					const sortValue = this.getSortValue(sortText);

					this.filters.sortBy = sortValue;
					sortSelection.querySelector("p").textContent = sortText;
					sortDropdown.classList.add("d-none");

					this.applyFilters();
				});
			});
		}
	}

	getSortValue(sortText) {
		switch (sortText) {
			case "Most Popular":
				return "popular";
			case "Best Rating":
				return "rating";
			case "Newest":
				return "newest";
			case "Price: Low to High":
				return "price_asc";
			case "Price: High to Low":
				return "price_desc";
			default:
				return "popular";
		}
	}

	setupApplyButton() {
		const applyButtons = document.querySelectorAll(".applyFilterBtn button");
		applyButtons.forEach((button) => {
			button.addEventListener("click", () => {
				this.applyFilters();
				// Close mobile offcanvas if open
				const offcanvas = document.getElementById("filtersOffcanvas");
				if (offcanvas) {
					const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
					if (bsOffcanvas) {
						bsOffcanvas.hide();
					}
				}
			});
		});
	}

	buildFirestoreQuery() {
		let queryConstraints = [orderBy("createdAt", "desc")];

		// Category filter
		if (this.filters.categories.length > 0) {
			queryConstraints.push(where("category", "in", this.filters.categories));
		}

		// Status filter (only show available products)
		queryConstraints.push(where("status", "==", "available"));

		return query(collection(db, this.tableName), ...queryConstraints);
	}

	filterProductsClientSide(products) {
		return products.filter((product) => {
			// Price filter
			if (
				this.filters.priceRange.min > 0 ||
				this.filters.priceRange.max < 500
			) {
				const productPrice = this.getProductPrice(product);
				if (
					productPrice < this.filters.priceRange.min ||
					productPrice > this.filters.priceRange.max
				) {
					return false;
				}
			}

			// Color filter
			if (this.filters.colors.length > 0) {
				const productColors = product.variants?.map((v) => v.color) || [];
				if (
					!this.filters.colors.some((color) => productColors.includes(color))
				) {
					return false;
				}
			}

			// Size filter
			if (this.filters.sizes.length > 0) {
				const productSizes = [];
				product.variants?.forEach((variant) => {
					variant.sizes?.forEach((size) => {
						productSizes.push(size.size);
					});
				});
				if (!this.filters.sizes.some((size) => productSizes.includes(size))) {
					return false;
				}
			}

			// Dress style filter
			if (this.filters.dressStyles.length > 0) {
				if (!this.filters.dressStyles.includes(product.style)) {
					return false;
				}
			}

			return true;
		});
	}

	sortProducts(products) {
		switch (this.filters.sortBy) {
			case "rating":
				return products.sort((a, b) => {
					const aRating = this.getAverageRating(a.ratings);
					const bRating = this.getAverageRating(b.ratings);
					return bRating - aRating;
				});

			case "newest":
				return products.sort((a, b) => {
					return new Date(b.createdAt) - new Date(a.createdAt);
				});

			case "price_asc":
				return products.sort((a, b) => {
					return this.getProductPrice(a) - this.getProductPrice(b);
				});

			case "price_desc":
				return products.sort((a, b) => {
					return this.getProductPrice(b) - this.getProductPrice(a);
				});

			case "popular":
			default:
				return products.sort((a, b) => {
					const aTotalRatings = this.getTotalRatings(a.ratings);
					const bTotalRatings = this.getTotalRatings(b.ratings);
					return bTotalRatings - aTotalRatings;
				});
		}
	}

	getProductPrice(product) {
		if (
			!product.variants ||
			!product.variants[0] ||
			!product.variants[0].sizes ||
			!product.variants[0].sizes[0]
		) {
			return 0;
		}
		const basePrice = product.variants[0].sizes[0].price;
		const discount = product.discount || 0;
		return basePrice * (1 - discount);
	}

	getAverageRating(ratings) {
		if (!ratings) return 0;
		let totalStars = 0;
		let totalVotes = 0;
		for (const [stars, count] of Object.entries(ratings)) {
			totalStars += parseInt(stars) * count;
			totalVotes += count;
		}
		return totalVotes === 0 ? 0 : totalStars / totalVotes;
	}

	getTotalRatings(ratings) {
		if (!ratings) return 0;
		return Object.values(ratings).reduce((total, count) => total + count, 0);
	}

	async applyFilters() {
		try {
			showLoadingState();

			// Build Firestore query
			const firestoreQuery = this.buildFirestoreQuery();

			// Get all products that match Firestore-level filters
			const querySnapshot = await getDocs(firestoreQuery);
			let allProducts = [];
			querySnapshot.forEach((doc) => {
				allProducts.push({ id: doc.id, ...doc.data() });
			});

			// Apply client-side filters
			let filteredProducts = this.filterProductsClientSide(allProducts);

			// Sort products
			filteredProducts = this.sortProducts(filteredProducts);

			// Update totals
			this.total = filteredProducts.length;
			this.totalPages = Math.ceil(this.total / this.pageSize);
			this.currentPage = 1;

			// Get first page
			const startIndex = 0;
			const endIndex = Math.min(this.pageSize, filteredProducts.length);
			const pageProducts = filteredProducts.slice(startIndex, endIndex);

			// Store filtered products for pagination
			this.allFilteredProducts = filteredProducts;

			// Render products
			renderProducts(pageProducts);

			// Update pagination UI
			updatePaginationUI({
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				total: this.total,
				hasNext: this.currentPage < this.totalPages,
				hasPrev: this.currentPage > 1,
			});
		} catch (error) {
			console.error("Error applying filters:", error);
			showErrorState(error);
		}
	}

	async loadPage(pageNumber) {
		if (!this.allFilteredProducts) {
			await this.applyFilters();
			return;
		}

		this.currentPage = pageNumber;
		const startIndex = (pageNumber - 1) * this.pageSize;
		const endIndex = Math.min(
			startIndex + this.pageSize,
			this.allFilteredProducts.length
		);
		const pageProducts = this.allFilteredProducts.slice(startIndex, endIndex);

		renderProducts(pageProducts);
		updatePaginationUI({
			currentPage: this.currentPage,
			totalPages: this.totalPages,
			total: this.total,
			hasNext: this.currentPage < this.totalPages,
			hasPrev: this.currentPage > 1,
		});
	}

	async nextPage() {
		if (this.currentPage < this.totalPages) {
			await this.loadPage(this.currentPage + 1);
		}
	}

	async previousPage() {
		if (this.currentPage > 1) {
			await this.loadPage(this.currentPage - 1);
		}
	}

	clearFilters() {
		this.filters = {
			categories: [],
			priceRange: { min: 0, max: 500 },
			colors: [],
			sizes: [],
			dressStyles: [],
			brands: [],
			sortBy: "popular",
		};

		// Reset UI elements
		this.resetFilterUI();
		this.applyFilters();
	}

	resetFilterUI() {
		// Reset category filters
		document
			.querySelectorAll('.category_filter input[type="radio"]')
			.forEach((input) => {
				input.checked = false;
			});

		// Reset price range
		const rangeMin = document.getElementById("range-min");
		const rangeMax = document.getElementById("range-max");
		if (rangeMin) rangeMin.value = 0;
		if (rangeMax) rangeMax.value = 500;

		// Reset color filters
		document.querySelectorAll(".colorOption").forEach((option) => {
			option.classList.remove("selected");
			const checkIcon = option.querySelector(".checkIcon");
			if (checkIcon) checkIcon.style.display = "none";
		});

		// Reset size filters
		document.querySelectorAll(".sizeOption").forEach((option) => {
			option.classList.remove("active", "selected");
		});

		// Reset dress style filters
		document
			.querySelectorAll('.dressCode_Filter input[type="radio"]')
			.forEach((input) => {
				input.checked = false;
			});
	}
}

// Initialize the global filter system
const productFilters = new ProductFilters();

// Export functions for backward compatibility
export async function initializeProducts() {
	try {
		showLoadingState();
		await productFilters.applyFilters();
	} catch (error) {
		console.error("Error initializing products:", error);
		showErrorState(error);
		throw error;
	}
}

export async function loadPage(pageNumber) {
	return await productFilters.loadPage(pageNumber);
}

export async function nextPage() {
	return await productFilters.nextPage();
}

export async function previousPage() {
	return await productFilters.previousPage();
}

export function getPaginationState() {
	return {
		currentPage: productFilters.currentPage,
		totalPages: productFilters.totalPages,
		total: productFilters.total,
		hasNext: productFilters.currentPage < productFilters.totalPages,
		hasPrev: productFilters.currentPage > 1,
	};
}

// UI Helper Functions
function showLoadingState() {
	const productsContainer = document.getElementById("productsContainer");
	if (productsContainer) {
		productsContainer.innerHTML = `
            <div class="col-12">
                <div class="d-flex justify-content-center align-items-center py-5">
                    <div class="spinner-border text-primary me-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span>Loading products...</span>
                </div>
            </div>
        `;
	}
}

function showErrorState(error) {
	const productsContainer = document.getElementById("productsContainer");
	if (productsContainer) {
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

function renderProducts(products) {
	const productsContainer = document.getElementById("productsContainer");

	if (!products || products.length === 0) {
		productsContainer.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <h3>No products found</h3>
                    <p class="text-muted">Try adjusting your search or filters.</p>
                    <button class="btn btn-outline-primary" onclick="productFilters.clearFilters()">
                        Clear All Filters
                    </button>
                </div>
            </div>
        `;
		return;
	}

	productsContainer.innerHTML = "";

	products.forEach((product) => {
		const productCard = document.createElement("div");
		productCard.classList.add("col-12", "col-md-6", "col-lg-4");

		const avgRating = productFilters.getAverageRating(product.ratings);
		const totalRatings = productFilters.getTotalRatings(product.ratings);
		const productPrice = productFilters.getProductPrice(product);
		const originalPrice = product.variants?.[0]?.sizes?.[0]?.price || 0;

		productCard.innerHTML = `
            <div class="productCard">
                <div class="productImage">
                    <img src="${
											product.variants?.[0]?.image || "/assets/placeholder.jpg"
										}" 
                         alt="${product.name}" 
                         class="img-fluid" 
                         onerror="this.src='/assets/placeholder.jpg'">
                    <div class="productActions">
                        <button class="actionBtn wishlistBtn" title="Add to Wishlist">
                            <i class="far fa-heart"></i>
                        </button>
                        <button class="actionBtn quickViewBtn" title="Quick View" data-product-id="${
													product.id
												}">
                            <i class="far fa-eye"></i>
                        </button>
                    </div>
                    ${
											product.discount && product.discount > 0
												? `<div class="discountBadge">-${Math.round(
														product.discount * 100
												  )}%</div>`
												: ""
										}
                </div>
                <div class="productInfo">
                    <h3 class="productTitle">${product.name}</h3>
                    <div class="productRating">
                        ${generateStarRating(avgRating)}
                        <span class="ratingCount">(${totalRatings})</span>
                    </div>
                    <div class="productPrice">
                        ${
													product.discount && product.discount > 0
														? `<span class="currentPrice">$${productPrice.toFixed(
																2
														  )}</span>
                               <span class="originalPrice">$${originalPrice.toFixed(
																	2
																)}</span>`
														: `<span class="currentPrice">$${productPrice.toFixed(
																2
														  )}</span>`
												}
                    </div>
                    <button class="addToCartBtn" data-product-id="${
											product.id
										}">
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
	const { currentPage, totalPages, total, hasNext, hasPrev } = paginationData;

	// Update showing results text
	const showNumbers = document.querySelector(".showNumbers p");
	if (showNumbers) {
		const startItem = (currentPage - 1) * productFilters.pageSize + 1;
		const endItem = Math.min(currentPage * productFilters.pageSize, total);
		showNumbers.textContent = `Showing ${startItem}-${endItem} of ${total} results`;
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
			const productId = this.dataset.productId;
			window.location.href = `/src/pages/Product/productDetails.html?id=${productId}`;
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

	document.querySelectorAll(".quickViewBtn").forEach((btn) => {
		btn.addEventListener("click", function (e) {
			e.preventDefault();
			const productId = this.dataset.productId;
			window.location.href = `/src/pages/Product/productDetails.html?id=${productId}`;
		});
	});
}

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

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	initializePaginationEvents();
	initializeProducts();
});

// Make productFilters globally accessible for the clear filters button
window.productFilters = productFilters;
