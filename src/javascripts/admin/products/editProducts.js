// Import Firebase and other dependencies
import {
	collection,
	getDoc,
	setDoc,
	doc,
	serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../../config/firebase.js";
import { uploadToCloudinary } from "./uploadFile.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
	showSuccessMessage,
	showErrorMessage,
} from "../../../features/general/utils.js";
const auth = getAuth();
class UpdateProduct {
	constructor(productId) {
		this.productsCollection = collection(db, "products");
		this.selectedImages = [];
		this.productId = productId;
		this.initializeEventListeners();
		this.loadProductData();
	}

	initializeEventListeners() {
		document
			.getElementById("updateProductForm")
			.addEventListener("submit", this.handleSubmit.bind(this));
		document
			.getElementById("addVariantBtn")
			.addEventListener("click", () => this.addVariantRow());
		document
			.getElementById("galleryInput")
			.addEventListener("change", (e) => this.handleGalleryUpload(e));
		document
			.getElementById("price")
			.addEventListener("input", () => this.autoFillVariantPrices());
	}

	async loadProductData() {
		try {
			const productRef = doc(db, "products", this.productId);
			const productSnap = await getDoc(productRef);
			if (productSnap.exists()) {
				const data = productSnap.data();
				this.prefillForm(data);
			} else {
				await showErrorMessage("Product not found");
				window.location.href = "all.html";
				return;
			}
		} catch (error) {
			console.error("Error loading product:", error);
			await showErrorMessage("Error loading product data");
			window.location.href = "all.html";
		}
	}

	prefillForm(data) {
		// Fill basic form fields
		document.getElementById("productName").value = data.name || "";
		document.getElementById("description").value = data.description || "";
		document.getElementById("brand").value = data.brand || "";
		document.getElementById("categoryId").value = data.categoryId || "";
		document.getElementById("price").value = data.variants?.[0]?.price || "";
		document.getElementById("discount").value = data.discount || 0;
		document.getElementById("status").value = data.status || "available";
		document.getElementById("style").value = data.style || "";

		// Clear variants container
		const container = document.getElementById("variantsContainer");
		container.innerHTML = "";

		// Prefill variants
		if (data.variants && Array.isArray(data.variants)) {
			data.variants.forEach((variant, index) => {
				this.addVariantRow();
				const card = container.children[index];

				// Set color values
				card.querySelector(".variant-color-picker").value =
					variant.color || "#000000";
				card.querySelector(".variant-color-hex").value =
					variant.color || "#000000";
				card.querySelector(".variant-price").value = variant.price || "";

				// Display existing image
				const preview = card.querySelector(".variant-image-preview");
				if (variant.image) {
					preview.innerHTML = `
                        <img src="${variant.image}" alt="Current Image" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
                        <div class="position-absolute top-0 end-0 m-2">
                            <span class="badge bg-success"><i class="fas fa-check"></i> Current</span>
                        </div>
                    `;
					preview.style.position = "relative";
					preview.insertAdjacentHTML(
						"afterend",
						'<small class="text-muted">Upload new image to replace current one</small>'
					);

					// Store current image URL for later use
					preview.dataset.currentImage = variant.image;
				}

				// Clear and fill sizes
				const sizesContainer = card.querySelector(".variant-sizes-container");
				sizesContainer.innerHTML = "";

				if (variant.sizes && Array.isArray(variant.sizes)) {
					variant.sizes.forEach((size) => {
						this.addSizeRow(card);
						const lastRow = sizesContainer.lastElementChild;
						lastRow.querySelector(".size-select").value = size.size || "";
						lastRow.querySelector(".quantity-input").value = size.quantity || 0;
					});
				} else {
					this.addSizeRow(card);
				}
			});
		} else {
			this.addVariantRow();
		}

		// Handle additional images if they exist
		if (data.additionalImages && Array.isArray(data.additionalImages)) {
			this.displayExistingAdditionalImages(data.additionalImages);
		}
	}

	displayExistingAdditionalImages(images) {
		const container = document.getElementById("imagePreviewContainer");
		images.forEach((imageUrl, index) => {
			const previewDiv = document.createElement("div");
			previewDiv.className =
				"d-flex align-items-center bg-white rounded p-2 mb-2 shadow-sm border";
			previewDiv.innerHTML = `
                <img src="${imageUrl}" style="width:50px;height:50px;border-radius:8px;margin-right:12px;object-fit:cover;">
                <div class="flex-grow-1">
                    <div class="small fw-bold">Current Image ${index + 1}</div>
                    <div class="small text-muted">Existing image</div>
                </div>
                <span class="badge bg-success me-2">Current</span>
            `;
			container.appendChild(previewDiv);
		});
	}

	autoFillVariantPrices() {
		const basePrice = document.getElementById("price").value;
		if (basePrice) {
			document
				.querySelectorAll(".variant-price")
				.forEach((input) => !input.value && (input.value = basePrice));
		}
	}

	addVariantRow() {
		const container = document.getElementById("variantsContainer");
		const variantIndex = container.children.length;
		const basePrice = document.getElementById("price").value || "";

		const variantCard = document.createElement("div");
		variantCard.className = "card p-3 mb-3 variant-card";
		variantCard.dataset.variantIndex = variantIndex;

		variantCard.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6>Variant ${variantIndex + 1}</h6>
        <button type="button" class="btn btn-outline-danger btn-sm remove-variant" style="display: none;">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
      <div class="row">
        <div class="col-md-6 mb-3">
          <label class="form-label">Color (Hex Code)</label>
          <div class="input-group">
            <input type="color" class="form-control form-control-color variant-color-picker" value="#000000">
            <input type="text" class="form-control variant-color-hex" placeholder="#000000" value="#000000">
          </div>
        </div>
        <div class="col-md-6 mb-3">
          <label class="form-label">Variant Price *</label>
          <input type="number" step="0.01" class="form-control variant-price" placeholder="0.00" min="0" required value="${basePrice}">
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Variant Image</label>
        <input type="file" class="form-control variant-image-input" accept="image/*">
        <div class="variant-image-preview mt-2" style="height:180px; background:#f8f9fa; border:2px dashed #dee2e6; display:flex; align-items:center; justify-content:center; border-radius:12px; cursor:pointer;" onclick="this.previousElementSibling.click()">
          <div class="text-center text-muted">
            <i class="fas fa-cloud-upload-alt fs-1 mb-2"></i>
            <p class="mb-0">Click to select image</p>
            <small>JPG, PNG, WebP (max 10MB)</small>
          </div>
        </div>
      </div>
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="form-label">Sizes & Quantities</label>
          <button type="button" class="btn btn-outline-secondary btn-sm add-size-btn">
            <i class="fas fa-plus"></i> Add Size
          </button>
        </div>
        <div class="variant-sizes-container">
          <div class="row mb-2 size-row">
            <div class="col-5">
              <select class="form-select size-select" required>
                <option value="">Select Size</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
            <div class="col-5">
              <input type="number" class="form-control quantity-input" placeholder="Quantity" min="1" required>
            </div>
            <div class="col-2">
              <button type="button" class="btn btn-outline-danger btn-sm remove-size" style="display: none;">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

		container.appendChild(variantCard);
		this.setupVariantEventListeners(variantCard);
		this.updateVariantRemoveButtons();
	}

	setupVariantEventListeners(variantCard) {
		const colorPicker = variantCard.querySelector(".variant-color-picker");
		const colorHex = variantCard.querySelector(".variant-color-hex");

		colorPicker.addEventListener(
			"change",
			(e) => (colorHex.value = e.target.value)
		);
		colorHex.addEventListener("input", (e) => {
			const value = e.target.value.trim();
			if (value.match(/^#[0-9A-F]{6}$/i)) colorPicker.value = value;
			else if (value.match(/^[0-9A-F]{6}$/i)) {
				e.target.value = "#" + value;
				colorPicker.value = "#" + value;
			}
		});

		variantCard
			.querySelector(".variant-image-input")
			.addEventListener("change", (e) =>
				this.handleVariantImageUpload(e, variantCard)
			);
		variantCard
			.querySelector(".add-size-btn")
			.addEventListener("click", () => this.addSizeRow(variantCard));
		variantCard
			.querySelector(".remove-variant")
			.addEventListener("click", () => {
				variantCard.remove();
				this.updateVariantRemoveButtons();
				this.renumberVariants();
			});
	}

	updateVariantRemoveButtons() {
		document.querySelectorAll(".variant-card").forEach((variant) => {
			variant.querySelector(".remove-variant").style.display =
				document.querySelectorAll(".variant-card").length > 1
					? "inline-block"
					: "none";
		});
	}

	renumberVariants() {
		document.querySelectorAll(".variant-card").forEach((variant, index) => {
			variant.dataset.variantIndex = index;
			variant.querySelector("h6").textContent = `Variant ${index + 1}`;
		});
	}

	addSizeRow(variantCard) {
		const container = variantCard.querySelector(".variant-sizes-container");
		const sizeRow = document.createElement("div");
		sizeRow.className = "row mb-2 size-row";

		sizeRow.innerHTML = `
      <div class="col-5">
        <select class="form-select size-select" required>
          <option value="">Select Size</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </div>
      <div class="col-5">
        <input type="number" class="form-control quantity-input" placeholder="Quantity" min="1" required>
      </div>
      <div class="col-2">
        <button type="button" class="btn btn-outline-danger btn-sm remove-size">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

		container.appendChild(sizeRow);
		sizeRow.querySelector(".remove-size").addEventListener("click", () => {
			sizeRow.remove();
			this.updateSizeRemoveButtons(variantCard);
		});
		this.updateSizeRemoveButtons(variantCard);
	}

	updateSizeRemoveButtons(variantCard) {
		variantCard.querySelectorAll(".size-row").forEach((row) => {
			row.querySelector(".remove-size").style.display =
				variantCard.querySelectorAll(".size-row").length > 1
					? "inline-block"
					: "none";
		});
	}

	handleVariantImageUpload(e, variantCard) {
		const file = e.target.files[0];
		if (!file) return;

		if (file.size > 10 * 1024 * 1024) {
			showErrorMessage("File size must be less than 10MB");
			e.target.value = "";
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			const preview = variantCard.querySelector(".variant-image-preview");
			preview.innerHTML = `
                <div class="position-relative w-100 h-100">
                    <img src="${event.target.result}" alt="New Image" style="width:100%; height:100%; object-fit:cover; border-radius:8px;" />
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-warning">New</span>
                    </div>
                </div>
            `;
			preview.style.border = "2px solid #ffc107";
		};
		reader.readAsDataURL(file);
	}

	handleGalleryUpload(e) {
		const files = Array.from(e.target.files);
		if (this.selectedImages.length + files.length > 5) {
			showErrorMessage("Maximum 5 additional images allowed");
			return;
		}
		this.selectedImages.push(...files);
		this.updateImagePreviews();
	}

	updateImagePreviews() {
		const container = document.getElementById("imagePreviewContainer");
		// Don't clear existing images, just add new ones
		this.selectedImages.forEach((file, index) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const previewDiv = document.createElement("div");
				previewDiv.className =
					"d-flex align-items-center bg-white rounded p-2 mb-2 shadow-sm border";
				previewDiv.innerHTML = `
          <img src="${
						e.target.result
					}" style="width:50px;height:50px;border-radius:8px;margin-right:12px;object-fit:cover;">
          <div class="flex-grow-1">
            <div class="small fw-bold">${file.name}</div>
            <div class="small text-muted">${(file.size / 1024).toFixed(
							1
						)} KB</div>
          </div>
          <span class="badge bg-warning me-2">New</span>
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeImageGlobal(${index})" title="Remove">
            <i class="fas fa-times"></i>
          </button>
        `;
				container.appendChild(previewDiv);
			};
			reader.readAsDataURL(file);
		});
	}

	removeImage(index) {
		this.selectedImages.splice(index, 1);
		this.updateImagePreviews();
	}

	async collectVariants() {
		const variants = [];
		for (let card of document.querySelectorAll(".variant-card")) {
			const color = card.querySelector(".variant-color-hex").value;
			const price = parseFloat(card.querySelector(".variant-price").value);
			const imageFile = card.querySelector(".variant-image-input").files[0];
			const preview = card.querySelector(".variant-image-preview");

			let imageUrl;

			// Check if new image was uploaded
			if (imageFile) {
				imageUrl = await uploadToCloudinary(imageFile);
			} else if (preview.dataset.currentImage) {
				// Use existing image
				imageUrl = preview.dataset.currentImage;
			} else {
				throw new Error(`Image is required for Variant ${variants.length + 1}`);
			}

			if (!color || !price) {
				throw new Error(
					` Complete all fields for Variant ${variants.length + 1}`
				);
			}

			const sizes = Array.from(card.querySelectorAll(".size-row"))
				.map((row) => {
					const size = row.querySelector(".size-select").value;
					const quantity = parseInt(row.querySelector(".quantity-input").value);
					return size && quantity > 0 ? { size, quantity } : null;
				})
				.filter(Boolean);

			if (!sizes.length) {
				throw new Error(
					`  Add at least one size for Variant ${variants.length + 1}`
				);
			}

			variants.push({ color, price, image: imageUrl, sizes });
		}
		return variants;
	}

	async handleSubmit(event) {
		event.preventDefault();
		const submitBtn = event.target.querySelector('button[type="submit"]');

		try {
			submitBtn.innerHTML =
				'<i class="fas fa-spinner fa-spin"></i> UPDATING...';
			submitBtn.disabled = true;

			const formData = new FormData(event.target);
			const variants = await this.collectVariants();
			const additionalImages = await Promise.all(
				this.selectedImages.map((file) => uploadToCloudinary(file))
			);

			const productData = {
				brand: formData.get("brand"),
				category: this.getCategoryName(formData.get("categoryId")),
				categoryId: formData.get("categoryId"),
				description: formData.get("description"),
				discount: parseFloat(formData.get("discount")) || 0,
				name: formData.get("name"),
				status: formData.get("status"),
				style: formData.get("style") || "Casual",
				updatedAt: new Date().toISOString(),
				variants,
			};

			if (additionalImages.length) {
				productData.additionalImages = additionalImages;
			}

			await setDoc(doc(db, "products", this.productId), productData, {
				merge: true,
			});

			submitBtn.innerHTML = '<i class="fas fa-check"></i> SUCCESS!';
			// show SweetAlert success then redirect
			await showSuccessMessage(`Product updated!`, `ID: ${this.productId}`);
			window.location.href = "all.html";
		} catch (error) {
			console.error("Error:", error);
			await showErrorMessage(error.message || "Error updating product");
		} finally {
			setTimeout(() => {
				submitBtn.innerHTML = '<i class="fas fa-save"></i> UPDATE PRODUCT';
				submitBtn.disabled = false;
			}, 2000);
		}
	}

	getCategoryName(categoryId) {
		const categories = {
			cat_mens_clothing: "Clothing",
			cat_womens_clothing: "Clothing",
			cat_shoes: "Shoes",
			cat_accessories: "Accessories",
			cat_sports: "Sports",
		};
		return categories[categoryId] || "Clothing";
	}
}

// Global function to remove gallery images
window.removeImageGlobal = function (index) {
	if (window.updateProductInstance)
		window.updateProductInstance.removeImage(index);
};

// Initialize UpdateProduct class on page load with product ID
document.addEventListener("DOMContentLoaded", () => {
	const urlParams = new URLSearchParams(window.location.search);
	const productId = urlParams.get("id");
	if (!productId) {
		showErrorMessage("No product ID provided").then(() => {
			window.location.href = "all.html";
		});
		return;
	}
	window.updateProductInstance = new UpdateProduct(productId);
});
