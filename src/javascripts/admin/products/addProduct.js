// Import Firebase and other dependencies
import {
  collection,
  setDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../../config/firebase.js";
import { uploadToCloudinary } from "./uploadFile.js";
import {
  showSuccessMessage,
  showErrorMessage,
} from "../../../features/general/utils.js";

class AddProduct {
  // Initialize Firebase collection and state
  constructor() {
    this.productsCollection = collection(db, "products");
    this.selectedImages = [];
    this.initializeEventListeners();
    this.addInitialVariant();
  }

  // Setup all event listeners for the form
  initializeEventListeners() {
    document
      .getElementById("addProductForm")
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

  // Add first variant when form loads
  addInitialVariant() {
    this.addVariantRow();
  }

  // Copy base price to empty variant price fields
  autoFillVariantPrices() {
    const basePrice = document.getElementById("price").value;
    if (basePrice) {
      document
        .querySelectorAll(".variant-price")
        .forEach((input) => !input.value && (input.value = basePrice));
    }
  }

  // Create and append new variant card to container
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
        <label class="form-label">Variant Image *</label>
        <input type="file" class="form-control variant-image-input" accept="image/*" required>
        <div class="variant-image-preview mt-2" onclick="this.previousElementSibling.click()">
          <span class="text-muted"><i class="fas fa-image"></i> Select Image</span>
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
                <option value="X-Small">X-Small</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="X-Large">X-Large</option>
                <option value="38">38</option>
                <option value="39">39</option>
                <option value="40">40</option>
                <option value="41">41</option>
                <option value="42">42</option>
                <option value="43">43</option>
                <option value="44">44</option>
                <option value="45">45</option>
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

  // Add event listeners to variant card elements
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

  // Show/hide remove buttons based on variant count
  updateVariantRemoveButtons() {
    document.querySelectorAll(".variant-card").forEach((variant) => {
      variant.querySelector(".remove-variant").style.display =
        document.querySelectorAll(".variant-card").length > 1
          ? "inline-block"
          : "none";
    });
  }

  // Update variant numbers after deletion
  renumberVariants() {
    document.querySelectorAll(".variant-card").forEach((variant, index) => {
      variant.dataset.variantIndex = index;
      variant.querySelector("h6").textContent = `Variant ${index + 1}`;
    });
  }

  // Add new size row to variant
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
          <option value="X-Small">X-Small</option>
          <option value="Small">Small</option>
          <option value="Medium">Medium</option>
          <option value="Large">Large</option>
          <option value="X-Large">X-Large</option>
          <option value="38">38</option>
          <option value="39">39</option>
          <option value="40">40</option>
          <option value="41">41</option>
          <option value="42">42</option>
          <option value="43">43</option>
          <option value="44">44</option>
          <option value="45">45</option>
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

  // Show/hide size remove buttons based on count
  updateSizeRemoveButtons(variantCard) {
    variantCard.querySelectorAll(".size-row").forEach((row) => {
      row.querySelector(".remove-size").style.display =
        variantCard.querySelectorAll(".size-row").length > 1
          ? "inline-block"
          : "none";
    });
  }

  // Handle variant image upload and preview
  handleVariantImageUpload(e, variantCard) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      variantCard.querySelector(
        ".variant-image-preview"
      ).innerHTML = `<img src="${event.target.result}" alt="Variant Image" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
    };
    reader.readAsDataURL(file);
  }

  // Handle multiple gallery image uploads
  handleGalleryUpload(e) {
    const files = Array.from(e.target.files);
    if (this.selectedImages.length + files.length > 5) {
      // use SweetAlert instead of browser alert
      showErrorMessage("Maximum 5 additional images allowed");
      return;
    }
    this.selectedImages.push(...files);
    this.updateImagePreviews();
  }

  // Update gallery image previews
  updateImagePreviews() {
    const container = document.getElementById("imagePreviewContainer");
    container.innerHTML = "";
    this.selectedImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewDiv = document.createElement("div");
        previewDiv.className =
          "d-flex align-items-center bg-white rounded p-2 mb-2 shadow-sm";
        previewDiv.innerHTML = `
          <img src="${e.target.result}" style="width:36px;height:36px;border-radius:5px;margin-right:12px;object-fit:cover;">
          <div class="flex-grow-1 small">${file.name}<div class="progress mt-1" style="height:4px;"><div class="progress-bar bg-success" style="width:100%;"></div></div></div>
          <button type="button" class="btn btn-link btn-sm text-danger ms-2" onclick="removeImageGlobal(${index})"><i class="fa fa-times"></i></button>
        `;
        container.appendChild(previewDiv);
      };
      reader.readAsDataURL(file);
    });
  }

  // Remove image from gallery
  removeImage(index) {
    this.selectedImages.splice(index, 1);
    this.updateImagePreviews();
  }

  // Process and validate all variant data
  async collectVariants() {
    const variants = [];
    for (let card of document.querySelectorAll(".variant-card")) {
      const color = card.querySelector(".variant-color-hex").value;
      const price = parseFloat(card.querySelector(".variant-price").value);
      const imageFile = card.querySelector(".variant-image-input").files[0];

      if (!imageFile || !color || !price)
        throw new Error(
          `Complete all fields for Variant ${variants.length + 1}`
        );
      const imageUrl = await uploadToCloudinary(imageFile);
      const sizes = Array.from(card.querySelectorAll(".size-row"))
        .map((row) => {
          const size = row.querySelector(".size-select").value;
          const quantity = parseInt(row.querySelector(".quantity-input").value);
          return size && quantity > 0 ? { size, quantity } : null;
        })
        .filter(Boolean);

      if (!sizes.length)
        throw new Error(
          `Add at least one size for Variant ${variants.length + 1}`
        );
      variants.push({ color, price, image: imageUrl, sizes });
    }
    return variants;
  }

  // Validate form data
  validateFormData(formData) {
    const errors = [];

    // Validate product name (3-100 chars)
    if (
      !formData.get("name") ||
      formData.get("name").length < 3 ||
      formData.get("name").length > 100
    ) {
      errors.push("Product name must be between 3 and 100 characters");
    }

    // Validate description (10-500 chars)
    if (
      !formData.get("description") ||
      formData.get("description").length < 10 ||
      formData.get("description").length > 500
    ) {
      errors.push("Description must be between 10 and 500 characters");
    }

    // Validate brand
    if (!formData.get("brand")) {
      errors.push("Brand is required");
    }

    // Validate category
    if (!formData.get("categoryId")) {
      errors.push("Category is required");
    }

    // Validate discount (0-100)
    const discount = parseFloat(formData.get("discount") || 0);
    if (discount < 0 || discount > 100) {
      errors.push("Discount must be between 0 and 100");
    }

    return errors;
  }

  // Validate variants data
  validateVariants() {
    const errors = [];
    document.querySelectorAll(".variant-card").forEach((card, index) => {
      const variantNum = index + 1;

      // Validate color
      const color = card.querySelector(".variant-color-hex").value;
      if (!color.match(/^#[0-9A-F]{6}$/i)) {
        errors.push(`Variant ${variantNum}: Invalid color format`);
      }

      // Validate price
      const price = parseFloat(card.querySelector(".variant-price").value);
      if (!price || price <= 0) {
        errors.push(`Variant ${variantNum}: Price must be greater than 0`);
      }

      // Validate image
      if (!card.querySelector(".variant-image-input").files[0]) {
        errors.push(`Variant ${variantNum}: Image is required`);
      }

      // Validate sizes
      const sizes = Array.from(card.querySelectorAll(".size-row")).map(
        (row) => ({
          size: row.querySelector(".size-select").value,
          quantity: parseInt(row.querySelector(".quantity-input").value),
        })
      );

      if (!sizes.length) {
        errors.push(`Variant ${variantNum}: At least one size is required`);
      }

      sizes.forEach((size, sizeIndex) => {
        if (!size.size) {
          errors.push(
            `Variant ${variantNum}: Size selection is required for row ${
              sizeIndex + 1
            }`
          );
        }
        if (!size.quantity || size.quantity < 1) {
          errors.push(
            `Variant ${variantNum}: Quantity must be at least 1 for row ${
              sizeIndex + 1
            }`
          );
        }
      });
    });

    return errors;
  }

  // Display validation errors
  showValidationErrors(errors) {
    const errorHtml = errors.map((error) => `<li>${error}</li>`).join("");
    const alertDiv = document.createElement("div");
    alertDiv.className = "alert alert-danger alert-dismissible fade show mt-3";
    alertDiv.innerHTML = `
      <strong>Please fix the following errors:</strong>
      <ul class="mb-0">${errorHtml}</ul>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Remove any existing error alerts
    document
      .querySelectorAll(".alert-danger")
      .forEach((alert) => alert.remove());

    // Insert new alert before the form
    document
      .getElementById("addProductForm")
      .insertAdjacentElement("beforebegin", alertDiv);
  }

  // Handle form submission and save product
  async handleSubmit(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
      // Validate form data
      const formData = new FormData(event.target);
      const formErrors = this.validateFormData(formData);
      const variantErrors = this.validateVariants();

      const allErrors = [...formErrors, ...variantErrors];
      if (allErrors.length > 0) {
        this.showValidationErrors(allErrors);
        return;
      }

      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> UPLOADING IMAGES...';
      submitBtn.disabled = true;

      const variants = await this.collectVariants();
      const additionalImages = await Promise.all(
        this.selectedImages.map((file) => uploadToCloudinary(file))
      );

      const ratings = {
        1: Math.floor(Math.random() * 30) + 5,
        2: Math.floor(Math.random() * 50) + 10,
        3: Math.floor(Math.random() * 100) + 30,
        4: Math.floor(Math.random() * 400) + 100,
        5: Math.floor(Math.random() * 1500) + 500,
      };
      const productData = {
        id: "prod_" + Date.now().toString().slice(-9),
        brand: formData.get("brand"),
        category: this.getCategoryName(formData.get("categoryId")),
        categoryId: formData.get("categoryId"),
        createdAt: new Date().toISOString(),
        description: formData.get("description"),
        discount: parseFloat(formData.get("discount")) || 0,
        name: formData.get("name"),
        ratings,
        status: formData.get("status"),
        style: formData.get("style") || "Casual",
        updatedAt: new Date().toISOString(),
        variants,
      };

      if (additionalImages.length)
        productData.additionalImages = additionalImages;

      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> SAVING TO DATABASE...';
      // Use the productData.id as the document ID so it appears as prod_xxxxx in Firestore
      await setDoc(
        doc(this.productsCollection.firestore, "products", productData.id),
        productData
      );

      submitBtn.innerHTML = '<i class="fas fa-check"></i> SUCCESS!';
      setTimeout(async () => {
        // show SweetAlert success instead of browser alert
        await showSuccessMessage(
          "Product added!",
          `ID: ${productData.id}\nVariants: ${variants.length}\nAdditional Images: ${additionalImages.length}`
        );
        this.resetForm();
      }, 1000);
    } catch (error) {
      // show inline validation errors and a popup error
      this.showValidationErrors([error.message]);
      await showErrorMessage(error.message || "Failed to add product");
    } finally {
      setTimeout(() => {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> SAVE PRODUCT';
        submitBtn.disabled = false;
      }, 2000);
    }
  }

  // Clear form and reset to initial state
  resetForm() {
    document.getElementById("addProductForm").reset();
    document.getElementById("imagePreviewContainer").innerHTML = "";
    document.getElementById("variantsContainer").innerHTML = "";
    this.selectedImages = [];
    this.addInitialVariant();
  }

  // Convert category ID to display name
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
  if (window.addProductInstance) window.addProductInstance.removeImage(index);
};

// Initialize AddProduct class on page load
document.addEventListener("DOMContentLoaded", () => {
  window.addProductInstance = new AddProduct();
});
