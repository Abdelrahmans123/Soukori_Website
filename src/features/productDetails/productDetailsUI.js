import {
	doc,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";
import { auth } from "../../javascripts/Auth/firebase-config.js";
import {
	addCartToFirestore,
	addReview,
	getProductById,
	getReviewsByProduct,
} from "./firebase.js";
import { getUserById } from "../Admin/orders/firebase.js";
let currentVariant = 0;
let selectedSize = null;
let currentQuantity = 1;
let cart = [];
let productId = new URLSearchParams(window.location.search).get("id");
let productData = null;
let userId;

const cartBadge = document.querySelector(
	".badge.rounded-pill.bg-danger"
);

function updateCartBadge() {
	console.log('cartBadge: ',cartBadge);
	
	const carts = JSON.parse(localStorage.getItem("carts")) || [];
	if (carts.length > 0) {
		cartBadge.textContent = `${carts.length}`; // make sure it’s visible
	} else {
		cartBadge.textContent = "";
	}
}

export class ProductPage {
	constructor() {
		this.init();
	}

	async init() {
		await this.loadProduct();
		await this.loadReviews();
		setTimeout(() => {
			this.setupEventListeners();
			this.hideLoading();
		}, 1000);

		// Load cart from localStorage on init
		const storedCart = localStorage.getItem("carts");
		if (storedCart) {
			cart = JSON.parse(storedCart);
		}
	}

	async loadProduct(variantIndex = 0, sizePriceIndex = 0) {
		productData = await getProductById(productId);
		document.getElementById("product-name").textContent = productData.name;
		document.getElementById("breadcrumb-product").textContent =
			productData.name;
		if (productData.categoryId === "cat_womens_clothing") {
			document.getElementById("breadcrumb-category").textContent = "Women";
		} else if (productData.categoryId === "cat_mens_clothing") {
			document.getElementById("breadcrumb-category").textContent = "Men";
		}
		document.getElementById("product-description").textContent =
			productData.description;

		const discountedPrice = +(
			productData.variants[variantIndex].sizes[sizePriceIndex].price *
			(1 - productData.discount)
		);
		document.getElementById(
			"current-price"
		).textContent = `$${discountedPrice.toFixed(2)}`;
		if (productData.discount > 0) {
			document.getElementById(
				"original-price"
			).textContent = `$${productData.variants[variantIndex].sizes[
				sizePriceIndex
			].price.toFixed(2)}`;
			document.getElementById("discount-badge").textContent = `${Math.round(
				productData.discount * 100
			)}%`;
		}

		this.loadRatings();
		this.loadVariant(0);
		this.loadColorOptions();
	}

	loadRatings() {
		const ratings = productData.ratings;
		const totalRatings = Object.values(ratings).reduce(
			(sum, count) => sum + count,
			0
		);
		const weightedSum = Object.entries(ratings).reduce(
			(sum, [rating, count]) => sum + rating * count,
			0
		);
		const averageRating = weightedSum / totalRatings;

		const starsContainer = document.getElementById("stars-container");
		starsContainer.innerHTML = "";

		for (let i = 1; i <= 5; i++) {
			const star = document.createElement("i");
			star.className =
				i <= Math.round(averageRating)
					? "fa-solid fa-star rate_star"
					: "fa-regular fa-star rate_star inactive";
			starsContainer.appendChild(star);
		}

		document.getElementById(
			"rating-text"
		).textContent = `(${averageRating.toFixed(1)})`;
		document.getElementById("total-reviews").textContent = `(${totalRatings})`;
	}

	loadColorOptions() {
		const container = document.getElementById("color-options");
		container.innerHTML = "";

		productData.variants.forEach((variant, index) => {
			const colorOption = document.createElement("div");
			colorOption.className = `colorOption ${index === 0 ? "active" : ""
				} shadow`;
			colorOption.style.backgroundColor = variant.color;

			// If it's the first color, add a check icon right away
			if (index === 0) {
				const checkIcon = document.createElement("span");
				checkIcon.classList.add("checkIcon");
				checkIcon.innerHTML = "<i class='fa-solid fa-check'></i>";
				colorOption.appendChild(checkIcon);
			}

			colorOption.addEventListener("click", () => this.selectVariant(index));
			container.appendChild(colorOption);
		});

		this.changeColor();
	}

	selectVariant(index) {
		document.querySelectorAll(".colorOption").forEach((option, i) => {
			option.classList.toggle("active", i === index);
		});

		currentVariant = index;
		this.loadVariant(index);
		selectedSize = null;
		document.getElementById("stock-indicator").style.display = "none";
	}

	loadVariant(index) {
		const variant = productData.variants[index];
		document.getElementById("main-image").src = variant.image;
		this.loadSizes(variant.sizes);
	}
	changeColor = () => {
		const colorSelectors = document.querySelectorAll(
			"#color-options .colorOption"
		);

		colorSelectors.forEach((option) => {
			option.addEventListener("click", () => {
				// remove checkIcon from all
				colorSelectors.forEach((opt) => {
					const existingIcon = opt.querySelector(".checkIcon");
					if (existingIcon) existingIcon.remove();
					opt.classList.remove("active");
				});

				// add checkIcon to the clicked one
				option.classList.add("active");
				const checkIcon = document.createElement("span");
				checkIcon.classList.add("checkIcon");
				checkIcon.innerHTML = "<i class='fa-solid fa-check'></i>";
				option.appendChild(checkIcon);
			});
		});
	};

	loadSizes(sizes) {
		const container = document.getElementById("size-options");
		container.innerHTML = "";

		sizes.forEach((sizeInfo) => {
			const sizeOption = document.createElement("div");
			sizeOption.className = `sizeOption ${sizeInfo.quantity === 0 ? "out-of-stock" : ""
				}`;
			sizeOption.innerHTML = `<p>${sizeInfo.size}</p>`;
			sizeOption.dataset.size = sizeInfo.size;
			sizeOption.dataset.quantity = sizeInfo.quantity;

			if (sizeInfo.quantity >= 0) {
				sizeOption.addEventListener("click", () => this.selectSize(sizeOption));
			}

			container.appendChild(sizeOption);
		});
	}

	selectSize(sizeElement) {
		document.querySelectorAll(".sizeOption").forEach((option) => {
			option.classList.remove("active");
		});

		sizeElement.classList.add("active");

		const sizeIndex = Array.from(sizeElement.parentNode.children).indexOf(
			sizeElement
		);
		const variant = productData.variants[currentVariant];

		selectedSize = {
			size: sizeElement.dataset.size,
			quantity: parseInt(sizeElement.dataset.quantity),
			price: variant.sizes[sizeIndex].price,
		};

		this.updateStockIndicator();
		this.updatePriceDisplay();
	}

	updatePriceDisplay() {
		if (!selectedSize) return;

		const discountedPrice = selectedSize.price * (1 - productData.discount);
		document.getElementById(
			"current-price"
		).textContent = `$${discountedPrice.toFixed(2)}`;

		if (productData.discount > 0) {
			document.getElementById(
				"original-price"
			).textContent = `$${selectedSize.price.toFixed(2)}`;
			document.getElementById("discount-badge").textContent = `${Math.round(
				productData.discount * 100
			)}%`;
		}
	}

	updateStockIndicator() {
		const indicator = document.getElementById("stock-indicator");
		const stockText = document.getElementById("stock-text");

		if (!selectedSize) {
			indicator.style.display = "none";
			return;
		}

		indicator.style.display = "flex";

		if (selectedSize.quantity > 10) {
			indicator.className = "stock-indicator in-stock";
			stockText.textContent = "In Stock";
		} else if (selectedSize.quantity > 0) {
			indicator.className = "stock-indicator low-stock";
			stockText.textContent = `Only ${selectedSize.quantity} left in stock`;
		} else {
			indicator.className = "stock-indicator out-of-stock";
			stockText.textContent = "Out of Stock";
		}
	}

	setupEventListeners() {
		document
			.getElementById("decrease-qty")
			.addEventListener("click", this.decreaseQuantity.bind(this));
		document
			.getElementById("increase-qty")
			.addEventListener("click", this.increaseQuantity.bind(this));
		document
			.getElementById("add-to-cart")
			.addEventListener("click", this.addToCart.bind(this));
		document
			.getElementById("submitReview")
			.addEventListener("click", this.addReview.bind(this));
	}

	decreaseQuantity() {
		if (currentQuantity > 1) {
			currentQuantity--;
			document.getElementById("quantity-display").textContent = currentQuantity;
		}
	}

	increaseQuantity() {
		const maxQuantity = selectedSize ? Math.min(selectedSize.quantity, 10) : 10;
		if (currentQuantity < maxQuantity) {
			currentQuantity++;
			document.getElementById("quantity-display").textContent = currentQuantity;
		}
	}

	async addToCart() {
		if (!selectedSize) {
			this.showNotification("Please select a size", "error");
			return;
		}

		if (currentQuantity > selectedSize.quantity) {
			this.showNotification("Not enough stock available", "error");
			return;
		}

		const cartItem = {
			id: productData.id,
			name: productData.name,
			brand: productData.brand,
			price: +(selectedSize.price * (1 - productData.discount)),
			size: selectedSize.size,
			color: productData.variants[currentVariant].color,
			image: productData.variants[currentVariant].image,
			quantity: currentQuantity,
			timestamp: new Date(),
		};

		try {
			// Get current user directly
			const user = auth.currentUser;

			if (!user) {
				// Handle guest cart (local storage only)
				const index = cart.findIndex(item => item.id === cartItem.id && item.color === cartItem.color && item.size === cartItem.size);
				if (index > -1) {
					cart[index].quantity += cartItem.quantity || 0;
				} else {
					cart.push(cartItem)
				}
				localStorage.setItem("carts", JSON.stringify(cart));
				updateCartBadge();
				this.showNotification("Added to cart", "success");
				return;
			}

			console.log("Adding to cart for user:", user.uid);
			const cartId = localStorage.getItem('cartId');
			
			// Add to Firestore cart using the utility function
			await addCartToFirestore(cartItem, new Date(), cartId);

			// Update local cart copy
			const index = cart.findIndex(item => item.id === cartItem.id && item.color === cartItem.color && item.size === cartItem.size);
			if (index > -1) {
				cart[index].quantity += cartItem.quantity || 0;
			} else {
				cart.push(cartItem)
			}
			localStorage.setItem("carts", JSON.stringify(cart));
			updateCartBadge();
			
			this.showNotification("Cart updated successfully!", "success");

			// Update stock locally
			selectedSize.quantity -= currentQuantity;
			this.updateStockIndicator();

			// Update cart count in UI
			if (typeof updateCartCount === "function") {
				await updateCartCount();
			}
		} catch (error) {
			console.error("Error adding to cart:", error);
			this.showNotification("Failed to add to cart: " + error.message, "error");
		}
	}

	showNotification(message, type) {
		if (type === "success") {
			Swal.fire({
				position: "top-end",
				icon: "success",
				title: message,
				showConfirmButton: false,
				timer: 1500,
				toast: true,
				background: "#d4edda",
				color: "#155724",
				customClass: {
					popup: "colored-toast",
				},
			});
		} else if (type === "error") {
			Swal.fire({
				position: "top-end",
				icon: "error",
				title: message,
				showConfirmButton: false,
				timer: 1500,
				toast: true,
				background: "#f8d7da",
				color: "#721c24",
				customClass: {
					popup: "colored-toast",
				},
			});
		}
	}

	hideLoading() {
		document.getElementById("loading").style.display = "none";
		document.getElementById("product-content").style.display = "block";
	}

	async updateStock(productId, variantIndex, sizeSelected, newQuantity) {
		try {
			const productRef = doc(db, "products", productId);
			const productSnap = await getDoc(productRef);

			if (productSnap.exists()) {
				const productData = productSnap.data();
				const variants = productData.variants;

				// Find the size index within the variant
				const sizeIndex = variants[variantIndex].sizes.findIndex(
					(s) => s.size === sizeSelected
				);

				if (sizeIndex !== -1) {
					const updatePath = `variants.${variantIndex}.sizes.${sizeIndex}.quantity`;

					await updateDoc(productRef, {
						[updatePath]: newQuantity,
					});

					console.log("Stock updated successfully");
				}
			}
		} catch (error) {
			console.error("Error updating stock:", error);
		}
	}

	async loadReviews(isNextPage = false) {
		try {
			const pageSize = 5;
			const reviews = await getReviewsByProduct(productData.id, isNextPage);
			const reviewsContainer = document.getElementById("reviews-container");
			if (!isNextPage) reviewsContainer.innerHTML = "";
			if (reviews.length === 0 && !isNextPage) {
				const noReviewsMsg = document.createElement("p");
				noReviewsMsg.textContent = "No reviews yet.";
				reviewsContainer.appendChild(noReviewsMsg);
				return;
			}
			reviews.forEach((review) => {
				this.createReviewCard(review);
			});
			let loadMoreBtn = document.getElementById("load-more-btn");
			if (!loadMoreBtn) {
				loadMoreBtn = document.createElement("button");
				loadMoreBtn.id = "load-more-btn";
				loadMoreBtn.className = "btn loadBtn mx-auto";
				loadMoreBtn.textContent = "Load More Reviews";
				loadMoreBtn.addEventListener("click", () => this.loadReviews(true));
				reviewsContainer.appendChild(loadMoreBtn);
			}
			if (reviews.length < pageSize) {
				loadMoreBtn.style.display = "none";
			} else {
				loadMoreBtn.style.display = "block";
			}
		} catch (error) {
			console.error("Error loading reviews:", error);
		}
	}

	async createReviewCard(review) {
		const userName = await getUserById(review.userId)
			.then((user) => user.name)
			.catch(() => "User");
		const reviewsContainer = document.getElementById("reviews-container");
		const colDiv = document.createElement("div");
		colDiv.className = "col";
		colDiv.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <div class="topCard d-flex justify-content-between align-items-center">
                                <div class="stars">
                                    ${this.generateStars(review.rating)}
                                </div>
                                <div class="review_dots">
                                    <i class="fa-solid fa-ellipsis dots"></i>
                                </div>
                            </div>
                            <div class="cardTitle d-flex align-items-center">
                                <h5 class="card-title">${userName}</h5>
                                <i class="fa-solid fa-circle-check fs-5 ms-1 checkCircle"></i>
                            </div>
                            <p class="card-text">${review.comment}</p>
                            <p class="postDate">Posted on ${new Date(
			review.createdAt.seconds * 1000
		).toLocaleDateString()}</p>
                        </div>
                    </div>
                `;

		reviewsContainer.appendChild(colDiv);
	}

	generateStars(rating) {
		let starsHtml = "";
		for (let i = 1; i <= 5; i++) {
			if (i <= rating) {
				starsHtml += '<i class="fa-solid fa-star starIcon"></i>';
			} else {
				starsHtml += '<i class="fa-regular fa-star starIcon"></i>';
			}
		}
		return starsHtml;
	}

	async addReview() {
		const comment = document.getElementById("reviewText").value;
		const rating = parseInt(document.getElementById("rating").value);
		const title = document.getElementById("reviewTitle").value;
		const userId = localStorage.getItem("userId");

		if (!userId) {
			this.showNotification("Please log in to submit a review", "error");
			return;
		}
		if (!comment || !rating || !title) {
			this.showNotification("Please fill in all review fields", "error");
			return;
		}
		try {
			await addReview(productData.id, comment, rating, title, userId);
			this.showNotification("Review submitted successfully!", "success");
			this.loadReviews(); // Reload reviews to show the new one
			// Clear form
			document.getElementById("reviewForm").reset();
			// Close modal
			const reviewModal = document.getElementById("reviewModal");
			if (reviewModal) {
				const modalInstance = bootstrap.Modal.getInstance(reviewModal);
				if (modalInstance) {
					modalInstance.hide();
				}
			}
		} catch (error) {
			console.error("Error submitting review:", error);
			this.showNotification("Failed to submit review", "error");
		}
	}
}
