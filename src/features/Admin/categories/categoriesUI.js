import {
	addCategory,
	getCategoryById,
	deleteCategoryById,
	updateCategory,
} from "./firebase.js";
import { Pagination } from "../../Pagination/firebase.js";

export class CategoriesPage {
	constructor() {
		this.pageTitle = "Categories";
		this.pagePath = "/admin/categories";
		this.pageIcon = "fa fa-tags";
		this.render = this.render.bind(this);
		this.statusChangeHandler = null;
		this.actionHandler = null;
		this.pagination = new Pagination(10, "categories");
		this.currentCategories = [];
	}

	async renderCategories() {
		console.log("=== RENDER CATEGORIES START ===");
		this.showLoading();

		try {
			console.log("Current page:", this.pagination.currentPage);
			console.log("Page size:", this.pagination.pageSize);
			console.log("Current categories length:", this.currentCategories?.length);
			console.log("Total in pagination:", this.pagination.total);

			// Always try to load data if we don't have any
			if (!this.currentCategories || this.currentCategories.length === 0) {
				console.log("No categories cached, loading first page...");

				try {
					console.log("Getting total count...");
					const totalCount = await this.pagination.getTotalCount();
					console.log("Total count result:", totalCount);
					console.log("Pagination total:", this.pagination.total);
					console.log("Pagination totalPages:", this.pagination.totalPages);

					if (this.pagination.total === 0) {
						console.log("No categories found in database");
						this.hideLoading();
						return this.renderEmptyState();
					}

					console.log("Getting first page...");
					const paginatedResult = await this.pagination.getFirstPage();
					console.log("First page result:", paginatedResult);
					console.log("Content length:", paginatedResult?.content?.length);
					console.log("Content sample:", paginatedResult?.content?.[0]);

					if (!paginatedResult || !paginatedResult.content) {
						console.error("Invalid pagination result:", paginatedResult);
						this.hideLoading();
						return this.renderError(new Error("Invalid pagination result"));
					}

					this.currentCategories = paginatedResult.content;
					console.log("Categories assigned:", this.currentCategories.length);
				} catch (loadError) {
					console.error("Error loading categories:", loadError);
					this.hideLoading();
					return this.renderError(loadError);
				}
			}

			// Double-check we have categories
			if (!this.currentCategories || this.currentCategories.length === 0) {
				console.log("Still no categories after loading attempt");
				this.hideLoading();
				return this.renderEmptyState();
			}

			console.log("Processing categories with parents...");
			// Process categories to get parent names
			const categoriesWithParents = await Promise.all(
				this.currentCategories.map(async (category) => {
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

			console.log(
				"Categories with parents processed:",
				categoriesWithParents.length
			);

			const container = document.createElement("div");
			container.className = "categories-page";
			const paginationInfo = this.pagination.getPaginationInfo();
			console.log("Pagination info:", paginationInfo);

			const totalCategoriesDisplay = paginationInfo.total;

			container.innerHTML = `
				<div class="d-flex justify-content-between align-items-center mb-4">
					<h1>${this.pageTitle}</h1>
					<div class="d-flex align-items-center gap-3">
						<div class="text-muted">
							<small>Page ${paginationInfo.currentPage} of ${
				paginationInfo.totalPages
			} (${totalCategoriesDisplay} total categories)</small>
						</div>
						<button class="btn btn-primary" id="addCategoryBtn">
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
										<tr data-category-id="${category.id}">
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
													<button type="button" class="btn btn-outline-primary edit-btn" data-category-id="${
														category.id
													}">
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

				<!-- Pagination Controls -->
				${
					paginationInfo.totalPages > 1
						? `
				<div class="d-flex justify-content-between align-items-center mt-4">
					<div class="text-muted">
						Showing ${categoriesWithParents.length} categories on page ${
								paginationInfo.currentPage
						  } of ${Math.max(1, paginationInfo.totalPages)}
					</div>
					<nav aria-label="Categories pagination">
						<ul class="pagination pagination-sm mb-0">
							<li class="page-item ${
								!paginationInfo.hasPrev || paginationInfo.currentPage <= 1
									? "disabled"
									: ""
							}">
								<button class="page-link" id="firstPageBtn">
									<i class="fa fa-angle-double-left"></i> First
								</button>
							</li>
							<li class="page-item ${
								!paginationInfo.hasPrev || paginationInfo.currentPage <= 1
									? "disabled"
									: ""
							}">
								<button class="page-link" id="prevPageBtn">
									<i class="fa fa-angle-left"></i> Previous
								</button>
							</li>
							
							${this.generatePageNumbers(
								paginationInfo.currentPage,
								paginationInfo.totalPages
							)}
							
							<li class="page-item ${
								!paginationInfo.hasNext ||
								paginationInfo.currentPage >= paginationInfo.totalPages
									? "disabled"
									: ""
							}">
								<button class="page-link" id="nextPageBtn">
									Next <i class="fa fa-angle-right"></i>
								</button>
							</li>
							<li class="page-item ${
								!paginationInfo.hasNext ||
								paginationInfo.currentPage >= paginationInfo.totalPages
									? "disabled"
									: ""
							}">
								<button class="page-link" id="lastPageBtn">
									Last <i class="fa fa-angle-double-right"></i>
								</button>
							</li>
						</ul>
					</nav>
				</div>
				`
						: ""
				}
				
				<!-- Category Summary Cards -->
				<div class="row mt-4">
					<div class="col-md-3">
						<div class="card bg-primary text-white">
							<div class="card-body">
								<h5 class="card-title">Total Categories</h5>
								<h3 class="mb-0">${totalCategoriesDisplay}</h3>
							</div>
						</div>
					</div>
					<div class="col-md-3">
						<div class="card bg-success text-white">
							<div class="card-body">
								<h5 class="card-title">Active</h5>
								<h3 class="mb-0">${
									categoriesWithParents.filter((c) => c.status === "active")
										.length
								}</h3>
							</div>
						</div>
					</div>
				</div>
			`;

			this.addEventListeners(container);
			this.addPaginationEventListeners(container);

			console.log("Hiding loading and returning container");
			this.hideLoading();

			console.log("=== RENDER CATEGORIES SUCCESS ===");
			return container;
		} catch (error) {
			console.error("=== RENDER CATEGORIES ERROR ===", error);
			console.error("Error stack:", error.stack);
			this.hideLoading();
			return this.renderError(error);
		}
	}

	generatePageNumbers(currentPage, totalPages) {
		if (totalPages <= 1) {
			return "";
		}

		let pages = "";
		const maxVisiblePages = 5;
		let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
		let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

		// Adjust start page if we don't have enough pages at the end
		if (endPage - startPage + 1 < maxVisiblePages) {
			startPage = Math.max(1, endPage - maxVisiblePages + 1);
		}

		for (let i = startPage; i <= endPage; i++) {
			pages += `
				<li class="page-item ${i === currentPage ? "active" : ""}">
					<button class="page-link page-number-btn" data-page="${i}">
						${i}
					</button>
				</li>
			`;
		}
		return pages;
	}

	async goToPreviousPage() {
		try {
			this.showLoading();
			const result = await this.pagination.getPreviousPage();
			this.currentCategories = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error going to previous page:", error);
			this.hideLoading();
			alert("Failed to load previous page. Please try again.");
		}
	}
	async goToNextPage() {
		try {
			this.showLoading();
			const result = await this.pagination.getNextPage();
			this.currentCategories = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error going to next page:", error);
			this.hideLoading();
			alert("Failed to load next page. Please try again.");
		}
	}
	async goToLastPage() {
		try {
			this.showLoading();
			const paginationInfo = this.pagination.getPaginationInfo();
			if (paginationInfo.totalPages > 0) {
				const result = await this.pagination.goToPage(
					paginationInfo.totalPages
				);
				this.currentCategories = result.content;
				await this.refreshCurrentView();
			}
		} catch (error) {
			console.error("Error going to last page:", error);
			this.hideLoading();
			alert("Failed to load last page. Please try again.");
		}
	}

	async goToPage(pageNumber) {
		try {
			this.showLoading();
			const result = await this.pagination.goToPage(pageNumber);
			this.currentCategories = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error(`Error going to page ${pageNumber}:`, error);
			this.hideLoading();
			alert(`Failed to load page ${pageNumber}. Please try again.`);
		}
	}
	addPaginationEventListeners(container) {
		// First page button
		const firstPageBtn = container.querySelector("#firstPageBtn");
		if (firstPageBtn) {
			firstPageBtn.addEventListener("click", async () => {
				await this.goToFirstPage();
			});
		}

		// Previous page button
		const prevPageBtn = container.querySelector("#prevPageBtn");
		if (prevPageBtn) {
			prevPageBtn.addEventListener("click", async () => {
				await this.goToPreviousPage();
			});
		}

		// Next page button
		const nextPageBtn = container.querySelector("#nextPageBtn");
		if (nextPageBtn) {
			nextPageBtn.addEventListener("click", async () => {
				await this.goToNextPage();
			});
		}

		// Last page button
		const lastPageBtn = container.querySelector("#lastPageBtn");
		if (lastPageBtn) {
			lastPageBtn.addEventListener("click", async () => {
				await this.goToLastPage();
			});
		}

		// Number page buttons
		const pageNumberBtns = container.querySelectorAll(".page-number-btn");
		pageNumberBtns.forEach((btn) => {
			btn.addEventListener("click", async (e) => {
				const pageNumber = parseInt(e.target.getAttribute("data-page"));
				if (pageNumber && pageNumber !== this.pagination.currentPage) {
					await this.goToPage(pageNumber);
				}
			});
		});
	}

	async refreshCurrentView() {
		try {
			console.log("Refreshing current view...");
			const newContainer = await this.renderCategories();
			console.log("New container created:", !!newContainer);

			const mainContent = document.getElementById("main-content");
			console.log("Main content element found:", !!mainContent);

			if (mainContent && newContainer) {
				console.log("Clearing main content and adding new container");
				mainContent.innerHTML = "";
				mainContent.appendChild(newContainer);

				// Force display
				mainContent.style.display = "block";
				mainContent.style.visibility = "visible";

				// Remove any loading overlays that might be blocking the content
				const loadingOverlays = document.querySelectorAll(
					".loading-overlay, .spinner-overlay"
				);
				loadingOverlays.forEach((overlay) => overlay.remove());

				console.log("View refreshed successfully");
			} else {
				console.error("Missing mainContent or newContainer", {
					mainContent: !!mainContent,
					newContainer: !!newContainer,
				});
			}
		} catch (error) {
			console.error("Error refreshing view:", error);
			this.hideLoading();
		}
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
		container.addEventListener("click", (e) => {
			if (e.target.closest(".delete-btn")) {
				const categoryId = e.target
					.closest(".delete-btn")
					.getAttribute("data-category-id");
				this.deleteCategory(categoryId);
			}
		});
	}

	async deleteCategory(categoryId) {
		if (confirm("Are you sure you want to delete this category?")) {
			try {
				await deleteCategoryById(categoryId);
				alert("Category deleted successfully!");
				await this.refreshCurrentView();
			} catch (error) {
				console.error("Error deleting category:", error);
				alert("Failed to delete category. Please try again.");
			}
		}
	}

	renderEmptyState() {
		console.log("Rendering empty state");
		const container = document.createElement("div");
		container.className = "categories-page";
		container.innerHTML = `
			<div class="d-flex justify-content-between align-items-center mb-4">
				<h1>${this.pageTitle}</h1>
				<button class="btn btn-primary">
					<i class="fa fa-plus me-2"></i>Add Category
				</button>
			</div>
			<div class="text-center py-5">
				<div class="mb-3">
					<i class="fa fa-tags fa-3x text-muted"></i>
				</div>
				<h4>No Categories Found</h4>
				<p class="text-muted">Get started by creating your first category.</p>
			</div>
		`;
		return container;
	}

	showLoading() {
		console.log("Showing loading...");
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
		console.log("Hiding loading...");
		const loadingElement = document.getElementById("loading");
		const mainContent = document.getElementById("main-content");

		console.log("Loading element found:", !!loadingElement);
		console.log("Main content found:", !!mainContent);

		if (loadingElement) {
			loadingElement.style.display = "none";
			// Also try removing it completely if it has a remove method
			if (loadingElement.remove && loadingElement.parentNode) {
				console.log("Removing loading element");
				loadingElement.remove();
			}
		}
		if (mainContent) {
			mainContent.style.display = "block";
			console.log("Main content display set to block");
		}

		const allLoadingElements = document.querySelectorAll(
			'[id*="loading"], .loading, .spinner-border'
		);
		console.log("Found loading elements to remove:", allLoadingElements.length);
		allLoadingElements.forEach((el) => {
			if (el && el.style) {
				el.style.display = "none";
			}
		});
	}

	renderError(error) {
		console.log("Rendering error:", error);
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

	cleanup() {
		if (this.actionHandler) {
			document.removeEventListener("change", this.actionHandler);
			this.actionHandler = null;
		}
	}

	async render() {
		console.log("=== CATEGORIES PAGE RENDER START ===");
		this.cleanup();

		try {
			const result = await this.renderCategories();
			console.log("=== CATEGORIES PAGE RENDER END ===");

			// Directly inject into main content if we can find it
			const mainContent = document.getElementById("main-content");
			if (mainContent && result) {
				console.log("Direct injection into main-content");
				mainContent.innerHTML = "";
				mainContent.appendChild(result);
				mainContent.style.display = "block";

				// Make sure loading is completely gone
				this.hideLoading();
			}

			return result;
		} catch (error) {
			console.error("Error in render method:", error);
			this.hideLoading();
			return this.renderError(error);
		}
	}
}
