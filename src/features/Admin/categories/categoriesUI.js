import {
	addCategory,
	getAllCategories,
	getCategoryById,
	// Add these functions to your firebase.js if they don't exist
	// updateMultipleCategoryStatuses,
	deleteCategoryById,
	updateCategory,
} from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
const auth = getAuth();
export class CategoriesPage {
	constructor() {
		this.pageTitle = "Categories";
		this.pagePath = "/admin/categories";
		this.pageIcon = "fa fa-tags";
		this.render = this.render.bind(this);
		this.statusChangeHandler = null;
		this.actionHandler = null;
	}

	async renderCategories() {
		this.showLoading();
		try {
			const categories = await getAllCategories();
			if (!categories || categories.length === 0) {
				this.hideLoading();
				return this.renderEmptyState();
			}
			const categoriesWithParents = await Promise.all(
				categories.map(async (category) => {
					if (category.parentId) {
						try {
							const parent = await getCategoryById(category.parentId);
							return {
								...category,
								parentName: parent.name || "Unknown Parent",
							};
						} catch (error) {
							console.warn(
								`Failed to fetch parent category ${category.parentId}:`,
								error
							);
							return {
								...category,
								parentName: "Unknown Parent",
							};
						}
					}
					return { ...category, parentName: null };
				})
			);

			const container = document.createElement("div");
			container.className = "categories-page";

			// Generate edit modals for each category
			const editModalsHTML = categoriesWithParents
				.map(
					(category) => `
				<div class="modal fade" id="editCategoryModal${
					category.id
				}" tabindex="-1" aria-labelledby="editCategoryModalLabel${
						category.id
					}" aria-hidden="true">
					<div class="modal-dialog">
						<div class="modal-content">
							<div class="modal-header">
								<h1 class="modal-title fs-5" id="editCategoryModalLabel${category.id}">
									Edit Category
								</h1>
								<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
							</div>
							<div class="modal-body">
								<form id="editCategoryForm${category.id}">
									<input type="hidden" id="editCategoryId${category.id}" value="${
						category.id
					}" name="id" />

									<div class="mb-3">
										<label for="editCategoryName${
											category.id
										}" class="form-label">Category Name *</label>
										<input type="text" class="form-control" id="editCategoryName${
											category.id
										}" value="${category.name || ""}" name="name" required />
									</div>

									<div class="mb-3">
										<label for="editCategorySlug${category.id}" class="form-label">Slug *</label>
										<input type="text" class="form-control" id="editCategorySlug${
											category.id
										}" value="${category.slug || ""}" name="slug" required />
										<div class="form-text">URL-friendly version of the name</div>
									</div>

									<div class="mb-3">
										<label for="editCategoryDescription${
											category.id
										}" class="form-label">Description</label>
										<textarea class="form-control" id="editCategoryDescription${
											category.id
										}" name="description" rows="3">${
						category.description || ""
					}</textarea>
									</div>

									<div class="mb-3">
										<label for="editCategoryParent${
											category.id
										}" class="form-label">Parent Category</label>
										<select class="form-select" id="editCategoryParent${
											category.id
										}" name="parentId">
											<option value="">None (Root Category)</option>
										</select>
									</div>

									<div class="mb-3">
										<label for="editCategoryImage${
											category.id
										}" class="form-label">Category Image</label>
										<input type="url" class="form-control" id="editCategoryImage${
											category.id
										}" value="${category.image || ""}" name="image" />
										<div class="form-text">Enter image URL or leave blank for default</div>
									</div>

									<div class="mb-3">
										<label for="editCategoryStatus${
											category.id
										}" class="form-label">Status *</label>
										<select class="form-select" id="editCategoryStatus${
											category.id
										}" name="status" required>
											<option value="active" ${
												category.status === "active" ? "selected" : ""
											}>Active</option>
											<option value="inactive" ${
												category.status === "inactive" ? "selected" : ""
											}>Inactive</option>
											<option value="draft" ${
												category.status === "draft" ? "selected" : ""
											}>Draft</option>
										</select>
									</div>
								</form>
							</div>
							<div class="modal-footer">
								<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
								<button type="button" class="btn btn-primary" id="updateCategoryBtn${
									category.id
								}" data-category-id="${category.id}">
									<span class="spinner-border spinner-border-sm d-none me-2" role="status" aria-hidden="true"></span>
									Update Category
								</button>
							</div>
						</div>
					</div>
				</div>
			`
				)
				.join("");

			container.innerHTML = `
				<div class="d-flex justify-content-between align-items-center mb-4">
					<h1>${this.pageTitle}</h1>
					<div class="d-flex align-items-center gap-3">
						<div class="text-muted">
							<small>${categoriesWithParents.length} categories</small>
						</div>
						<div class="bulk-actions">
							<select id="bulkAction" class="form-select">
								<option value="" selected disabled>Bulk Actions</option>
								<option value="activate">Activate</option>
								<option value="deactivate">Deactivate</option>
								<option value="delete">Delete</option>
							</select>
						</div>
						<button class="btn btn-primary" id="addCategoryBtn" data-bs-toggle="modal" data-bs-target="#addModal">
							<i class="fa fa-plus me-2"></i>Add Category
						</button>
					</div>
				</div>
				
				<div class="card">
					<div class="card-header">
						<h5 class="mb-0">All Categories</h5>
					</div>
					<div class="card-body p-0">
						<div class="table-responsive">
							<table class="table table-hover mb-0">
								<thead class="table-light">
									<tr>
										<th scope="col">
											<input type="checkbox" class="form-check-input" id="selectAll">
										</th>
										<th scope="col">Category</th>
										<th scope="col">Slug</th>
										<th scope="col">Parent</th>
										<th scope="col">Status</th>
										<th scope="col">Created</th>
										<th scope="col">Actions</th>
									</tr>
								</thead>
								<tbody>
									${categoriesWithParents
										.map(
											(category, index) => `
										<tr data-category-id="${category.id}" data-category-index="${index}">
											<td>
												<input type="checkbox" class="form-check-input category-checkbox" value="${
													category.id
												}" data-category-index="${index}">
											</td>
											<td>
												<div class="d-flex align-items-center">
													<div class="bg-light rounded me-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-size: 12px;">
														${(category.name || "C").charAt(0).toUpperCase()}
													</div>
													<div>
														<div class="fw-medium">${category.name || "Unnamed Category"}</div>
														<small class="text-muted">
															${
																category.description
																	? category.description.substring(0, 50) +
																	  (category.description.length > 50
																			? "..."
																			: "")
																	: "No description"
															}
														</small>
													</div>
												</div>
											</td>
											<td>
												<code class="small">${category.slug || "no-slug"}</code>
											</td>
											<td>
												${
													category.parentName
														? `<span class="badge bg-light text-dark">${category.parentName}</span>`
														: `<span class="text-muted">Root Category</span>`
												}
											</td>
											<td class="status-cell">
												${this.getStatusBadge(category.status)}
											</td>
											<td>
												<span class="text-muted">${this.formatDate(category.createdAt)}</span>
											</td>
											<td>
												<div class="btn-group btn-group-sm">
													<button type="button" class="btn btn-outline-primary edit-btn" data-bs-toggle="modal" data-bs-target="#editCategoryModal${
														category.id
													}" data-category-id="${category.id}">
														<i class="fa fa-edit"></i>
													</button>
													<button type="button" class="btn btn-outline-danger delete-btn" data-category-id="${
														category.id
													}">
														<i class="fa fa-trash"></i>
													</button>
												</div>
											</td>
										</tr>
									`
										)
										.join("")}
								</tbody>
							</table>
						</div>
					</div>
				</div>
				
				<!-- Category Summary Cards -->
				<div class="row mt-4">
					<div class="col-md-3">
						<div class="card bg-primary text-white">
							<div class="card-body">
								<h5 class="card-title">Total Categories</h5>
								<h3 class="mb-0">${categoriesWithParents.length}</h3>
							</div>
						</div>
					</div>
					<div class="col-md-3">
						<div class="card bg-success text-white">
							<div class="card-body">
								<h5 class="card-title">Active Categories</h5>
								<h3 class="mb-0">${
									categoriesWithParents.filter((c) => c.status === "active")
										.length
								}</h3>
							</div>
						</div>
					</div>
					<div class="col-md-3">
						<div class="card bg-warning text-white">
							<div class="card-body">
								<h5 class="card-title">Root Categories</h5>
								<h3 class="mb-0">${categoriesWithParents.filter((c) => !c.parentId).length}</h3>
							</div>
						</div>
					</div>
					<div class="col-md-3">
						<div class="card bg-info text-white">
							<div class="card-body">
								<h5 class="card-title">Sub Categories</h5>
								<h3 class="mb-0">${categoriesWithParents.filter((c) => c.parentId).length}</h3>
							</div>
						</div>
					</div>
				</div>

				<!-- Edit Category Modals -->
				${editModalsHTML}
				
				<!-- Add Category Modal -->
				<div class="modal fade" id="addModal" tabindex="-1" aria-labelledby="addModalLabel" aria-hidden="true">
					<div class="modal-dialog">
						<div class="modal-content">
							<div class="modal-header">
								<h1 class="modal-title fs-5" id="addModalLabel">Add New Category</h1>
								<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
							</div>
							<div class="modal-body">
								<form id="addCategoryForm">
									<div class="mb-3">
										<label for="categoryName" class="form-label">Category Name *</label>
										<input type="text" class="form-control" id="categoryName" name="name" required>
									</div>
									
									<div class="mb-3">
										<label for="categorySlug" class="form-label">Slug *</label>
										<input type="text" class="form-control" id="categorySlug" name="slug" required>
										<div class="form-text">URL-friendly version of the name (auto-generated)</div>
									</div>
									
									<div class="mb-3">
										<label for="categoryDescription" class="form-label">Description</label>
										<textarea class="form-control" id="categoryDescription" name="description" rows="3" placeholder="Enter category description..."></textarea>
									</div>
									
									<div class="mb-3">
										<label for="categoryParent" class="form-label">Parent Category</label>
										<select class="form-select" id="categoryParent" name="parentId">
											<option value="">None (Root Category)</option>
										</select>
									</div>
									
									<div class="mb-3">
										<label for="categoryImage" class="form-label">Category Image</label>
										<input type="url" class="form-control" id="categoryImage" name="image" placeholder="https://example.com/image.jpg">
										<div class="form-text">Enter image URL or leave blank for default</div>
									</div>
									
									<div class="mb-3">
										<label for="categoryStatus" class="form-label">Status *</label>
										<select class="form-select" id="categoryStatus" name="status" required>
											<option value="active">Active</option>
											<option value="inactive">Inactive</option>
											<option value="draft">Draft</option>
										</select>
									</div>
								</form>
							</div>
							<div class="modal-footer">
								<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
								<button type="button" class="btn btn-primary" id="saveCategoryBtn">
									<span class="spinner-border spinner-border-sm d-none me-2" role="status" aria-hidden="true"></span>
									Add Category
								</button>
							</div>
						</div>
					</div>
				</div>
			`;

			// Populate parent category options for edit modals
			this.populateParentOptions(categoriesWithParents, container);
			this.populateAddModalParentOptions(categoriesWithParents, container);
			// Add event listeners
			this.addEventListeners(container);

			// Hide loading state
			this.hideLoading();

			return container;
		} catch (error) {
			console.error("Error rendering categories:", error);
			return this.renderError(error);
		}
	}

	generateSlug(name) {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9 -]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.trim();
	}

	populateParentOptions(categories, container) {
		// Get root categories for parent options
		const rootCategories = categories.filter(
			(cat) => !cat.parentId && cat.status === "active"
		);

		// Populate each edit modal's parent select
		categories.forEach((category) => {
			const editParentSelect = container.querySelector(
				`#editCategoryParent${category.id}`
			);
			if (editParentSelect) {
				// Clear existing options except the first one
				const firstOption = editParentSelect.firstElementChild;
				editParentSelect.innerHTML = "";
				editParentSelect.appendChild(firstOption.cloneNode(true));

				// Add parent options (excluding the current category to prevent self-parenting)
				rootCategories
					.filter((rootCat) => rootCat.id !== category.id)
					.forEach((rootCat) => {
						const option = new Option(rootCat.name, rootCat.id);
						if (category.parentId === rootCat.id) {
							option.selected = true;
						}
						editParentSelect.appendChild(option);
					});
			}
		});
	}

	formatDate(dateString) {
		if (!dateString) return "N/A";

		try {
			let date;
			if (typeof dateString === "string") {
				date = new Date(dateString);
			} else if (dateString && typeof dateString.toDate === "function") {
				date = dateString.toDate();
			} else if (dateString && typeof dateString.seconds === "number") {
				date = new Date(dateString.seconds * 1000);
			} else if (dateString instanceof Date) {
				date = dateString;
			} else {
				return "Invalid Date";
			}
			if (isNaN(date.getTime())) {
				return "Invalid Date";
			}
			return date.toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			});
		} catch (error) {
			console.error("Error formatting date:", error);
			return "Invalid Date";
		}
	}

	getStatusBadge(status) {
		switch (status?.toLowerCase()) {
			case "active":
				return '<span class="badge bg-success">● Active</span>';
			case "inactive":
				return '<span class="badge bg-secondary">● Inactive</span>';
			case "draft":
				return '<span class="badge bg-warning">● Draft</span>';
			case "archived":
				return '<span class="badge bg-dark">● Archived</span>';
			default:
				return '<span class="badge bg-secondary">● Unknown</span>';
		}
	}

	addEventListeners(container) {
		// Handle select all checkbox
		const selectAllCheckbox = container.querySelector("#selectAll");
		const getCategoryCheckboxes = () =>
			container.querySelectorAll(".category-checkbox");

		if (selectAllCheckbox) {
			selectAllCheckbox.addEventListener("change", (e) => {
				const categoryCheckboxes = getCategoryCheckboxes();
				categoryCheckboxes.forEach((checkbox) => {
					checkbox.checked = e.target.checked;
				});
			});
		}

		// Handle individual checkboxes
		container.addEventListener("change", (e) => {
			if (e.target.classList.contains("category-checkbox")) {
				const categoryCheckboxes = getCategoryCheckboxes();
				const checkedBoxes = container.querySelectorAll(
					".category-checkbox:checked"
				);

				if (selectAllCheckbox) {
					selectAllCheckbox.checked =
						checkedBoxes.length === categoryCheckboxes.length;
					selectAllCheckbox.indeterminate =
						checkedBoxes.length > 0 &&
						checkedBoxes.length < categoryCheckboxes.length;
				}
			}
		});

		// Handle add category button and form
		const saveCategory = container.querySelector("#saveCategoryBtn");
		const categoryNameInput = container.querySelector("#categoryName");
		const categorySlugInput = container.querySelector("#categorySlug");

		// Auto-generate slug from name in add modal
		if (categoryNameInput && categorySlugInput) {
			categoryNameInput.addEventListener("input", (e) => {
				if (!categorySlugInput.dataset.manuallyEdited) {
					categorySlugInput.value = this.generateSlug(e.target.value);
				}
			});

			categorySlugInput.addEventListener("input", () => {
				categorySlugInput.dataset.manuallyEdited = "true";
			});
		}

		if (saveCategory) {
			saveCategory.addEventListener("click", () => {
				this.addCategory();
			});
		}

		// Handle update category buttons
		container.addEventListener("click", (e) => {
			if (e.target.id && e.target.id.startsWith("updateCategoryBtn")) {
				const categoryId = e.target.getAttribute("data-category-id");
				this.updateCategory(categoryId, container);
			}
		});

		// Handle bulk actions
		this.actionHandler = async (e) => {
			if (e.target && e.target.id === "bulkAction") {
				const action = e.target.value;
				const checkedBoxes = container.querySelectorAll(
					".category-checkbox:checked"
				);
				const selectedCategories = Array.from(checkedBoxes).map((cb) => ({
					categoryId: cb.value,
					categoryIndex: cb.getAttribute("data-category-index"),
				}));

				if (selectedCategories.length === 0) {
					Swal.fire({
						icon: "warning",
						title: "No Categories Selected",
						text: "Please select categories to perform bulk action.",
					});
					e.target.value = "";
					return;
				}

				try {
					e.target.disabled = true;
					const categoryIds = selectedCategories.map((item) => item.categoryId);

					switch (action) {
						case "activate":
							// await updateMultipleCategoryStatuses(categoryIds, 'active');
							this.updateCategoryRows(container, selectedCategories, "active");
							break;
						case "deactivate":
							// await updateMultipleCategoryStatuses(categoryIds, 'inactive');
							this.updateCategoryRows(
								container,
								selectedCategories,
								"inactive"
							);
							break;
						case "delete":
							// await Promise.all(categoryIds.map(id => deleteCategoryById(id)));
							this.removeCategoryRows(container, selectedCategories);
							break;
					}

					// Reset checkboxes
					if (selectAllCheckbox) {
						selectAllCheckbox.checked = false;
						selectAllCheckbox.indeterminate = false;
					}

					this.showSuccessMessage(
						`Successfully ${action}d ${selectedCategories.length} category(ies)`
					);
				} catch (error) {
					console.error(`Error performing bulk ${action}:`, error);
					Swal.fire({
						icon: "error",
						title: "Action Failed",
						text: `Failed to ${action} categories. Please try again.`,
					});
				} finally {
					e.target.disabled = false;
					e.target.value = "";
				}
			}
		};

		// Handle individual action buttons
		container.addEventListener("click", (e) => {
			if (e.target.closest(".edit-btn")) {
				const categoryId = e.target
					.closest(".edit-btn")
					.getAttribute("data-category-id");
			} else if (e.target.closest(".delete-btn")) {
				const categoryId = e.target
					.closest(".delete-btn")
					.getAttribute("data-category-id");
				this.deleteCategory(categoryId);
			}
		});

		document.addEventListener("change", this.actionHandler);
	}

	async updateCategory(categoryId, container) {
		const form = container.querySelector(`#editCategoryForm${categoryId}`);
		const updateBtn = container.querySelector(
			`#updateCategoryBtn${categoryId}`
		);
		const spinner = updateBtn.querySelector(".spinner-border");

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const formData = new FormData(form);
		const categoryData = {
			name: formData.get("name"),
			slug: formData.get("slug"),
			description: formData.get("description") || "",
			parentId: formData.get("parentId") || null,
			image: formData.get("image") || "",
			status: formData.get("status"),
			updatedAt: new Date().toISOString(),
		};

		try {
			updateBtn.disabled = true;
			spinner.classList.remove("d-none");

			// Update category in Firebase
			await updateCategory(categoryId, categoryData);

			// Update the table row without full page refresh
			await this.updateCategoryRow(categoryId, categoryData, container);

			// Close modal
			const modal = bootstrap.Modal.getInstance(
				container.querySelector(`#editCategoryModal${categoryId}`)
			);
			if (modal) {
				modal.hide();
			}

			this.showSuccessMessage("Category updated successfully!");
		} catch (error) {
			console.error("Error updating category:", error);
			Swal.fire({
				icon: "error",
				title: "Update Failed",
				text: "Failed to update category. Please try again.",
			});
		} finally {
			updateBtn.disabled = false;
			spinner.classList.add("d-none");
		}
	}

	async updateCategoryRow(categoryId, updatedData, container) {
		// Find the table row for this category
		const row = container.querySelector(`tr[data-category-id="${categoryId}"]`);
		if (!row) return;

		// Get parent name if parentId exists
		let parentName = null;
		if (updatedData.parentId) {
			try {
				const parent = await getCategoryById(updatedData.parentId);
				parentName = parent.name || "Unknown Parent";
			} catch (error) {
				console.warn(
					`Failed to fetch parent category ${updatedData.parentId}:`,
					error
				);
				parentName = "Unknown Parent";
			}
		}

		// Update the row content
		const categoryCell = row.children[1]; // Category column
		const slugCell = row.children[2]; // Slug column
		const parentCell = row.children[3]; // Parent column
		const statusCell = row.children[4]; // Status column

		// Update category name and description
		categoryCell.innerHTML = `
			<div class="d-flex align-items-center">
				<div class="bg-light rounded me-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-size: 12px;">
					${(updatedData.name || "C").charAt(0).toUpperCase()}
				</div>
				<div>
					<div class="fw-medium">${updatedData.name || "Unnamed Category"}</div>
					<small class="text-muted">
						${
							updatedData.description
								? updatedData.description.substring(0, 50) +
								  (updatedData.description.length > 50 ? "..." : "")
								: "No description"
						}
					</small>
				</div>
			</div>
		`;

		// Update slug
		slugCell.innerHTML = `<code class="small">${
			updatedData.slug || "no-slug"
		}</code>`;

		// Update parent
		parentCell.innerHTML = parentName
			? `<span class="badge bg-light text-dark">${parentName}</span>`
			: `<span class="text-muted">Root Category</span>`;

		// Update status
		statusCell.innerHTML = this.getStatusBadge(updatedData.status);

		// Also update the edit modal with new data (in case user opens it again)
		this.updateEditModal(categoryId, { ...updatedData, parentName }, container);
	}

	updateEditModal(categoryId, categoryData, container) {
		const nameInput = container.querySelector(`#editCategoryName${categoryId}`);
		const slugInput = container.querySelector(`#editCategorySlug${categoryId}`);
		const descInput = container.querySelector(
			`#editCategoryDescription${categoryId}`
		);
		const parentSelect = container.querySelector(
			`#editCategoryParent${categoryId}`
		);
		const imageInput = container.querySelector(
			`#editCategoryImage${categoryId}`
		);
		const statusSelect = container.querySelector(
			`#editCategoryStatus${categoryId}`
		);

		if (nameInput) nameInput.value = categoryData.name || "";
		if (slugInput) slugInput.value = categoryData.slug || "";
		if (descInput) descInput.value = categoryData.description || "";
		if (parentSelect) parentSelect.value = categoryData.parentId || "";
		if (imageInput) imageInput.value = categoryData.image || "";
		if (statusSelect) statusSelect.value = categoryData.status || "active";
	}

	updateCategoryRows(container, selectedCategories, newStatus) {
		selectedCategories.forEach((item) => {
			const row = container.querySelector(
				`tr[data-category-id="${item.categoryId}"][data-category-index="${item.categoryIndex}"]`
			);
			if (row) {
				const statusCell = row.querySelector(".status-cell");
				if (statusCell) {
					statusCell.innerHTML = this.getStatusBadge(newStatus);
				}

				// Uncheck the checkbox
				const checkbox = row.querySelector(".category-checkbox");
				if (checkbox) {
					checkbox.checked = false;
				}
			}
		});
	}

	removeCategoryRows(container, selectedCategories) {
		selectedCategories.forEach((item) => {
			const row = container.querySelector(
				`tr[data-category-id="${item.categoryId}"][data-category-index="${item.categoryIndex}"]`
			);
			if (row) {
				row.remove();
			}
		});
	}

	async deleteCategory(categoryId) {
		Swal.fire({
			title: "Are you sure?",
			text: "This action cannot be undone.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Yes, delete it!",
			cancelButtonText: "Cancel",
		}).then(async (result) => {
			if (result.isConfirmed) {
				try {
					await deleteCategoryById(categoryId);
					// Remove the row from the table
					const row = document.querySelector(
						`tr[data-category-id="${categoryId}"]`
					);
					if (row) {
						row.remove();
					}
					this.showSuccessMessage("Category deleted successfully!");
				} catch (error) {
					console.error("Error deleting category:", error);
					Swal.fire({
						icon: "error",
						title: "Delete Failed",
						text: "Failed to delete category. Please try again.",
					});
				}
			}
		});
	}

	populateAddModalParentOptions(categories, container) {
		const rootCategories = categories.filter(
			(cat) => !cat.parentId && cat.status === "active"
		);
		const addParentSelect = container.querySelector("#categoryParent");
		if (addParentSelect) {
			// Clear all options first
			addParentSelect.innerHTML = "";

			// Add the default "None" option
			const noneOption = new Option("None (Root Category)", "");
			addParentSelect.appendChild(noneOption);

			// Add root categories as parent options
			rootCategories.forEach((rootCat) => {
				const option = new Option(rootCat.name, rootCat.id);
				addParentSelect.appendChild(option);
			});
		} else {
			console.error(
				"Could not find #categoryParent select element in add modal"
			);
		}
	}
	async addCategory() {
		const form = document.getElementById("addCategoryForm");
		const saveBtn = document.getElementById("saveCategoryBtn");
		const spinner = saveBtn.querySelector(".spinner-border");

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const formData = new FormData(form);
		const categoryData = {
			name: formData.get("name"),
			slug: formData.get("slug"),
			description: formData.get("description") || "",
			parentId: formData.get("parentId") || null,
			image: formData.get("image") || "",
			status: formData.get("status"),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		try {
			saveBtn.disabled = true;
			spinner.classList.remove("d-none");

			// Add category to Firebase
			const newCategory = await addCategory(categoryData);

			// Reset form
			form.reset();
			const categoryNameInput = document.getElementById("categoryName");
			const categorySlugInput = document.getElementById("categorySlug");
			if (categorySlugInput) {
				categorySlugInput.dataset.manuallyEdited = "";
			}

			// Close modal
			const addModal = document.getElementById("addModal");
			if (addModal) {
				const modalInstance = bootstrap.Modal.getInstance(addModal);
				if (modalInstance) {
					modalInstance.hide();
				}
			}

			this.showSuccessMessage("Category added successfully!");

			// Re-render the page to show the new category
			const newContainer = await this.renderCategories();
			const mainContent = document.getElementById("main-content");
			if (mainContent) {
				mainContent.innerHTML = "";
				mainContent.appendChild(newContainer);
			}
		} catch (error) {
			console.error("Error adding category:", error);
			Swal.fire({
				icon: "error",
				title: "Add Failed",
				text: "Failed to add category. Please try again.",
			});
		} finally {
			saveBtn.disabled = false;
			spinner.classList.add("d-none");
		}
	}

	showSuccessMessage(message) {
		Swal.fire({
			icon: "success",
			title: "Success",
			text: message,
		});
	}

	renderEmptyState() {
		const container = document.createElement("div");
		container.className = "categories-page";
		container.innerHTML = `
			<div class="d-flex justify-content-between align-items-center mb-4">
				<h1>${this.pageTitle}</h1>
				<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addModal">
					<i class="fa fa-plus me-2"></i>Add Category
				</button>
			</div>
			<div class="text-center py-5">
				<div class="mb-3">
					<i class="fa fa-tags fa-3x text-muted"></i>
				</div>
				<h4>No Categories Found</h4>
				<p class="text-muted">Get started by creating your first category.</p>
				<button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#addModal">
					<i class="fa fa-plus me-2"></i>Add Your First Category
				</button>
			</div>
		`;

		return container;
	}

	showLoading() {
		const loadingElement = document.getElementById("loading");
		const mainContent = document.getElementById("main-content");

		if (loadingElement) {
			loadingElement.style.display = "flex";
		}
		if (mainContent) {
			mainContent.style.display = "none";
		}
	}

	hideLoading() {
		const loadingElement = document.getElementById("loading");
		const mainContent = document.getElementById("main-content");

		if (loadingElement) {
			loadingElement.style.display = "none";
			loadingElement.remove();
		}
		if (mainContent) {
			mainContent.style.display = "block";
		}
	}

	renderError(error) {
		const container = document.createElement("div");
		container.className = "categories-page";
		container.innerHTML = `
			<div class="alert alert-danger" role="alert">
				<h4 class="alert-heading">Error Loading Categories</h4>
				<p>There was a problem loading the categories. Please try again later.</p>
				${error ? `<small class="text-muted">Error: ${error.message}</small>` : ""}
			</div>
		`;
		return container;
	}

	// Clean up method to remove event listeners
	cleanup() {
		if (this.actionHandler) {
			document.removeEventListener("change", this.actionHandler);
			this.actionHandler = null;
		}
	}

	async render() {
		// Clean up any existing listeners first
		this.cleanup();
		return await this.renderCategories();
	}
}
