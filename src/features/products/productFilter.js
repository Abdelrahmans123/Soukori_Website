//productFilter.js
import {
	collection,
	query,
	where,
	orderBy,
	getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";
import RangeSlider from "../../javascripts/Products/RangeSlider.js";

export class ProductFilters {
	constructor() {
		this.pageSize = 6;
		this.tableName = "products";
		this.currentPage = 1;
		this.totalPages = 0;
		this.total = 0;

		// Store all products for client-side filtering
		this.allProducts = [];
		this.allFilteredProducts = [];

		this.desktopSlider = null;
		this.mobileSlider = null;
		this.pagination = null;

		// Active filters
		this.filters = {
			categories: [],
			priceRange: { min: 0, max: 500 },
			colors: [],
			sizes: [],
			brands: [],
			sortBy: "popular",
		};

		this.initializeFilters();
	}

	async initializeFilters() {
		await this.loadAllProductsFromFirebase();
		this.setupCategoryFilters();
		this.setupPriceRange();
		this.setupColorFilters();
		this.setupSizeFilters();
		this.setupSortOptions();
		this.setupApplyButton();
		this.setupBrandFilters();

		// Initialize with all products
		await this.applyFilters();
	}
	setupBrandFilters() {
		document.addEventListener("change", (e) => {
			if (e.target.name === "brandRadio" && e.target.checked) {
				this.filters.brands = [e.target.value];
				this.updateFilterUI();

				// Sync mobile filter
				const mobileInput = document.querySelector(
					`input[name="brandRadioMobile"][value="${e.target.value}"]`
				);
				if (mobileInput) mobileInput.checked = true;
			}

			if (e.target.name === "brandRadioMobile" && e.target.checked) {
				this.filters.brands = [e.target.value];
				// Sync desktop filter
				const desktopInput = document.querySelector(
					`input[name="brandRadio"][value="${e.target.value}"]`
				);
				if (desktopInput) desktopInput.checked = true;
			}
		});
	}
	getPaginationState() {
		return {
			currentPage: this.currentPage,
			totalPages: this.totalPages,
			total: this.total,
			hasNext: this.currentPage < this.totalPages,
			hasPrev: this.currentPage > 1,
			pageSize: this.pageSize,
		};
	}
	async loadAllProductsFromFirebase() {
		try {
			console.log("Loading all products from Firebase...");
			const q = query(
				collection(db, this.tableName),
				where("status", "==", "available")
			);

			const querySnapshot = await getDocs(q);
			this.allProducts = [];
			const categories = new Set();
			const brands = new Set();
			querySnapshot.forEach((doc) => {
				const product = { id: doc.id, ...doc.data() };
				this.allProducts.push(product);
				if (product.category) {
					categories.add(product.category);
				}
				if (product.brand) {
					brands.add(product.brand);
				}
			});
			console.log(
				"🚀 ~ ProductFilters ~ loadAllProductsFromFirebase ~ brands:",
				brands
			);

			console.log(`Loaded ${this.allProducts.length} products`);

			// Render category and size filters
			this.renderCategoryFilters(Array.from(categories).sort());
			this.renderBrandFilters(Array.from(brands).sort());
			this.renderSizeFilters();
		} catch (error) {
			console.error("Error loading products:", error);
			// Fallback categories
			this.renderCategoryFilters([
				"T-Shirt",
				"Shorts",
				"Shirts",
				"Hoodie",
				"Jeans",
			]);
			this.renderSizeFilters();
			this.renderBrandFilters(["Zara", "H&M", "Nike", "Adidas"]);
		}
	}

	setupCategoryFilters() {
		// Desktop category filters
		document.addEventListener("change", (e) => {
			if (e.target.name === "categoryRadio" && e.target.checked) {
				this.filters.categories = [e.target.value];
				this.updateFilterUI();

				// Sync mobile filter
				const mobileInput = document.querySelector(
					`input[name="categoryRadioMobile"][value="${e.target.value}"]`
				);
				if (mobileInput) mobileInput.checked = true;
			}

			if (e.target.name === "categoryRadioMobile" && e.target.checked) {
				this.filters.categories = [e.target.value];
				// Sync desktop filter
				const desktopInput = document.querySelector(
					`input[name="categoryRadio"][value="${e.target.value}"]`
				);
				if (desktopInput) desktopInput.checked = true;
			}
		});
	}
	setupBrandFilters() {
		document.addEventListener("change", (e) => {
			if (e.target.name === "brandRadio" && e.target.checked) {
				this.filters.brands = [e.target.value];
				this.updateFilterUI();

				// Sync mobile filter
				const mobileInput = document.querySelector(
					`input[name="brandRadioMobile"][value="${e.target.value}"]`
				);
				if (mobileInput) mobileInput.checked = true;
			}

			if (e.target.name === "brandRadioMobile" && e.target.checked) {
				this.filters.brands = [e.target.value];
				// Sync desktop filter
				const desktopInput = document.querySelector(
					`input[name="brandRadio"][value="${e.target.value}"]`
				);
				if (desktopInput) desktopInput.checked = true;
			}
		});
	}
	setupPriceRange() {
		const initializeSliders = () => {
			this.desktopSlider = new RangeSlider(
				".range-container",
				"range-min",
				"range-max",
				"slider-range",
				"min-label",
				"max-label",
				{
					minGap: 10,
					currency: "$",
					onUpdate: (values) => {
						this.filters.priceRange = values;
						// Don't auto-apply here, let user click Apply button
						this.updateFilterUI();
					},
				}
			);

			const mobileContainer = document.getElementById("slider-range-mobile");
			if (mobileContainer) {
				this.mobileSlider = new RangeSlider(
					".range-container",
					"range-min-mobile",
					"range-max-mobile",
					"slider-range-mobile",
					"min-label-mobile",
					"max-label-mobile",
					{
						minGap: 10,
						currency: "$",
						onUpdate: (values) => {
							this.filters.priceRange = values;
							// Don't auto-apply here, let user click Apply button
						},
					}
				);
			}
		};

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", initializeSliders);
		} else {
			setTimeout(initializeSliders, 100);
		}
	}
	renderBrandFilters(brands) {
		console.log("🚀 ~ ProductFilters ~ renderBrandFilters ~ brands:", brands);
		// Create brand filter section HTML
		const brandFilterHTML = `
			<div class="brand_Filter">
				<div class="topContent d-flex justify-content-between align-items-center px-3 my-3">
					<h3>Brands</h3>
					<i class="fa-solid fa-chevron-up arrowUpIcon"></i>
					<i class="fa-solid fa-chevron-down d-none arrowDownIcon"></i>
				</div>
				<div class="filters_content px-3 brand-filters-content">
					${brands
						.map(
							(brand, index) => `
						<div class="category_filter d-flex justify-content-between align-items-center mt-2">
							<div class="category_contenet">
								<p class="mb-0">${brand}</p>
							</div>
							<div class="form-check">
								<input
									class="form-check-input"
									type="radio"
									name="brandRadio"
									id="brandDesktop${index}"
									value="${brand}"
								/>
							</div>
						</div>
					`
						)
						.join("")}
				</div>
			</div>
		`;

		// Insert brand filter after dress code filter in desktop
		const desktopContainer = document.querySelector(
			".col.filter_container .brands_Filter"
		);
		if (desktopContainer) {
			desktopContainer.innerHTML = brandFilterHTML;
		}
	}

	renderCategoryFilters(categories) {
		const desktopContainer = document.querySelector(
			".col.filter_container .filters_content"
		);
		const mobileContainer = document.querySelector(
			".offcanvas-body .filters_content"
		);

		const categoryHTML = categories
			.map(
				(category, index) => `
			<div class="category_filter d-flex justify-content-between align-items-center mt-2">
				<div class="category_contenet">
					<p class="mb-0">${category}</p>
				</div>
				<div class="form-check">
					<input
						class="form-check-input"
						type="radio"
						name="categoryRadio"
						id="categoryDesktop${index}"
						value="${category}"
					/>
				</div>
			</div>
		`
			)
			.join("");

		const mobileHTML = categories
			.map(
				(category, index) => `
			<div class="category_filter d-flex justify-content-between align-items-center mt-2">
				<div class="category_contenet">
					<p class="mb-0">${category}</p>
				</div>
				<div class="form-check">
					<input
						class="form-check-input"
						type="radio"
						name="categoryRadioMobile"
						id="categoryMobile${index}"
						value="${category}"
					/>
				</div>
			</div>
		`
			)
			.join("");

		if (desktopContainer) {
			desktopContainer.innerHTML = categoryHTML;
		}
		if (mobileContainer) {
			mobileContainer.innerHTML = mobileHTML;
		}
	}

	renderSizeFilters() {
		const sizes = ["XS", "S", "M", "L", "XL", "2XL"];

		const desktopContainer = document.querySelector(
			".col.filter_container .size_content .sizeOptions"
		);
		const mobileContainer = document.querySelector(
			".offcanvas-body .size_content .d-flex"
		);

		const sizeHTML = sizes
			.map(
				(size) => `
			<div class="sizeOption d-flex justify-content-center align-items-center" data-size="${size}">
				<p class="mb-0">${size}</p>
			</div>
		`
			)
			.join("");

		if (desktopContainer) {
			desktopContainer.innerHTML = sizeHTML;
		}
		if (mobileContainer) {
			mobileContainer.innerHTML = sizeHTML;
		}
	}

	setupColorFilters() {
		console.log("setupColorFilters called");
		const colorOptions = document.querySelectorAll(
			".desktopColorOptions .colorOption"
		);
		console.log("Found color options:", colorOptions.length);

		const colorMap = {
			green: "#00FF00",
			red: "#FF0000",
			yellow: "#FFFF00",
			orange: "#FFA500",
			aqua: "#00FFFF",
			blue: "#0000FF",
			purple: "#800080",
			puple: "#800080", // Fix typo in HTML
			pink: "#FFC0CB",
			white: "#FFFFFF",
			black: "#000000",
		};

		colorOptions.forEach((option) => {
			const colorName = option.dataset.color;
			const colorCode = colorMap[colorName] || "#CCCCCC";

			console.log(`Setting up color: ${colorName} -> ${colorCode}`);

			// Style the color option
			option.style.backgroundColor = colorCode;
			option.style.border = `2px solid ${colorCode}`;
			option.style.position = "relative";
			option.style.cursor = "pointer";
			option.style.width = "30px";
			option.style.height = "30px";
			option.style.borderRadius = "50%";
			option.style.margin = "5px";
			option.style.display = "inline-block";
			option.style.boxSizing = "border-box";
			option.style.transition = "transform 0.2s, border 0.2s";
			option.title = colorName.charAt(0).toUpperCase() + colorName.slice(1);

			// Hover effects
			option.addEventListener("mouseenter", () => {
				option.style.transform = "scale(1.1)";
			});

			option.addEventListener("mouseleave", () => {
				option.style.transform = "scale(1)";
			});

			// Click handler with debugging
			option.addEventListener("click", () => {
				console.log(`Color clicked: ${colorName} (${colorCode})`);

				const isSelected = option.classList.contains("active");
				console.log(
					"🚀 ~ ProductFilters ~ setupColorFilters ~ isSelected:",
					isSelected
				);

				if (!isSelected) {
					// Remove selection
					option.classList.remove("active");
					option.style.border = `2px solid ${colorCode}`;
					option.style.boxShadow = "none";

					// Remove color from filter array
					this.filters.colors = this.filters.colors.filter(
						(color) => color !== colorCode
					);
					console.log("Color removed. Current colors:", this.filters.colors);
				} else {
					// Add selection
					option.classList.add("active");
					option.style.border = `3px solid #000`;
					option.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${colorCode}`;

					// Add color to filter array
					if (!this.filters.colors.includes(colorCode)) {
						this.filters.colors.push(colorCode);
					}
					console.log("Color added. Current colors:", this.filters.colors);
				}

				// Update filter UI to show changes
				this.updateFilterUI();
			});
		});

		// Also log what colors exist in your products for comparison
		console.log("Colors in products:");
		const productColors = new Set();
		this.allProducts.forEach((product) => {
			product.variants?.forEach((variant) => {
				productColors.add(variant.color);
			});
		});
		console.log("Unique product colors:", Array.from(productColors));
	}
	setupSizeFilters() {
		const sizeOptions = document.querySelectorAll(".sizeOption");
		console.log("🚀 ~ setupSizeFilters ~ sizeOptions:", sizeOptions);
		sizeOptions.forEach((option) => {
			option.addEventListener("click", () => {
				const sizeText = option.textContent.trim();
				if (option.classList.contains("active")) {
					option.classList.remove("active");
					this.filters.sizes = this.filters.sizes.filter((s) => s !== sizeText);
					console.log(
						"🚀 ~ ProductFilters ~ setupSizeFilters ~ sizeOption:",
						option
					);
				} else {
					option.classList.add("active");
					if (!this.filters.sizes.includes(sizeText)) {
						this.filters.sizes.push(sizeText);
					}
				}
				this.updateFilterUI();
				console.log("Toggled:", sizeText, "Current sizes:", this.filters.sizes);
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
					if (sortSelection.querySelector("p")) {
						sortSelection.querySelector("p").textContent = sortText;
					}
					sortDropdown.classList.add("d-none");
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

				// Reset button text after applying
				button.textContent = "Apply Filters";
				button.classList.remove("filters-changed");

				// Close mobile offcanvas if open
				const offcanvas = document.getElementById("filtersOffcanvas");
				if (offcanvas && typeof bootstrap !== "undefined") {
					const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
					if (bsOffcanvas) {
						bsOffcanvas.hide();
					}
				}
			});
		});
	}
	updateFilterUI() {
		// You can add visual indicators here to show that filters have changed
		// For example, highlight the Apply button or show a count of active filters

		const applyButtons = document.querySelectorAll(".applyFilterBtn button");
		const applyContainer = document.querySelector(".applyFilterBtn");
		const activeFiltersCount = this.getActiveFiltersCount();
		console.log(
			"🚀 ~ ProductFilters ~ updateFilterUI ~ activeFiltersCount:",
			activeFiltersCount
		);

		applyButtons.forEach((button) => {
			if (activeFiltersCount > 0) {
				applyContainer.classList.add("filters-changed"); // Add CSS class for visual feedback
				button.textContent = `Apply Filters (${activeFiltersCount})`;
			} else {
				button.classList.remove("filters-changed");
				button.textContent = "Apply Filters";
			}
		});
	}
	getActiveFiltersCount() {
		let count = 0;

		if (this.filters.categories.length > 0) count++;
		if (this.filters.colors.length > 0) count++;
		if (this.filters.sizes.length > 0) count++;
		if (this.filters.brands.length > 0) count++;
		if (this.filters.priceRange.min > 0 || this.filters.priceRange.max < 500)
			count++;
		if (this.filters.sortBy !== "popular") count++;

		return count;
	}
	filterProductsClientSide(products) {
		console.log(
			`Filtering ${products.length} products with filters:`,
			this.filters
		);

		const filtered = products.filter((product) => {
			console.log(`\n--- Checking product: ${product.name} ---`);

			// Category filter
			if (this.filters.categories.length > 0) {
				console.log(
					`Category check: ${product.category} in [${this.filters.categories}]`
				);
				if (!this.filters.categories.includes(product.category)) {
					console.log("❌ Category filter failed");
					return false;
				}
				console.log("✅ Category filter passed");
			}

			// Price filter
			if (
				this.filters.priceRange.min > 0 ||
				this.filters.priceRange.max < 500
			) {
				const filterPrice = this.getFilterPrice(product);
				console.log(
					`Price check: $${filterPrice} between $${this.filters.priceRange.min}-$${this.filters.priceRange.max}`
				);
				if (
					filterPrice < this.filters.priceRange.min ||
					filterPrice > this.filters.priceRange.max
				) {
					console.log("❌ Price filter failed");
					return false;
				}
				console.log("✅ Price filter passed");
			}

			// Color filter - WITH DETAILED DEBUGGING
			if (this.filters.colors.length > 0) {
				const productColors = product.variants?.map((v) => v.color) || [];
				console.log(`Color check: Product colors: [${productColors}]`);
				console.log(`Filter colors: [${this.filters.colors}]`);

				const colorMatch = this.filters.colors.some((color) => {
					const matches = productColors.includes(color);
					console.log(`  Does product have ${color}? ${matches}`);
					return matches;
				});

				if (!colorMatch) {
					console.log("❌ Color filter failed - no matching colors");
					return false;
				}
				console.log("✅ Color filter passed");
			}

			// Size filter
			if (this.filters.sizes.length > 0) {
				const productSizes = [];
				product.variants?.forEach((variant) => {
					variant.sizes?.forEach((size) => {
						productSizes.push(size.size);
					});
				});
				console.log(
					`Size check: Product sizes: [${productSizes}], Filter sizes: [${this.filters.sizes}]`
				);
				if (!this.filters.sizes.some((size) => productSizes.includes(size))) {
					console.log("❌ Size filter failed");
					return false;
				}
				console.log("✅ Size filter passed");
			}

			// Dress style filter
			if (this.filters.brands.length > 0) {
				console.log(
					`Brand check: ${product.brand} in [${this.filters.brands}]`
				);
				if (!this.filters.brands.includes(product.brand)) {
					console.log("❌ Brand filter failed");
					return false;
				}
				console.log("✅ Brand filter passed");
			}

			console.log("✅ Product passed all filters");
			return true;
		});

		console.log(`Filtered result: ${filtered.length} products`);
		return filtered;
	}

	sortProducts(products) {
		const sortedProducts = [...products]; // Create a copy to avoid mutation

		switch (this.filters.sortBy) {
			case "rating":
				return sortedProducts.sort((a, b) => {
					const aRating = this.getAverageRating(a.ratings);
					const bRating = this.getAverageRating(b.ratings);
					return bRating - aRating;
				});

			case "newest":
				return sortedProducts.sort((a, b) => {
					return new Date(b.createdAt) - new Date(a.createdAt);
				});

			case "price_asc":
				return sortedProducts.sort((a, b) => {
					return this.getProductPrice(a) - this.getProductPrice(b);
				});

			case "price_desc":
				return sortedProducts.sort((a, b) => {
					return this.getProductPrice(b) - this.getProductPrice(a);
				});

			case "popular":
			default:
				return sortedProducts.sort((a, b) => {
					const aTotalRatings = this.getTotalRatings(a.ratings);
					const bTotalRatings = this.getTotalRatings(b.ratings);
					return bTotalRatings - aTotalRatings;
				});
		}
	}

	async applyFilters() {
		try {
			console.log("Applying filters...");
			showLoadingState();

			// Apply client-side filtering to all products
			let filteredProducts = this.filterProductsClientSide([
				...this.allProducts,
			]);

			// Sort the filtered products
			filteredProducts = this.sortProducts(filteredProducts);

			// Store all filtered products
			this.allFilteredProducts = filteredProducts;

			// Update pagination totals
			this.total = filteredProducts.length;
			this.totalPages = Math.ceil(this.total / this.pageSize);
			this.currentPage = 1; // Reset to first page when filters change

			console.log(
				`Total filtered products: ${this.total}, Pages: ${this.totalPages}`
			);

			// Check if we have any products
			if (this.total === 0) {
				// Show no products message immediately
				renderProducts([]);
				this.updateProductCount();
				this.updatePaginationUI();
			} else {
				// Show first page
				await this.loadPage(1);
			}

			// Update pagination UI after applying filters
			this.updatePaginationUI();
		} catch (error) {
			console.error("Error applying filters:", error);
			showErrorState(error);
		}
	}

	initializePagination() {
		// We don't need the Pagination class for Firebase queries since we're doing client-side pagination
		// Just reset the current page to 1
		this.currentPage = 1;
	}

	async loadPage(pageNumber) {
		if (pageNumber < 1 || pageNumber > this.totalPages) {
			console.log(`Invalid page number: ${pageNumber}`);
			return false;
		}

		console.log(`Loading page ${pageNumber} of ${this.totalPages}`);

		this.currentPage = pageNumber;

		// Calculate slice indices for the current page
		const startIndex = (pageNumber - 1) * this.pageSize;
		const endIndex = Math.min(
			startIndex + this.pageSize,
			this.allFilteredProducts.length
		);

		// Get products for this page
		const pageProducts = this.allFilteredProducts.slice(startIndex, endIndex);

		console.log(`Page ${pageNumber}: showing ${pageProducts.length} products`);

		// Render products
		renderProducts(pageProducts);
		this.updateProductCount();
		this.updatePaginationUI();

		return true;
	}
	generatePageNumbers(currentPage, totalPages) {
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
	updatePaginationUI() {
		const { currentPage, totalPages, hasNext, hasPrev } =
			this.getPaginationState();

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
			pagesList.innerHTML = this.generatePageNumbers(currentPage, totalPages);
		}
	}

	async nextPage() {
		if (this.currentPage < this.totalPages) {
			const result = await this.loadPage(this.currentPage + 1);
			return result;
		}
		console.log("Already at last page");
		return false;
	}

	async previousPage() {
		if (this.currentPage > 1) {
			const result = await this.loadPage(this.currentPage - 1);
			return result;
		}
		console.log("Already at first page");
		return false;
	}

	updateProductCount() {
		const showNumbers = document.querySelector(".showNumbers p");
		if (showNumbers) {
			if (this.total === 0) {
				showNumbers.textContent = `Showing 0 of 0 products`;
			} else {
				const start = Math.min(
					(this.currentPage - 1) * this.pageSize + 1,
					this.total
				);
				const end = Math.min(this.currentPage * this.pageSize, this.total);
				showNumbers.textContent = `Showing ${start}-${end} of ${this.total} products`;
			}
		}
	}

	// Helper methods
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
		let discount = product.discount || 0;

		if (discount > 1) {
			discount = discount / 100;
		}

		const finalPrice = basePrice * (1 - discount);
		return Math.round(finalPrice * 100) / 100;
	}

	getFilterPrice(product) {
		const basePrice = product.variants[0]?.sizes[0]?.price || 0;
		const discount = product.discount || 0;

		if (discount > 0) {
			let discountDecimal = discount > 1 ? discount / 100 : discount;
			return Math.round(basePrice * (1 - discountDecimal) * 100) / 100;
		}

		return basePrice;
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

	clearFilters() {
		console.log("Clearing all filters...");

		// Reset filters to default state
		this.filters = {
			categories: [],
			priceRange: { min: 0, max: 500 },
			colors: [],
			sizes: [],
			dressStyles: [],
			brands: [],
			sortBy: "popular",
		};

		// Reset the UI
		this.resetFilterUI();

		// Apply filters (which will now show all products since filters are cleared)
		this.applyFilters();
		this.updateFilterUI();
		this.loadPage(1);
	}

	resetFilterUI() {
		// Reset category filters
		document
			.querySelectorAll(
				'input[name="categoryRadio"], input[name="categoryRadioMobile"]'
			)
			.forEach((input) => {
				input.checked = false;
			});
		// Reset brand filters
		document
			.querySelectorAll(
				'input[name="brandRadio"], input[name="brandRadioMobile"]'
			)
			.forEach((input) => {
				input.checked = false;
			});
		//reset button
		const applyButtons = document.querySelectorAll(".applyFilterBtn button");
		const applyContainer = document.querySelector(".applyFilterBtn");
		applyButtons.forEach((button) => {
			button.textContent = "Apply Filters";
			applyContainer.classList.remove("filters-changed");
		});
		// Reset price range sliders
		if (this.desktopSlider) {
			this.desktopSlider.reset();
		}
		if (this.mobileSlider) {
			this.mobileSlider.reset();
		}

		// Reset color filters
		document.querySelectorAll(".colorOption").forEach((option) => {
			option.classList.remove("selected");
			option.classList.remove("active");
			option.style.border = `none`;
			option.style.boxShadow = "none";
			const checkIcon = option.querySelector(".checkIcon");
			if (checkIcon) checkIcon.style.display = "none";
		});

		// Reset size filters
		document.querySelectorAll(".sizeOption").forEach((option) => {
			option.classList.remove("active", "selected");
		});

		// Reset sort dropdown
		const sortSelection = document.querySelector(".sortSelection");
		if (sortSelection?.querySelector("p")) {
			sortSelection.querySelector("p").textContent = "Most Popular";
		}
	}

	destroy() {
		if (this.desktopSlider) {
			this.desktopSlider.destroy();
		}
		if (this.mobileSlider) {
			this.mobileSlider.destroy();
		}
		if (this.pagination) {
			this.pagination.reset();
		}
	}
}

// Initialize the filter system
const productFilters = new ProductFilters();

// Export functions for external use
export async function initializeProducts() {
	try {
		showLoadingState();
		// The ProductFilters constructor already handles initialization
		console.log("Products initialized successfully");
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
		pageSize: productFilters.pageSize,
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
                    <h3 class="text-muted">No products found</h3>
                    <p class="text-muted">Try adjusting your search or filters to find what you're looking for.</p>
                    <button class="btn btn-outline-primary mt-3" onclick="window.productFilters.clearFilters()">
                        <i class="fas fa-times me-2"></i>Clear All Filters
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

		const avgRating = window.productFilters.getAverageRating(product.ratings);
		const totalRatings = window.productFilters.getTotalRatings(product.ratings);

		// Use consistent price calculation
		const basePrice = product.variants?.[0]?.sizes?.[0]?.price || 0;
		const discount = product.discount || 0;
		const hasDiscount = discount > 0;

		let finalPrice = basePrice;
		if (hasDiscount) {
			const discountDecimal = discount > 1 ? discount / 100 : discount;
			finalPrice = basePrice * (1 - discountDecimal);
		}
		finalPrice = Math.round(finalPrice * 100) / 100;

		productCard.innerHTML = `
            <div class="productCard">
                <div class="productImage">
                    <img src="${product.variants?.[0]?.image}" 
                         alt="${product.name}" 
                         class="img-fluid"
                         >
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
											hasDiscount
												? `<div class="discountBadge">-${
														discount > 1 ? discount : Math.round(discount * 100)
												  }%</div>`
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
													hasDiscount
														? `<span class="currentPrice">$${finalPrice.toFixed(
																2
														  )}</span>
                               <span class="originalPrice">$${basePrice.toFixed(
																	2
																)}</span>`
														: `<span class="currentPrice">$${finalPrice.toFixed(
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

	addProductEventListeners();
}
function addProductEventListeners() {
	document.querySelectorAll(".addToCartBtn").forEach((btn) => {
		btn.addEventListener("click", function (e) {
			e.preventDefault();
			const productId = this.dataset.productId;
			window.location.href = `./productDetails.html?id=${productId}`;
		});
	});
	document.querySelectorAll(".quickViewBtn").forEach((btn) => {
		btn.addEventListener("click", function (e) {
			e.preventDefault();
			const productId = this.dataset.productId;
			window.location.href = `./productDetails.html?id=${productId}`;
		});
	});
}

// Make productFilters globally accessible
window.productFilters = productFilters;
