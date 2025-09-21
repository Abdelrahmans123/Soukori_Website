import { getUserById, updateMultipleOrderStatuses } from "./firebase.js";
import { Pagination } from "../../Pagination/firebase.js";

export class OrdersPage {
	constructor() {
		this.pageTitle = "Orders";
		this.pagePath = "/admin/orders";
		this.pageIcon = "fa fa-shopping-cart";
		this.render = this.render.bind(this);
		this.statusChangeHandler = null;
		this.pagination = new Pagination(10, "orders");
		this.currentOrders = [];
	}

	async renderOrders() {
		this.showLoading();
		try {
			if (this.pagination.currentPage === 1 && this.pagination.total === 0) {
				await this.pagination.getTotalCount();
				const paginatedResult = await this.pagination.getFirstPage();
				this.currentOrders = paginatedResult.content;
			}

			if (!this.currentOrders || this.currentOrders.length === 0) {
				this.hideLoading();
				return this.renderEmptyState();
			}

			const orderItems = [];
			this.currentOrders.forEach((order) => {
				if (
					order.items &&
					Array.isArray(order.items) &&
					order.items.length > 0
				) {
					order.items.forEach((item) => {
						if (item.name || item.productId) {
							orderItems.push({
								orderId: order.id,
								createdAt: order.createdAt,
								status: order.status,
								grandTotal: order.grandTotal,
								productId: item.productId,
								productName: item.name,
								brand: item.brand,
								category: item.category,
								price: item.price,
								quantity: item.quantity,
								total: item.total,
								discount: item.discount,
								variant: item.variant,
								userId: order.userId || null,
							});
						}
					});
				}
			});

			const itemsWithCustomers = await Promise.all(
				orderItems.map(async (item) => {
					if (item.userId) {
						try {
							const user = await getUserById(item.userId);
							return {
								...item,
								customerName: user.name || "Unknown Customer",
							};
						} catch (error) {
							console.warn(`Failed to fetch user ${item.userId}:`, error);
							return {
								...item,
								customerName: "Unknown Customer",
							};
						}
					}
					return { ...item, customerName: "Guest Customer" };
				})
			);

			const validItems = itemsWithCustomers.filter(
				(item) =>
					item.productName &&
					item.productName !== "No items" &&
					item.productName !== "Unknown Product" &&
					item.productName.trim() !== ""
			);

			// If no valid items found, show empty state
			if (validItems.length === 0) {
				return this.renderEmptyState();
			}

			const container = document.createElement("div");
			container.className = "orders-page";

			const paginationInfo = this.pagination.getPaginationInfo();

			container.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1>${this.pageTitle}</h1>
                    <div class="d-flex align-items-center gap-3">
                        <div class="text-muted">
                            <small>Page ${paginationInfo.currentPage} of ${
				paginationInfo.totalPages
			} (${paginationInfo.total} total orders)</small>
                        </div>
                        <div class="changeStatus">
                            <select id="statusFilter" class="form-select">
                                <option value="" selected disabled>Change Status</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="paid">Paid</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Recent Purchases</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th scope="col">
                                            <input type="checkbox" class="form-check-input" id="selectAll">
                                        </th>
                                        <th scope="col">Product</th>
                                        <th scope="col">Order ID</th>
                                        <th scope="col">Date</th>
                                        <th scope="col">Customer Name</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${validItems
																			.map(
																				(item, index) => `
                                        <tr data-order-id="${
																					item.orderId
																				}" data-item-index="${index}">
                                            <td>
                                                <input type="checkbox" class="form-check-input order-checkbox" value="${
																									item.orderId
																								}" data-item-index="${index}">
                                            </td>
                                            <td>
                                                <div class="d-flex align-items-center">
                                                    <div class="bg-light rounded me-2 d-flex align-items-center justify-content-center" 
                                                         style="width: 40px; height: 40px; font-size: 12px;">
                                                        ${(
																													item.productName ||
																													"P"
																												).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div class="fw-medium">${
																													item.productName ||
																													"Unknown Product"
																												}</div>
                                                        <small class="text-muted">
                                                            ${
																															item.brand || ""
																														} ${
																					item.brand ? "•" : ""
																				} 
                                                            ${
																															item.variant
																																? `${
																																		item.variant
																																			.color ||
																																		""
																																  } ${
																																		item.variant
																																			.size ||
																																		""
																																  }`
																																: ""
																														}
                                                            ${
																															item.quantity > 1
																																? `• Qty: ${item.quantity}`
																																: ""
																														}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="text-muted">#${
																									item.orderId
																								}</span>
                                            </td>
                                            <td>
                                                <span class="text-muted">${this.formatDate(
																									item.createdAt
																								)}</span>
                                            </td>
                                            <td>
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar avatar-sm me-2">
                                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
																													item.customerName ||
																														"User"
																												)}&background=random" 
                                                             alt="${
																																item.customerName ||
																																"User"
																															}" 
                                                             class="rounded-circle" 
                                                             width="32" height="32">
                                                    </div>
                                                    <span>${
																											item.customerName ||
																											"Guest Customer"
																										}</span>
                                                </div>
                                            </td>
                                            <td class="status-cell">
                                                ${this.getStatusBadge(
																									item.status
																								)}
                                            </td>
                                            <td>
                                                <div>
                                                    <span class="fw-medium">£${(
																											item.total || 0
																										).toFixed(2)}</span>
                                                    ${
																											item.discount > 0
																												? `
                                                        <div>
                                                            <small class="text-muted text-decoration-line-through">£${(
																															item.price *
																															item.quantity
																														).toFixed(
																															2
																														)}</small>
                                                            <small class="text-success"> -${(
																															item.discount *
																															100
																														).toFixed(
																															0
																														)}%</small>
                                                        </div>
                                                    `
																												: ""
																										}
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
                <div class="d-flex justify-content-between align-items-center mt-4">
                    <div class="text-muted">
                        Showing ${validItems.length} items on page ${
				paginationInfo.currentPage
			} of ${paginationInfo.totalPages}
                    </div>
                    <nav aria-label="Orders pagination">
                        <ul class="pagination pagination-sm mb-0">
                            <li class="page-item ${
															!paginationInfo.hasPrev ? "disabled" : ""
														}">
                                <button class="page-link" id="firstPageBtn" ${
																	!paginationInfo.hasPrev ? "disabled" : ""
																}>
                                    <i class="fa fa-angle-double-left"></i> First
                                </button>
                            </li>
                            <li class="page-item ${
															!paginationInfo.hasPrev ? "disabled" : ""
														}">
                                <button class="page-link" id="prevPageBtn" ${
																	!paginationInfo.hasPrev ? "disabled" : ""
																}>
                                    <i class="fa fa-angle-left"></i> Previous
                                </button>
                            </li>
                            
                            ${this.generatePageNumbers(
															paginationInfo.currentPage,
															paginationInfo.totalPages
														)}
                            
                            <li class="page-item ${
															!paginationInfo.hasNext ? "disabled" : ""
														}">
                                <button class="page-link" id="nextPageBtn" ${
																	!paginationInfo.hasNext ? "disabled" : ""
																}>
                                    Next <i class="fa fa-angle-right"></i>
                                </button>
                            </li>
                            <li class="page-item ${
															!paginationInfo.hasNext ? "disabled" : ""
														}">
                                <button class="page-link" id="lastPageBtn" ${
																	!paginationInfo.hasNext ? "disabled" : ""
																}>
                                    Last <i class="fa fa-angle-double-right"></i>
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
                
                <!-- Order Summary Card -->
                <div class="row mt-4">
                    <div class="col-md-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h5 class="card-title">Total Orders</h5>
                                <h3 class="mb-0">${paginationInfo.total}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h5 class="card-title">Current Page Items</h5>
                                <h3 class="mb-0">${validItems.length}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <h5 class="card-title">Page Revenue</h5>
                                <h3 class="mb-0">£${this.currentOrders
																	.filter((o) => o.items && o.items.length > 0)
																	.reduce(
																		(sum, order) =>
																			sum + (order.grandTotal || 0),
																		0
																	)
																	.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            `;

			// Add event listeners for checkboxes and pagination
			this.addEventListeners(container);
			this.addPaginationEventListeners(container);

			// Hide loading state
			this.hideLoading();

			return container;
		} catch (error) {
			console.error("Error rendering orders:", error);
			return this.renderError(error);
		}
	}

	generatePageNumbers(currentPage, totalPages) {
		let pages = "";
		const maxVisiblePages = 5;
		let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
		let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

		// Adjust start page if we're near the end
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

		// Page number buttons
		const pageNumberBtns = container.querySelectorAll(".page-number-btn");
		pageNumberBtns.forEach((btn) => {
			btn.addEventListener("click", async (e) => {
				const pageNumber = parseInt(e.target.getAttribute("data-page"));
				await this.goToPage(pageNumber);
			});
		});
	}

	async goToFirstPage() {
		try {
			this.showLoading();
			this.pagination.reset();
			await this.pagination.getTotalCount();
			const result = await this.pagination.getFirstPage();
			this.currentOrders = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error going to first page:", error);
			alert("Failed to load first page. Please try again.");
		}
	}

	async goToPreviousPage() {
		try {
			this.showLoading();
			const result = await this.pagination.getPreviousPage();
			this.currentOrders = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error going to previous page:", error);
			alert("Failed to load previous page. Please try again.");
		}
	}

	async goToNextPage() {
		try {
			this.showLoading();
			const result = await this.pagination.getNextPage();
			this.currentOrders = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error going to next page:", error);
			alert("Failed to load next page. Please try again.");
		}
	}

	async goToLastPage() {
		try {
			this.showLoading();
			const paginationInfo = this.pagination.getPaginationInfo();
			const result = await this.pagination.goToPage(paginationInfo.totalPages);
			this.currentOrders = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error going to last page:", error);
			alert("Failed to load last page. Please try again.");
		}
	}

	async goToPage(pageNumber) {
		try {
			this.showLoading();
			const result = await this.pagination.goToPage(pageNumber);
			this.currentOrders = result.content;
			await this.refreshCurrentView();
		} catch (error) {
			console.error(`Error going to page ${pageNumber}:`, error);
			alert(`Failed to load page ${pageNumber}. Please try again.`);
		}
	}

	async refreshCurrentView() {
		try {
			const newContainer = await this.renderOrders();
			const mainContent = document.getElementById("main-content");
			if (mainContent) {
				mainContent.innerHTML = "";
				mainContent.appendChild(newContainer);
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
			case "delivered":
				return '<span class="badge bg-success">● Delivered</span>';
			case "pending":
				return '<span class="badge bg-warning">● Pending</span>';
			case "cancelled":
				return '<span class="badge bg-danger">● Cancelled</span>';
			case "processing":
				return '<span class="badge bg-info">● Processing</span>';
			case "shipped":
				return '<span class="badge bg-primary">● Shipped</span>';
			case "paid":
				return '<span class="badge bg-success">● Paid</span>';
			case "refunded":
				return '<span class="badge bg-secondary">● Refunded</span>';
			default:
				return '<span class="badge bg-secondary">● Unknown</span>';
		}
	}

	addEventListeners(container) {
		// Handle select all checkbox
		const selectAllCheckbox = container.querySelector("#selectAll");
		const getItemCheckboxes = () =>
			container.querySelectorAll(".order-checkbox");

		if (selectAllCheckbox) {
			selectAllCheckbox.addEventListener("change", (e) => {
				const itemCheckboxes = getItemCheckboxes();
				itemCheckboxes.forEach((checkbox) => {
					checkbox.checked = e.target.checked;
				});
			});
		}

		// Handle individual checkboxes using event delegation
		container.addEventListener("change", (e) => {
			if (e.target.classList.contains("order-checkbox")) {
				const itemCheckboxes = getItemCheckboxes();
				const checkedBoxes = container.querySelectorAll(
					".order-checkbox:checked"
				);

				if (selectAllCheckbox) {
					selectAllCheckbox.checked =
						checkedBoxes.length === itemCheckboxes.length;
					selectAllCheckbox.indeterminate =
						checkedBoxes.length > 0 &&
						checkedBoxes.length < itemCheckboxes.length;
				}
			}
		});

		this.statusChangeHandler = async (e) => {
			if (e.target && e.target.id === "statusFilter") {
				const newStatus = e.target.value;
				const checkedBoxes = container.querySelectorAll(
					".order-checkbox:checked"
				);
				const selectedItems = Array.from(checkedBoxes).map((cb) => ({
					orderId: cb.value,
					itemIndex: cb.getAttribute("data-item-index"),
				}));
				const uniqueOrderIds = [
					...new Set(selectedItems.map((item) => item.orderId)),
				];

				try {
					e.target.disabled = true;
					await updateMultipleOrderStatuses(uniqueOrderIds, newStatus);
					selectedItems.forEach((item) => {
						const row = container.querySelector(
							`tr[data-order-id="${item.orderId}"][data-item-index="${item.itemIndex}"]`
						);
						if (row) {
							const statusCell = row.querySelector(".status-cell");
							if (statusCell) {
								statusCell.innerHTML = this.getStatusBadge(newStatus);
							}

							const checkbox = row.querySelector(".order-checkbox");
							if (checkbox) {
								checkbox.checked = false;
							}
						}
					});

					if (selectAllCheckbox) {
						selectAllCheckbox.checked = false;
						selectAllCheckbox.indeterminate = false;
					}

					this.showSuccessMessage(
						`Successfully updated ${selectedItems.length} item(s) in ${uniqueOrderIds.length} order(s) to ${newStatus}`
					);
				} catch (error) {
					console.error("Error updating order statuses:", error);
					alert("Failed to update order statuses. Please try again.");
				} finally {
					e.target.disabled = false;
					e.target.value = "";
				}
			}
		};

		document.addEventListener("change", this.statusChangeHandler);
	}

	showSuccessMessage(message) {
		const alertDiv = document.createElement("div");
		alertDiv.className = "alert alert-success alert-dismissible fade show mt-3";
		alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

		const container = document.querySelector(".orders-page");
		if (container) {
			container.insertBefore(alertDiv, container.firstChild.nextSibling);

			setTimeout(() => {
				if (alertDiv && alertDiv.parentNode) {
					alertDiv.remove();
				}
			}, 3000);
		}
	}

	renderEmptyState() {
		const container = document.createElement("div");
		container.className = "orders-page";
		container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1>${this.pageTitle}</h1>
            </div>
            <div class="text-center py-5">
                <div class="mb-3">
                    <i class="fa fa-shopping-cart fa-3x text-muted"></i>
                </div>
                <h4>No Orders Found</h4>
                <p class="text-muted">There are no orders to display at the moment.</p>
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
			if (loadingElement.remove) {
				loadingElement.remove();
			}
		}
		if (mainContent) {
			mainContent.style.display = "block";
		}
	}

	renderError(error) {
		const container = document.createElement("div");
		container.className = "orders-page";
		container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Error Loading Orders</h4>
                <p>There was a problem loading the orders. Please try again later.</p>
                ${
									error
										? `<small class="text-muted">Error: ${error.message}</small>`
										: ""
								}
            </div>
        `;
		return container;
	}

	cleanup() {
		if (this.statusChangeHandler) {
			document.removeEventListener("change", this.statusChangeHandler);
			this.statusChangeHandler = null;
		}
	}

	async render() {
		this.cleanup();
		return await this.renderOrders();
	}
}
