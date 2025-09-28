import {
	deleteReviewById,
	updateReview,
	updateReviewStatus,
	addReviewReply,
	getReviewStats,
	getUserById,
	getProductById,
} from "./firebase.js";
import { Pagination } from "../../Pagination/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
const auth = getAuth();

export class ReviewsPage {
	constructor() {
		this.pageTitle = "Reviews";
		this.pagePath = "/admin/reviews";
		this.pageIcon = "fa fa-star";
		this.render = this.render.bind(this);
		this.statusChangeHandler = null;
		this.actionHandler = null;
		this.currentReviews = [];
		this.reviewStats = null;
		this.pagination = new Pagination(10, "reviews");
	}

	async renderReviews() {
		console.log("=== RENDER REVIEWS START ===");
		this.showLoading();

		try {
			// Load stats first
			if (!this.reviewStats) {
				console.log("Loading review stats...");
				this.reviewStats = await getReviewStats();
				console.log("Stats loaded:", this.reviewStats);
			}

			// Load data if we don't have any cached
			if (!this.currentReviews || this.currentReviews.length === 0) {
				console.log("No reviews cached, loading first page...");

				try {
					console.log("Getting total count...");
					const totalCount = await this.pagination.getTotalCount();
					console.log("Total count result:", totalCount);

					if (this.pagination.total === 0) {
						console.log("No reviews found in database");
						this.hideLoading();
						return this.renderEmptyState();
					}

					console.log("Getting first page...");
					const paginatedResult = await this.pagination.getFirstPage();
					console.log("First page result:", paginatedResult);

					if (!paginatedResult || !paginatedResult.content) {
						console.error("Invalid pagination result:", paginatedResult);
						this.hideLoading();
						return this.renderError(new Error("Invalid pagination result"));
					}

					this.currentReviews = paginatedResult.content;
					console.log("Reviews assigned:", this.currentReviews.length);
				} catch (loadError) {
					console.error("Error loading reviews:", loadError);
					this.hideLoading();
					return this.renderError(loadError);
				}
			}

			// Double-check we have reviews
			if (!this.currentReviews || this.currentReviews.length === 0) {
				console.log("Still no reviews after loading attempt");
				this.hideLoading();
				return this.renderEmptyState();
			}

			console.log("Processing reviews with user and product data...");

			// Fetch user and product data for each review
			const reviewsWithDetails = await Promise.all(
				this.currentReviews.map(async (review) => {
					const [user, product] = await Promise.all([
						getUserById(review.userId),
						getProductById(review.productId),
					]);

					return {
						...review,
						userName: user?.name || review.userId || "Anonymous User",
						userEmail: user?.email || "",
						productName:
							product?.name || review.title || `Product ${review.productId}`,
						productImage: product?.image || "",
					};
				})
			);

			console.log("Reviews with details processed:", reviewsWithDetails.length);

			const container = document.createElement("div");
			container.className = "reviews-page";
			const paginationInfo = this.pagination.getPaginationInfo();
			console.log("Pagination info:", paginationInfo);

			const totalReviewsDisplay = paginationInfo.total;

			// Generate modals with enhanced data
			const editModalsHTML = reviewsWithDetails
				.map((review) => this.generateEditModal(review))
				.join("");

			const showModalsHTML = reviewsWithDetails
				.map((review) => this.generateShowModal(review))
				.join("");

			const replyModalsHTML = reviewsWithDetails
				.map((review) => this.generateReplyModal(review))
				.join("");

			container.innerHTML = `
			<div class="d-flex justify-content-between align-items-center mb-4">
				<h1>${this.pageTitle}</h1>
				<div class="d-flex align-items-center gap-3">
					<div class="text-muted">
						<small>Page ${paginationInfo.currentPage} of ${
				paginationInfo.totalPages
			} (${totalReviewsDisplay} total reviews)</small>
					</div>
					<div class="bulk-actions">
						<select id="bulkAction" class="form-select">
							<option value="" selected disabled>Bulk Actions</option>
							<option value="approved">Mark as Approved</option>
							<option value="pending">Mark as Pending</option>
							<option value="flagged">Mark as Flagged</option>
							<option value="delete">Delete</option>
						</select>
					</div>
					<div class="filter-dropdown">
						<select id="statusFilter" class="form-select">
							<option value="">All Reviews</option>
							<option value="approved">Approved</option>
							<option value="pending">Pending</option>
							<option value="flagged">Flagged</option>
						</select>
					</div>
				</div>
			</div>

			
			
			<div class="card">
				<div class="card-header">
					<h5 class="mb-0">All Reviews</h5>
				</div>
				<div class="card-body p-0">
					<div class="table-responsive">
						<table class="table table-hover mb-0">
							<thead class="table-light">
								<tr>
									<th scope="col">
										<input type="checkbox" class="form-check-input" id="selectAll">
									</th>
									<th scope="col">Customer</th>
									<th scope="col">Product</th>
									<th scope="col">Rating</th>
									<th scope="col">Review</th>
									<th scope="col">Status</th>
									<th scope="col">Date</th>
									<th scope="col">Actions</th>
								</tr>
							</thead>
							<tbody>
								${reviewsWithDetails
									.map((review, index) => this.generateReviewRow(review, index))
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
					Showing ${reviewsWithDetails.length} reviews on page ${
							paginationInfo.currentPage
					  } of ${Math.max(1, paginationInfo.totalPages)}
				</div>
				<nav aria-label="Reviews pagination">
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
            <!-- Stats Cards -->
			<div class="row mt-4">
				<div class="col-md-3">
					<div class="card bg-primary text-white">
						<div class="card-body">
							<h5 class="card-title">Total Reviews</h5>
							<h3 class="mb-0">${this.reviewStats?.total || 0}</h3>
						</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="card bg-success text-white">
						<div class="card-body">
							<h5 class="card-title">Approved</h5>
							<h3 class="mb-0">${this.reviewStats?.approved || 0}</h3>
						</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="card bg-warning text-white">
						<div class="card-body">
							<h5 class="card-title">Pending</h5>
							<h3 class="mb-0">${this.reviewStats?.pending || 0}</h3>
						</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="card bg-info text-white">
						<div class="card-body">
							<h5 class="card-title">Average Rating</h5>
							<h3 class="mb-0">${this.reviewStats?.averageRating || 0}/5</h3>
						</div>
					</div>
				</div>
			</div>
			`
					: ""
			}

			<!-- Modals -->
			${editModalsHTML}
			${showModalsHTML}
			${replyModalsHTML}
		`;

			this.addEventListeners(container);
			this.addPaginationEventListeners(container);

			console.log("Hiding loading and returning container");
			this.hideLoading();

			console.log("=== RENDER REVIEWS SUCCESS ===");
			return container;
		} catch (error) {
			console.error("=== RENDER REVIEWS ERROR ===", error);
			console.error("Error stack:", error.stack);
			this.hideLoading();
			return this.renderError(error);
		}
	}

	// ========== PAGINATION METHODS ==========

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

	async goToFirstPage() {
		try {
			this.showLoading();
			this.pagination.reset();
			await this.pagination.getTotalCount();
			const result = await this.pagination.getFirstPage();
			this.currentReviews = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error going to first page:", error);
			this.hideLoading();
			alert("Failed to load first page. Please try again.");
		}
	}

	async goToPreviousPage() {
		try {
			this.showLoading();
			const result = await this.pagination.getPreviousPage();
			this.currentReviews = result.content;
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
			this.currentReviews = result.content;
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
				this.currentReviews = result.content;
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
			this.currentReviews = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error(`Error going to page ${pageNumber}:`, error);
			this.hideLoading();
			alert(`Failed to load page ${pageNumber}. Please try again.`);
		}
	}

	async refreshCurrentView() {
		try {
			console.log("Refreshing current view...");
			const newContainer = await this.renderReviews();
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

				// Remove any loading overlays
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

	// ========== EVENT LISTENERS ==========

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

	addEventListeners(container) {
		// Handle select all checkbox
		const selectAllCheckbox = container.querySelector("#selectAll");
		const getReviewCheckboxes = () =>
			container.querySelectorAll(".review-checkbox");

		if (selectAllCheckbox) {
			selectAllCheckbox.addEventListener("change", (e) => {
				const reviewCheckboxes = getReviewCheckboxes();
				reviewCheckboxes.forEach((checkbox) => {
					checkbox.checked = e.target.checked;
				});
			});
		}

		// Handle individual checkboxes
		container.addEventListener("change", (e) => {
			if (e.target.classList.contains("review-checkbox")) {
				const reviewCheckboxes = getReviewCheckboxes();
				const checkedBoxes = container.querySelectorAll(
					".review-checkbox:checked"
				);

				if (selectAllCheckbox) {
					selectAllCheckbox.checked =
						checkedBoxes.length === reviewCheckboxes.length;
					selectAllCheckbox.indeterminate =
						checkedBoxes.length > 0 &&
						checkedBoxes.length < reviewCheckboxes.length;
				}
			}
		});

		// Handle update review buttons
		container.addEventListener("click", (e) => {
			if (e.target.id && e.target.id.startsWith("updateReviewBtn")) {
				const reviewId = e.target.getAttribute("data-review-id");
				this.updateReview(reviewId, container);
			} else if (e.target.id && e.target.id.startsWith("replyReviewBtn")) {
				const reviewId = e.target.getAttribute("data-review-id");
				this.replyToReview(reviewId, container);
			} else if (e.target.closest(".delete-btn")) {
				const reviewId = e.target
					.closest(".delete-btn")
					.getAttribute("data-review-id");
				this.deleteReview(reviewId);
			}
		});

		// Handle bulk actions
		this.actionHandler = async (e) => {
			if (e.target && e.target.id === "bulkAction") {
				const action = e.target.value;
				const checkedBoxes = container.querySelectorAll(
					".review-checkbox:checked"
				);
				const selectedReviews = Array.from(checkedBoxes).map((cb) => ({
					reviewId: cb.value,
					reviewIndex: cb.getAttribute("data-review-index"),
				}));

				if (selectedReviews.length === 0) {
					alert("Please select reviews to perform bulk action.");
					e.target.value = "";
					return;
				}

				const confirmMessage = `Are you sure you want to ${action} ${selectedReviews.length} review(s)?`;
				if (!confirm(confirmMessage)) {
					e.target.value = "";
					return;
				}

				try {
					e.target.disabled = true;
					const reviewIds = selectedReviews.map((item) => item.reviewId);

					switch (action) {
						case "approved":
							await Promise.all(
								reviewIds.map((id) => updateReviewStatus(id, "approved"))
							);
							this.updateReviewRows(container, selectedReviews, "approved");
							break;
						case "pending":
							await Promise.all(
								reviewIds.map((id) => updateReviewStatus(id, "pending"))
							);
							this.updateReviewRows(container, selectedReviews, "pending");
							break;
						case "flagged":
							await Promise.all(
								reviewIds.map((id) => updateReviewStatus(id, "flagged"))
							);
							this.updateReviewRows(container, selectedReviews, "flagged");
							break;
						case "delete":
							await Promise.all(reviewIds.map((id) => deleteReviewById(id)));
							this.removeReviewRows(container, selectedReviews);
							break;
					}

					// Reset checkboxes
					if (selectAllCheckbox) {
						selectAllCheckbox.checked = false;
						selectAllCheckbox.indeterminate = false;
					}

					this.showSuccessMessage(
						`Successfully ${action}d ${selectedReviews.length} review(s)`
					);
				} catch (error) {
					console.error(`Error performing bulk ${action}:`, error);
					alert(`Failed to ${action} reviews. Please try again.`);
				} finally {
					e.target.disabled = false;
					e.target.value = "";
				}
			}
		};

		document.addEventListener("change", this.actionHandler);
	}

	// ========== HTML GENERATORS ==========

	generateReviewRow(review, index) {
		return `
		<tr data-review-id="${review.id}" data-review-index="${index}">
			<td>
				<input type="checkbox" class="form-check-input review-checkbox" value="${
					review.id
				}" data-review-index="${index}">
			</td>
			<td>
				<div class="d-flex align-items-center">
					<div class="bg-light rounded me-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-size: 14px; font-weight: 600;">
						${(review.userName || "U").charAt(0).toUpperCase()}
					</div>
					<div>
						<div class="fw-medium">${review.userName || "Anonymous User"}</div>
						<small class="text-muted">${review.userEmail || review.userId}</small>
					</div>
				</div>
			</td>
			<td>
				<div class="d-flex align-items-center">
					${
						review.productImage
							? `
						<img src="${review.productImage}" alt="Product" class="me-2 rounded" style="width: 32px; height: 32px; object-fit: cover;">
					`
							: `
						<div class="bg-light rounded me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 10px;">
							<i class="fa fa-cube text-muted"></i>
						</div>
					`
					}
					<div>
						<div class="fw-medium">${review.productName}</div>
						<small class="text-muted">ID: ${review.productId}</small>
					</div>
				</div>
			</td>
			<td>
				${this.generateStars(review.rating)}
				<span class="text-muted ms-1">(${review.rating}/5)</span>
			</td>
			<td>
				<div class="review-text" style="max-width: 200px;">
					<div class="text-truncate">${review.comment || "No comment"}</div>
					${
						review.comment && review.comment.length > 50
							? `<small class="text-muted">...</small>`
							: ""
					}
				</div>
			</td>
			<td class="status-cell">
				${this.getStatusBadge(review.status)}
			</td>
			<td>
				<span class="text-muted">${this.formatDate(review.createdAt)}</span>
			</td>
			<td>
				<div class="btn-group btn-group-sm">
					<button type="button" class="btn btn-outline-info view-btn" data-bs-toggle="modal" 
						data-bs-target="#showReviewModal${review.id}" 
						data-review-id="${review.id}" 
						title="View Details">
						<i class="fa fa-eye"></i>
					</button>
					<button type="button" class="btn btn-outline-primary edit-btn" data-bs-toggle="modal" 
						data-bs-target="#editReviewModal${review.id}" 
						data-review-id="${review.id}">
						<i class="fa fa-edit"></i>
					</button>
					<button type="button" class="btn btn-outline-success reply-btn" data-bs-toggle="modal" 
						data-bs-target="#replyReviewModal${review.id}" 
						data-review-id="${review.id}" 
						title="Reply to Review">
						<i class="fa fa-reply"></i>
					</button>
					<button type="button" class="btn btn-outline-danger delete-btn" data-review-id="${
						review.id
					}">
						<i class="fa fa-trash"></i>
					</button>
				</div>
			</td>
		</tr>
	`;
	}
	generateEditModal(review) {
		return `
			<div class="modal fade" id="editReviewModal${review.id}" tabindex="-1">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h1 class="modal-title fs-5">Edit Review</h1>
							<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
						</div>
						<div class="modal-body">
							<form id="editReviewForm${review.id}">
								<input type="hidden" value="${review.id}" name="id" />
								<div class="row">
									<div class="col-md-6">
										<div class="mb-3">
											<label class="form-label">Status *</label>
											<select class="form-select" name="status" required>
												<option value="pending" ${
													review.status === "pending" ? "selected" : ""
												}>Pending Review</option>
												<option value="approved" ${
													review.status === "approved" ? "selected" : ""
												}>Approved</option>
												<option value="flagged" ${
													review.status === "flagged" ? "selected" : ""
												}>Flagged</option>
											</select>
										</div>
									</div>
									<div class="col-md-6">
										<div class="mb-3">
											<label class="form-label">Rating</label>
											<select class="form-select" name="rating">
												<option value="1" ${review.rating === 1 ? "selected" : ""}>1 Star</option>
												<option value="2" ${review.rating === 2 ? "selected" : ""}>2 Stars</option>
												<option value="3" ${review.rating === 3 ? "selected" : ""}>3 Stars</option>
												<option value="4" ${review.rating === 4 ? "selected" : ""}>4 Stars</option>
												<option value="5" ${review.rating === 5 ? "selected" : ""}>5 Stars</option>
											</select>
										</div>
									</div>
								</div>
								<div class="mb-3">
									<label class="form-label">Review Comment</label>
									<textarea class="form-control" name="comment" rows="4">${
										review.comment || ""
									}</textarea>
								</div>
								<div class="mb-3">
									<label class="form-label">Admin Notes</label>
									<textarea class="form-control" name="adminNotes" rows="3" placeholder="Internal notes (not visible to customers)">${
										review.adminNotes || ""
									}</textarea>
								</div>
							</form>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
							<button type="button" class="btn btn-primary" id="updateReviewBtn${
								review.id
							}" data-review-id="${review.id}">
								<span class="spinner-border spinner-border-sm d-none me-2"></span>
								Update Review
							</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	generateShowModal(review) {
		return `
		<div class="modal fade" id="showReviewModal${review.id}" tabindex="-1">
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header">
						<h1 class="modal-title fs-5">Review Details</h1>
						<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
					</div>
					<div class="modal-body">
						<div class="row">
							<div class="col-md-6">
								<h6>Customer Information</h6>
								<p><strong>Name:</strong> ${review.userName || "Anonymous User"}</p>
								<p><strong>Email:</strong> ${review.userEmail || "N/A"}</p>
								<p><strong>User ID:</strong> ${review.userId || "N/A"}</p>
								<p><strong>Order ID:</strong> ${review.orderId || "N/A"}</p>
							</div>
							<div class="col-md-6">
								<h6>Product Information</h6>
								<p><strong>Product:</strong> ${review.productName}</p>
								<p><strong>Product ID:</strong> ${review.productId}</p>
								${
									review.productImage
										? `
									<img src="${review.productImage}" alt="Product" class="img-thumbnail mt-2" style="max-width: 100px;">
								`
										: ""
								}
							</div>
						</div>
						<hr>
						<div class="row">
							<div class="col-md-6">
								<h6>Review Details</h6>
								<p><strong>Rating:</strong> ${this.generateStars(review.rating)} (${
			review.rating
		}/5)</p>
								<p><strong>Status:</strong> ${this.getStatusBadge(review.status)}</p>
							</div>
							<div class="col-md-6">
								<h6>Dates</h6>
								<p><strong>Created:</strong> ${this.formatFirebaseDate(review.createdAt)}</p>
							</div>
						</div>
						<hr>
						<h6>Review Comment</h6>
						<p class="bg-light p-3 rounded">${review.comment || "No comment provided"}</p>
						
						${
							review.replies && review.replies.length > 0
								? `
							<hr>
							<h6>Replies</h6>
							${review.replies
								.map(
									(reply) => `
								<div class="bg-light p-3 rounded mb-2">
									<small class="text-muted">${reply.authorName} - ${new Date(
										reply.timestamp
									).toLocaleString()}</small>
									<p class="mb-0 mt-1">${reply.message}</p>
								</div>
							`
								)
								.join("")}
						`
								: ""
						}
						
						${
							review.adminNotes
								? `
							<hr>
							<h6>Admin Notes</h6>
							<p class="bg-warning bg-opacity-10 p-3 rounded">${review.adminNotes}</p>
						`
								: ""
						}
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
					</div>
				</div>
			</div>
		</div>
	`;
	}

	generateReplyModal(review) {
		return `
		<div class="modal fade" id="replyReviewModal${review.id}" tabindex="-1">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h1 class="modal-title fs-5">Reply to Review</h1>
						<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
					</div>
					<div class="modal-body">
						<div class="mb-3">
							<h6>Original Review</h6>
							<div class="bg-light p-3 rounded">
								<div class="d-flex align-items-center mb-2">
									<strong>${review.userName || review.userId || "Anonymous"}</strong>
									<span class="ms-2">${this.generateStars(review.rating)}</span>
								</div>
								<p class="mb-1"><strong>Product:</strong> ${review.productName}</p>
								<p class="mb-0">${review.comment || "No comment"}</p>
							</div>
						</div>
						<form id="replyReviewForm${review.id}">
							<input type="hidden" value="${review.id}" name="reviewId" />
							<div class="mb-3">
								<label for="authorName${review.id}" class="form-label">Reply As *</label>
								<input type="text" class="form-control" id="authorName${
									review.id
								}" name="authorName" value="Store Manager" required>
							</div>
							<div class="mb-3">
								<label for="message${review.id}" class="form-label">Reply Message *</label>
								<textarea class="form-control" id="message${
									review.id
								}" name="message" rows="4" required placeholder="Thank you for your feedback..."></textarea>
							</div>
						</form>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
						<button type="button" class="btn btn-primary" id="replyReviewBtn${
							review.id
						}" data-review-id="${review.id}">
							<span class="spinner-border spinner-border-sm d-none me-2"></span>
							Send Reply
						</button>
					</div>
				</div>
			</div>
		</div>
	`;
	}

	// ========== UTILITY METHODS ==========

	generateStars(rating) {
		const stars = [];
		for (let i = 1; i <= 5; i++) {
			if (i <= rating) {
				stars.push('<i class="fa fa-star text-warning"></i>');
			} else {
				stars.push('<i class="fa fa-star-o text-muted"></i>');
			}
		}
		return stars.join("");
	}

	getStatusBadge(status) {
		switch (status?.toLowerCase()) {
			case "approved":
				return '<span class="badge bg-success">● Approved</span>';
			case "pending":
				return '<span class="badge bg-warning">● Pending</span>';
			case "flagged":
			case "rejected":
				return '<span class="badge bg-danger">● Flagged</span>';
			case "archived":
				return '<span class="badge bg-secondary">● Archived</span>';
			default:
				return '<span class="badge bg-secondary">● Unknown</span>';
		}
	}

	formatFirebaseDate(dateValue) {
		if (!dateValue) return "N/A";
		try {
			let date;
			// Handle Firestore Timestamp objects
			if (dateValue && typeof dateValue.toDate === "function") {
				date = dateValue.toDate();
			} else if (dateValue && typeof dateValue.seconds === "number") {
				date = new Date(dateValue.seconds * 1000);
			} else if (typeof dateValue === "string") {
				date = new Date(dateValue);
			} else if (dateValue instanceof Date) {
				date = dateValue;
			} else {
				return "Invalid Date";
			}

			if (isNaN(date.getTime())) {
				return "Invalid Date";
			}

			return date.toLocaleString("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch (error) {
			console.error("Error formatting Firebase date:", error);
			return "Invalid Date";
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

	// ========== CRUD OPERATIONS ==========

	async updateReview(reviewId, container) {
		const form = container.querySelector(`#editReviewForm${reviewId}`);
		const updateBtn = container.querySelector(`#updateReviewBtn${reviewId}`);
		const spinner = updateBtn.querySelector(".spinner-border");

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const formData = new FormData(form);
		const updateData = {
			status: formData.get("status"),
			rating: parseInt(formData.get("rating")),
			comment: formData.get("comment"),
			adminNotes: formData.get("adminNotes"),
			updatedAt: new Date().toISOString(),
		};

		try {
			updateBtn.disabled = true;
			spinner.classList.remove("d-none");

			await updateReview(reviewId, updateData);

			// Update the table row without full page refresh
			await this.updateReviewRow(reviewId, updateData, container);

			// Close modal
			const modal = bootstrap.Modal.getInstance(
				container.querySelector(`#editReviewModal${reviewId}`)
			);
			if (modal) {
				modal.hide();
			}

			this.showSuccessMessage("Review updated successfully!");
		} catch (error) {
			console.error("Error updating review:", error);
			alert("Failed to update review. Please try again.");
		} finally {
			updateBtn.disabled = false;
			spinner.classList.add("d-none");
		}
	}

	async replyToReview(reviewId, container) {
		const form = container.querySelector(`#replyReviewForm${reviewId}`);
		const replyBtn = container.querySelector(`#replyReviewBtn${reviewId}`);
		const spinner = replyBtn.querySelector(".spinner-border");

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const formData = new FormData(form);
		const replyData = {
			authorName: formData.get("authorName"),
			message: formData.get("message"),
			authorType: "admin",
		};

		try {
			replyBtn.disabled = true;
			spinner.classList.remove("d-none");

			await addReviewReply(reviewId, replyData);

			// Reset form
			form.reset();

			// Close modal
			const modal = bootstrap.Modal.getInstance(
				container.querySelector(`#replyReviewModal${reviewId}`)
			);
			if (modal) {
				modal.hide();
			}

			this.showSuccessMessage("Reply sent successfully!");

			// Refresh the current view to show the reply
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error replying to review:", error);
			alert("Failed to send reply. Please try again.");
		} finally {
			replyBtn.disabled = false;
			spinner.classList.add("d-none");
		}
	}

	async updateReviewRow(reviewId, updatedData, container) {
		const row = container.querySelector(`tr[data-review-id="${reviewId}"]`);
		if (!row) return;

		// Update the row content
		const ratingCell = row.children[3]; // Rating column
		const statusCell = row.children[5]; // Status column

		// Update rating
		ratingCell.innerHTML = `
			${this.generateStars(updatedData.rating)}
			<span class="text-muted ms-1">(${updatedData.rating}/5)</span>
		`;

		// Update status
		statusCell.innerHTML = this.getStatusBadge(updatedData.status);
	}

	updateReviewRows(container, selectedReviews, newStatus) {
		selectedReviews.forEach((item) => {
			const row = container.querySelector(
				`tr[data-review-id="${item.reviewId}"][data-review-index="${item.reviewIndex}"]`
			);
			if (row) {
				const statusCell = row.querySelector(".status-cell");
				if (statusCell) {
					statusCell.innerHTML = this.getStatusBadge(newStatus);
				}

				// Uncheck the checkbox
				const checkbox = row.querySelector(".review-checkbox");
				if (checkbox) {
					checkbox.checked = false;
				}
			}
		});
	}

	removeReviewRows(container, selectedReviews) {
		selectedReviews.forEach((item) => {
			const row = container.querySelector(
				`tr[data-review-id="${item.reviewId}"][data-review-index="${item.reviewIndex}"]`
			);
			if (row) {
				row.remove();
			}
		});
	}

	async deleteReview(reviewId) {
		console.log("Attempting to delete review:", reviewId);

		if (!reviewId) {
			console.error("No review ID provided for deletion");
			this.showErrorAlert("Invalid review ID. Please try again.");
			return;
		}

		// Find the review details for the confirmation message
		const reviewToDelete = this.currentReviews.find(
			(review) => review.id === reviewId
		);
		const reviewInfo = reviewToDelete
			? `"${reviewToDelete.comment?.substring(0, 50)}..." by ${
					reviewToDelete.userName || reviewToDelete.userId || "Anonymous"
			  }`
			: "this review";

		const result = await Swal.fire({
			title: "Are you sure?",
			text: `You are about to permanently delete ${reviewInfo}. This action cannot be undone.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Yes, delete it!",
			cancelButtonText: "No, cancel!",
			confirmButtonColor: "#d33",
			cancelButtonColor: "#6c757d",
		});

		if (result.isConfirmed) {
			try {
				// Show loading state
				Swal.fire({
					title: "Deleting...",
					text: "Please wait while we delete the review.",
					allowOutsideClick: false,
					showConfirmButton: false,
					willOpen: () => {
						Swal.showLoading();
					},
				});

				console.log("Calling deleteReviewById with ID:", reviewId);
				await deleteReviewById(reviewId);

				// Remove from current reviews array immediately
				this.currentReviews = this.currentReviews.filter(
					(review) => review.id !== reviewId
				);

				console.log("Review deleted successfully, updating view...");

				// Close any loading dialogs
				Swal.close();

				// Show success message
				this.showSuccessAlert("Review deleted successfully!");

				// Refresh the entire view to ensure consistency
				const newContainer = await this.renderReviews();
				const mainContent = document.getElementById("main-content");

				if (mainContent && newContainer) {
					console.log("Updating main content with new container");
					mainContent.innerHTML = "";
					mainContent.appendChild(newContainer);

					// Ensure the content is visible
					mainContent.style.display = "block";
					mainContent.style.visibility = "visible";
				} else {
					console.error("Failed to update main content", {
						mainContent: !!mainContent,
						newContainer: !!newContainer,
					});
				}
			} catch (error) {
				console.error("Error deleting review:", error);
				Swal.close(); // Close any loading dialogs
				this.showErrorAlert("Failed to delete review. Please try again.");
			}
		}
	}
	showSuccessMessage(message) {
		this.showSuccessAlert(message);
	}
	showSuccessAlert(message) {
		Swal.fire({
			title: "Success!",
			text: message,
			icon: "success",
			confirmButtonText: "OK",
		});
	}

	// ========== EMPTY STATE & ERROR HANDLING ==========

	renderEmptyState() {
		const container = document.createElement("div");
		container.className = "reviews-page";
		container.innerHTML = `
			<div class="d-flex justify-content-between align-items-center mb-4">
				<h1>${this.pageTitle}</h1>
			</div>
			<div class="text-center py-5">
				<div class="mb-3">
					<i class="fa fa-star-o fa-3x text-muted"></i>
				</div>
				<h4>No Reviews Found</h4>
				<p class="text-muted">Reviews will appear here once customers start leaving feedback on your products.</p>
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

		if (loadingElement) {
			loadingElement.style.display = "none";
			if (loadingElement.remove && loadingElement.parentNode) {
				loadingElement.remove();
			}
		}
		if (mainContent) {
			mainContent.style.display = "block";
		}

		const allLoadingElements = document.querySelectorAll(
			'[id*="loading"], .loading, .spinner-border'
		);
		allLoadingElements.forEach((el) => {
			if (el && el.style) {
				el.style.display = "none";
			}
		});
	}

	renderError(error) {
		const container = document.createElement("div");
		container.className = "reviews-page";
		container.innerHTML = `
			<div class="alert alert-danger" role="alert">
				<h4 class="alert-heading">Error Loading Reviews</h4>
				<p>There was a problem loading the reviews. Please try again later.</p>
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

		console.log("=== REVIEWS PAGE RENDER START ===");
		const result = await this.renderReviews();
		console.log("=== REVIEWS PAGE RENDER END ===");

		// Direct injection into main content if we can find it
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
	}
}
