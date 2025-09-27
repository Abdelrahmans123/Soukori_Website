// Home/homepage.js
import {
	collection,
	query,
	orderBy,
	limit,
	getDocs,
	getCountFromServer,
	doc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";
import { auth } from "../Auth/firebase-config.js";

class HomepageManager {
	constructor() {
		this.productsCollection = collection(db, "products");
		this.usersCollection = collection(db, "users");
		this.categoriesContainer = document.querySelector(".categories-products");
		this.topProductsContainer = document.querySelector(".top-products");
		this.statsContainer = document.querySelector(".hero-stats .stats");
		this.isLoading = false;
	}

	// Initialize homepage data loading
	async init() {
		try {
			await this.loadHomePageData();
			this.setupEventListeners();
		} catch (error) {
			console.error("Error initializing homepage:", error);
			this.showError("Failed to load homepage data");
		}
	}

	// Load all homepage data
	async loadHomePageData() {
		this.showLoading(true);

		try {
			// Load data concurrently for better performance
			const [categories, topProducts, stats] = await Promise.all([
				this.fetchCategoryProducts(),
				this.fetchTopProducts(),
				this.fetchStats(),
			]);

			// Update UI with fetched data
			this.renderCategoryProducts(categories);
			this.renderTopProducts(topProducts);
			this.updateStats(stats);
		} catch (error) {
			console.error("Error loading homepage data:", error);
			this.showError("Failed to load products");
		} finally {
			this.showLoading(false);
		}
	}

	// Fetch products for categories section - without status filtering
	async fetchCategoryProducts() {
		try {
			const q = query(
				this.productsCollection,
				orderBy("createdAt", "desc"),
				limit(20) // Fetch more for later filtering
			);

			const querySnapshot = await getDocs(q);
			const allProducts = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			// Filter only available products (Client-side filtering)
			const availableProducts = allProducts.filter(
				(product) => product.status === "available" || !product.status
			);

			return availableProducts.slice(0, 4);
		} catch (error) {
			console.error("Error fetching category products:", error);
			return this.getFallbackProducts();
		}
	}

	// Fetch top products
	async fetchTopProducts() {
		try {
			const q = query(
				this.productsCollection,
				orderBy("createdAt", "desc"),
				limit(20)
			);

			const querySnapshot = await getDocs(q);
			const allProducts = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			// Filter available products
			const availableProducts = allProducts.filter(
				(product) => product.status === "available" || !product.status
			);

			// Take next set of products (from 4 to 8)
			return availableProducts.slice(4, 8).length > 0
				? availableProducts.slice(4, 8)
				: availableProducts.slice(0, 4);
		} catch (error) {
			console.error("Error fetching top products:", error);
			return this.getFallbackProducts();
		}
	}

	// Fetch statistics - simplified queries
	// In HomepageManager class
	async fetchStats() {
		try {
			// Check if user is signed in (using Firebase Auth)
			const user = auth.currentUser; // <-- هنا لازم تبقى auth مش authh

			let usersCount = 30000; // Fallback for anonymous users
			if (user) {
				const usersQuery = query(this.usersCollection);
				const usersSnapshot = await getCountFromServer(usersQuery);
				usersCount = usersSnapshot.data().count;
			}

			const productsQuery = query(this.productsCollection);
			const productsSnapshot = await getCountFromServer(productsQuery);

			return {
				brands: 200,
				products: productsSnapshot.data().count,
				customers: usersCount,
			};
		} catch (error) {
			console.error("Error fetching stats:", error);
			return {
				brands: 200,
				products: 2000, // fallback
				customers: 30000,
			};
		}
	}

	// Fallback products in case of data fetching failure
	getFallbackProducts() {
		return [
			{
				id: "fallback1",
				name: "Premium T-Shirt",
				brand: "SOUKORI",
				style: "Casual",
				discount: 0.2,
				variants: [
					{
						image: "assets/image/products/default.png",
						sizes: [{ price: 29.99 }],
					},
				],
				ratings: { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 },
			},
			{
				id: "fallback2",
				name: "Classic Jeans",
				brand: "SOUKORI",
				style: "Classic",
				discount: 0,
				variants: [
					{
						image: "assets/image/products/default.png",
						sizes: [{ price: 59.99 }],
					},
				],
				ratings: { 5: 8, 4: 7, 3: 2, 2: 0, 1: 0 },
			},
			{
				id: "fallback3",
				name: "Summer Dress",
				brand: "SOUKORI",
				style: "Elegant",
				discount: 0.15,
				variants: [
					{
						image: "assets/image/products/default.png",
						sizes: [{ price: 79.99 }],
					},
				],
				ratings: { 5: 12, 4: 3, 3: 1, 2: 0, 1: 0 },
			},
			{
				id: "fallback4",
				name: "Sport Jacket",
				brand: "SOUKORI",
				style: "Sport",
				discount: 0.1,
				variants: [
					{
						image: "assets/image/products/default.png",
						sizes: [{ price: 99.99 }],
					},
				],
				ratings: { 5: 15, 4: 5, 3: 2, 2: 0, 1: 1 },
			},
		];
	}

	// Render category products section
	renderCategoryProducts(products) {
		const container =
			document.querySelector(".categories-products .row") ||
			document.querySelector('[data-section="categories"] .row');

		if (!container) {
			console.warn("Categories container not found");
			return;
		}

		if (products.length === 0) {
			container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted">No products available at the moment.</p>
                    <button class="btn btn-outline-dark" onclick="location.reload()">Retry</button>
                </div>
            `;
			return;
		}

		container.innerHTML = products
			.map((product) => this.generateProductCard(product))
			.join("");
	}

	// Render top products section
	renderTopProducts(products) {
		const container =
			document.querySelector(".top-products .row") ||
			document.querySelector('[data-section="top-products"] .row');

		if (!container) {
			console.warn("Top products container not found");
			return;
		}

		if (products.length === 0) {
			container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted">No top products available.</p>
                    <button class="btn btn-outline-dark" onclick="location.reload()">Retry</button>
                </div>
            `;
			return;
		}

		container.innerHTML = products
			.map((product) => this.generateProductCard(product))
			.join("");
	}

	// Generate product card HTML
	generateProductCard(product) {
		const firstVariant = product.variants?.[0] || {};
		const firstSize = firstVariant.sizes?.[0] || {};
		const productImage =
			firstVariant.image || "assets/image/products/default.png";
		const productPrice = firstSize.price || 0;
		const discountedPrice = product.discount
			? (productPrice * (1 - product.discount)).toFixed(2)
			: productPrice.toFixed(2);
		const originalPrice = product.discount ? productPrice.toFixed(2) : null;

		// Calculate average rating
		const ratings = product.ratings || { 5: 10, 4: 2, 3: 1, 2: 0, 1: 0 };
		const totalRatings = Object.values(ratings).reduce(
			(sum, count) => sum + count,
			0
		);
		const averageRating =
			totalRatings > 0
				? (
						Object.entries(ratings).reduce(
							(sum, [rating, count]) => sum + parseInt(rating) * count,
							0
						) / totalRatings
				  ).toFixed(1)
				: 4.5;

		return `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card product-card h-100" data-product-id="${
									product.id
								}">
                    <div class="position-relative">
                        <img
                            src="${productImage}"
                            class="card-img-top product-img"
                            alt="${product.name}"
                            loading="lazy"
                            onerror="this.src='assets/image/products/default.png'"
                            style="height: 250px; object-fit: cover;"
                        />
                        ${
													product.discount > 0
														? `
                            <div class="position-absolute top-0 end-0 m-2">
                                <span class="badge bg-danger">-${Math.round(
																	product.discount * 100
																)}%</span>
                            </div>
                        `
														: ""
												}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="product-title mb-2" style="font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${
													product.name
												}</h5>
                        <div class="product-rating mb-2">
                            ${this.generateStarRating(averageRating)}
                            <span class="rating-score text-muted ms-1" style="font-size: 0.85rem;">${averageRating}/5</span>
                        </div>
                        <div class="product-price mb-2">
                            <span class="sale-price fw-bold" style="color: #000; font-size: 1.1rem;">$${discountedPrice}</span>
                            ${
															originalPrice
																? `<span class="original-price text-decoration-line-through text-muted ms-2" style="font-size: 0.9rem;">$${originalPrice}</span>`
																: ""
														}
                        </div>
                        <div class="product-meta mt-auto">
                            <small class="text-muted">Brand: ${
															product.brand || "SOUKORI"
														}</small><br>
                            <small class="text-muted">Style: ${
															product.style || "Classic"
														}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
	}

	// Generate star rating HTML
	generateStarRating(rating) {
		const fullStars = Math.floor(rating);
		const hasHalfStar = rating % 1 !== 0;
		let starsHtml = "";

		// Full stars
		for (let i = 0; i < fullStars; i++) {
			starsHtml += '<i class="fas fa-star text-warning"></i>';
		}

		// Half star
		if (hasHalfStar) {
			starsHtml += '<i class="fas fa-star-half-alt text-warning"></i>';
		}

		// Empty stars
		const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
		for (let i = 0; i < emptyStars; i++) {
			starsHtml += '<i class="far fa-star text-warning"></i>';
		}

		return starsHtml;
	}

	// Update statistics in hero section
	updateStats(stats) {
		// Update with data attributes
		const statsElements = {
			brands: document.querySelector(
				".hero-stats .stats .col-4:nth-child(1) .stat-number"
			),
			products: document.querySelector(
				".hero-stats .stats .col-4:nth-child(2) .stat-number"
			),
			customers: document.querySelector(
				".hero-stats .stats .col-4:nth-child(3) .stat-number"
			),
		};

		if (statsElements.brands) {
			statsElements.brands.textContent = `${stats.brands}+`;
		}
		if (statsElements.products) {
			statsElements.products.textContent = `${stats.products.toLocaleString()}+`;
		}
		if (statsElements.customers) {
			statsElements.customers.textContent = `${stats.customers.toLocaleString()}+`;
		}
	}

	// Setup event listeners
	setupEventListeners() {
		// Product card click events
		document.addEventListener("click", (e) => {
			const productCard = e.target.closest(".product-card");
			if (productCard) {
				const productId = productCard.dataset.productId;
				if (!productId.startsWith("fallback")) {
					this.navigateToProduct(productId);
				}
			}
		});

		// View All buttons
		document.querySelectorAll('.btn[href="#"]').forEach((btn) => {
			if (btn.textContent.includes("View All")) {
				btn.addEventListener("click", (e) => {
					e.preventDefault();
					this.navigateToShop();
				});
			}
		});

		// Shop Now button
		const shopNowBtn = document.querySelector(".show-btn");
		if (shopNowBtn) {
			shopNowBtn.addEventListener("click", () => {
				this.navigateToShop();
			});
		}
	}

	// Navigation methods
	navigateToProduct(productId) {
		window.location.href = `/src/pages/Product/productDetails.html?id=${productId}`;
	}

	navigateToShop() {
		window.location.href = "/src/pages/Product/product.html";
	}

	// Utility methods
	showLoading(show) {
		this.isLoading = show;
		const loader = document.querySelector(".homepage-loader");
		if (loader) {
			loader.classList.toggle("d-none", !show);
		}
	}

	showError(message) {
		console.error(message);
		if (window.toast) {
			window.toast.error(message);
		} else {
			console.warn("Toast notification system not available");
		}
	}
}

// Initialize homepage manager
const homepageManager = new HomepageManager();

// Export for use in other modules
export default homepageManager;

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	homepageManager.init();
});
