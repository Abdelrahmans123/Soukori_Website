import {
    getAllOrders,
    getProductById,
    getUserById,
    updateMultipleOrderStatuses,
    updateOrderStatus,
} from "./firebase.js";

export class OrdersPage {
    constructor() {
        this.pageTitle = "Orders";
        this.pagePath = "/admin/orders";
        this.pageIcon = "fa fa-shopping-cart";
        this.render = this.render.bind(this);
        this.statusChangeHandler = null; // Store reference for cleanup
    }

    async renderOrders() {
        this.showLoading();
        try {
            const orders = await getAllOrders();
            if (!orders || orders.length === 0) {
                this.hideLoading();
                return this.renderEmptyState();
            }
            const orderItems = [];
            orders.forEach((order) => {
                if (
                    order.items &&
                    Array.isArray(order.items) &&
                    order.items.length > 0
                ) {
                    order.items.forEach((item) => {
                        // Only add items that have a name or productId
                        if (item.name || item.productId) {
                            orderItems.push({
                                orderId: order.id,
                                createdAt: order.createdAt,
                                status: order.status,
                                grandTotal: order.grandTotal,
                                // Item details
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
                            console.warn(
                                `Failed to fetch user ${item.userId}:`,
                                error
                            );
                            return {
                                ...item,
                                customerName: "Unknown Customer",
                            };
                        }
                    }
                    return { ...item, customerName: "Guest Customer" };
                })
            );

            // Filter out any items that still don't have valid product names
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

            container.innerHTML = `
				<div class="d-flex justify-content-between align-items-center mb-4">
					<h1>${this.pageTitle}</h1>
					<div class="text-muted">
						<small>${validItems.length} items across ${
                orders.filter((o) => o.items && o.items.length > 0).length
            } orders</small>
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
										<tr data-order-id="${item.orderId}" data-item-index="${index}">
											<td>
												<input type="checkbox" class="form-check-input order-checkbox" value="${
                                                    item.orderId
                                                }" data-item-index="${index}">
											</td>
											<td>
												<div class="d-flex align-items-center">
													${`
														<div class="bg-light rounded me-2 d-flex align-items-center justify-content-center" 
															 style="width: 40px; height: 40px; font-size: 12px;">
															${(item.productName || "P").charAt(0)}
														</div>
													`}
													<div>
														<div class="fw-medium">${item.productName || "Unknown Product"}</div>
														<small class="text-muted">
															${item.brand || ""} ${item.brand ? "•" : ""} 
															${item.variant ? `${item.variant.color || ""} ${item.variant.size || ""}` : ""}
															${item.quantity > 1 ? `• Qty: ${item.quantity}` : ""}
														</small>
													</div>
												</div>
											</td>
											<td>
												<span class="text-muted">#${item.orderId}</span>
											</td>
											<td>
												<span class="text-muted">${this.formatDate(item.createdAt)}</span>
											</td>
											<td>
												<div class="d-flex align-items-center">
													<div class="avatar avatar-sm me-2">
														<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                            item.customerName ||
                                                                "User"
                                                        )}&background=random" 
															 alt="${item.customerName || "User"}" 
															 class="rounded-circle" 
															 width="32" height="32">
													</div>
													<span>${item.customerName || "Guest Customer"}</span>
												</div>
											</td>
											<td class="status-cell">
												${this.getStatusBadge(item.status)}
											</td>
											<td>
												<div>
													<span class="fw-medium">£${(item.total || 0).toFixed(2)}</span>
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
															<small class="text-success"> -${(item.discount * 100).toFixed(0)}%</small>
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
				
				<!-- Order Summary Card -->
				<div class="row mt-4">
					<div class="col-md-4">
						<div class="card bg-primary text-white">
							<div class="card-body">
								<h5 class="card-title">Total Orders</h5>
								<h3 class="mb-0">${
                                    orders.filter(
                                        (o) => o.items && o.items.length > 0
                                    ).length
                                }</h3>
							</div>
						</div>
					</div>
					<div class="col-md-4">
						<div class="card bg-success text-white">
							<div class="card-body">
								<h5 class="card-title">Total Items</h5>
								<h3 class="mb-0">${validItems.length}</h3>
							</div>
						</div>
					</div>
					<div class="col-md-4">
						<div class="card bg-info text-white">
							<div class="card-body">
								<h5 class="card-title">Total Revenue</h5>
								<h3 class="mb-0">£${orders
                                    .filter(
                                        (o) => o.items && o.items.length > 0
                                    )
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

            // Add event listeners for checkboxes and other interactions
            this.addEventListeners(container);

            // Hide loading state
            this.hideLoading();

            return container;
        } catch (error) {
            console.error("Error rendering orders:", error);
            return this.renderError(error);
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
                // Get checked items BEFORE making any changes
                const checkedBoxes = container.querySelectorAll(
                    ".order-checkbox:checked"
                );
                const selectedItems = Array.from(checkedBoxes).map((cb) => ({
                    orderId: cb.value,
                    itemIndex: cb.getAttribute("data-item-index"),
                }));
                // Get unique order IDs for database update
                const uniqueOrderIds = [
                    ...new Set(selectedItems.map((item) => item.orderId)),
                ];

                try {
                    // Show loading indicator
                    e.target.disabled = true;
                    await updateMultipleOrderStatuses(
                        uniqueOrderIds,
                        newStatus
                    );
                    selectedItems.forEach((item) => {
                        const row = container.querySelector(
                            `tr[data-order-id="${item.orderId}"][data-item-index="${item.itemIndex}"]`
                        );
                        if (row) {
                            const statusCell =
                                row.querySelector(".status-cell");
                            if (statusCell) {
                                statusCell.innerHTML =
                                    this.getStatusBadge(newStatus);
                            }

                            // Uncheck the checkbox
                            const checkbox =
                                row.querySelector(".order-checkbox");
                            if (checkbox) {
                                checkbox.checked = false;
                            }
                        } else {
                            console.warn(
                                `Row not found for order ID: ${item.orderId}, item index: ${item.itemIndex}`
                            );
                        }
                    });

                    // Reset select all checkbox
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = false;
                        selectAllCheckbox.indeterminate = false;
                    }

                    // Show success message
                    this.showSuccessMessage(
                        `Successfully updated ${selectedItems.length} item(s) in ${uniqueOrderIds.length} order(s) to ${newStatus}`
                    );
                } catch (error) {
                    console.error("Error updating order statuses:", error);
                    alert("Failed to update order statuses. Please try again.");
                } finally {
                    // Re-enable select and reset value
                    e.target.disabled = false;
                    e.target.value = "";
                }
            }
        };

        document.addEventListener("change", this.statusChangeHandler);
    }

    // Optional: Add success message method
    showSuccessMessage(message) {
        const alertDiv = document.createElement("div");
        alertDiv.className =
            "alert alert-success alert-dismissible fade show mt-3";
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector(".orders-page");
        if (container) {
            container.insertBefore(alertDiv, container.firstChild.nextSibling);

            // Auto-dismiss after 3 seconds
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
            loadingElement.remove();
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
				${error ? `<small class="text-muted">Error: ${error.message}</small>` : ""}
			</div>
		`;
        return container;
    }

    // Clean up method to remove event listeners
    cleanup() {
        if (this.statusChangeHandler) {
            document.removeEventListener("change", this.statusChangeHandler);
            this.statusChangeHandler = null;
        }
    }

    async render() {
        // Clean up any existing listeners first
        this.cleanup();
        return await this.renderOrders();
    }
}
