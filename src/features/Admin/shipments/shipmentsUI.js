import {
	addShipment,
	deleteShipmentById,
	getAllShipments,
	getShipmentById,
	updateShipment,
} from "./firebase.js";
import { Pagination } from "../../Pagination/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
const auth=getAuth();
export class ShipmentsPage {
	constructor() {
		this.pageTitle = "Shipments";
		this.pagePath = "/admin/shipments";
		this.pageIcon = "fa fa-truck";
		this.render = this.render.bind(this);
		this.statusChangeHandler = null;
		this.actionHandler = null;
		this.currentShipments = [];
		this.pagination = new Pagination(5, "shipments");
	}

	async renderShipments() {
		console.log("=== RENDER SHIPMENTS START ===");
		this.showLoading();

		try {
			// Load data if we don't have any cached
			if (!this.currentShipments || this.currentShipments.length === 0) {
				console.log("No shipments cached, loading first page...");

				try {
					console.log("Getting total count...");
					const totalCount = await this.pagination.getTotalCount();
					console.log("Total count result:", totalCount);
					console.log("Pagination total:", this.pagination.total);
					console.log("Pagination totalPages:", this.pagination.totalPages);

					if (this.pagination.total === 0) {
						console.log("No shipments found in database");
						this.hideLoading();
						return this.renderEmptyState();
					}

					console.log("Getting first page...");
					const paginatedResult = await this.pagination.getFirstPage();
					console.log("First page result:", paginatedResult);
					console.log("Content length:", paginatedResult?.content?.length);

					if (!paginatedResult || !paginatedResult.content) {
						console.error("Invalid pagination result:", paginatedResult);
						this.hideLoading();
						return this.renderError(new Error("Invalid pagination result"));
					}

					this.currentShipments = paginatedResult.content; 
					console.log("Shipments assigned:", this.currentShipments.length);
				} catch (loadError) {
					console.error("Error loading shipments:", loadError);
					this.hideLoading();
					return this.renderError(loadError);
				}
			}

			// Double-check we have shipments
			if (!this.currentShipments || this.currentShipments.length === 0) {
				console.log("Still no shipments after loading attempt");
				this.hideLoading();
				return this.renderEmptyState();
			}

			console.log("Processing shipments with customers...");
			// Get customer names for better display
			const shipmentsWithCustomers = await Promise.all(
				this.currentShipments.map(async (shipment) => {
					if (shipment.userId) {
						try {
							// You would implement getUserById function
							// const user = await getUserById(shipment.userId);
							return {
								...shipment,
								customerName: shipment.address?.name || "Unknown Customer",
							};
						} catch (error) {
							console.warn(`Failed to fetch user ${shipment.userId}:`, error);
							return {
								...shipment,
								customerName: "Unknown Customer",
							};
						}
					}
					return {
						...shipment,
						customerName: shipment.address?.name || "Guest Customer",
					};
				})
			);

			console.log(
				"Shipments with customers processed:",
				shipmentsWithCustomers.length
			);

			const container = document.createElement("div");
			container.className = "shipments-page";
			const paginationInfo = this.pagination.getPaginationInfo();
			console.log("Pagination info:", paginationInfo);

			const totalShipmentsDisplay = paginationInfo.total;

			// Generate edit and show modals
			const editModalsHTML = shipmentsWithCustomers
				.map((shipment) => this.generateEditModal(shipment))
				.join("");

			const showModalsHTML = shipmentsWithCustomers
				.map((shipment) => this.generateShowModal(shipment))
				.join("");

			container.innerHTML = `
				<div class="d-flex justify-content-between align-items-center mb-4">
					<h1>${this.pageTitle}</h1>
					<div class="d-flex align-items-center gap-3">
						<div class="text-muted">
							<small>Page ${paginationInfo.currentPage} of ${
				paginationInfo.totalPages
			} (${totalShipmentsDisplay} total shipments)</small>
						</div>
						<div class="bulk-actions">
							<select id="bulkAction" class="form-select">
								<option value="" selected disabled>Bulk Actions</option>
								<option value="shipped">Mark as Shipped</option>
								<option value="delivered">Mark as Delivered</option>
								<option value="delete">Delete</option>
							</select>
						</div>
						<button class="btn btn-primary" id="addShipmentBtn" data-bs-toggle="modal" data-bs-target="#addShipmentModal">
							<i class="fa fa-plus me-2"></i>Create Shipment
						</button>
					</div>
				</div>
				
				<div class="card">
					<div class="card-header">
						<h5 class="mb-0">All Shipments</h5>
					</div>
					<div class="card-body p-0">
						<div class="table-responsive">
							<table class="table table-hover mb-0">
								<thead class="table-light">
									<tr>
										<th scope="col">
											<input type="checkbox" class="form-check-input" id="selectAll">
										</th>
										<th scope="col">Shipment ID</th>
										<th scope="col">Customer</th>
										<th scope="col">Items</th>
										<th scope="col">Carrier</th>
										<th scope="col">Status</th>
										<th scope="col">Created</th>
										<th scope="col">Actions</th>
									</tr>
								</thead>
								<tbody>
									${shipmentsWithCustomers
										.map((shipment, index) =>
											this.generateShipmentRow(shipment, index)
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
						Showing ${shipmentsWithCustomers.length} shipments on page ${
								paginationInfo.currentPage
						  } of ${Math.max(1, paginationInfo.totalPages)}
					</div>
					<nav aria-label="Shipments pagination">
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

				<!-- Stats Cards -->
				<div class="row mt-4">
					<div class="col-md-3">
						<div class="card bg-primary text-white">
							<div class="card-body">
								<h5 class="card-title">Total Shipments</h5>
								<h3 class="mb-0">${totalShipmentsDisplay}</h3>
							</div>
						</div>
					</div>
					<div class="col-md-3">
						<div class="card bg-success text-white">
							<div class="card-body">
								<h5 class="card-title">Delivered</h5>
								<h3 class="mb-0">${
									shipmentsWithCustomers.filter((s) => s.status === "delivered")
										.length
								}</h3>
							</div>
						</div>
					</div>
					<div class="col-md-3">
						<div class="card bg-warning text-white">
							<div class="card-body">
								<h5 class="card-title">In Transit</h5>
								<h3 class="mb-0">${
									shipmentsWithCustomers.filter(
										(s) => s.status === "in_transit"
									).length
								}</h3>
							</div>
						</div>
					</div>
					<div class="col-md-3">
						<div class="card bg-info text-white">
							<div class="card-body">
								<h5 class="card-title">Pending</h5>
								<h3 class="mb-0">${
									shipmentsWithCustomers.filter((s) => s.status === "pending")
										.length
								}</h3>
							</div>
						</div>
					</div>
				</div>

				<!-- Modals -->
				${editModalsHTML}
				${showModalsHTML}
				${this.generateAddModal()}
			`;

			this.addEventListeners(container);
			this.addPaginationEventListeners(container);

			console.log("Hiding loading and returning container");
			this.hideLoading();

			console.log("=== RENDER SHIPMENTS SUCCESS ===");
			return container;
		} catch (error) {
			console.error("=== RENDER SHIPMENTS ERROR ===", error);
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
			this.currentShipments = result.content; // ✅ FIXED: Use currentShipments
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
			this.currentShipments = result.content; // ✅ FIXED: Use currentShipments
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
			this.currentShipments = result.content; // ✅ FIXED: Use currentShipments
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
				this.currentShipments = result.content; // ✅ FIXED: Use currentShipments
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
			this.currentShipments = result.content; // ✅ FIXED: Use currentShipments
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
			const newContainer = await this.renderShipments();
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
		const getShipmentCheckboxes = () =>
			container.querySelectorAll(".shipment-checkbox");

		if (selectAllCheckbox) {
			selectAllCheckbox.addEventListener("change", (e) => {
				const shipmentCheckboxes = getShipmentCheckboxes();
				shipmentCheckboxes.forEach((checkbox) => {
					checkbox.checked = e.target.checked;
				});
			});
		}

		// Handle individual checkboxes
		container.addEventListener("change", (e) => {
			if (e.target.classList.contains("shipment-checkbox")) {
				const shipmentCheckboxes = getShipmentCheckboxes();
				const checkedBoxes = container.querySelectorAll(
					".shipment-checkbox:checked"
				);

				if (selectAllCheckbox) {
					selectAllCheckbox.checked =
						checkedBoxes.length === shipmentCheckboxes.length;
					selectAllCheckbox.indeterminate =
						checkedBoxes.length > 0 &&
						checkedBoxes.length < shipmentCheckboxes.length;
				}
			}
		});

		// Handle add shipment button
		const saveShipment = container.querySelector("#saveShipmentBtn");
		if (saveShipment) {
			saveShipment.addEventListener("click", () => {
				this.addShipment();
			});
		}

		// Handle update shipment buttons
		container.addEventListener("click", (e) => {
			if (e.target.id && e.target.id.startsWith("updateShipmentBtn")) {
				const shipmentId = e.target.getAttribute("data-shipment-id");
				this.updateShipment(shipmentId, container);
			} else if (e.target.closest(".delete-btn")) {
				const shipmentId = e.target
					.closest(".delete-btn")
					.getAttribute("data-shipment-id");
				this.deleteShipment(shipmentId);
			}
		});

		// Handle bulk actions
		this.actionHandler = async (e) => {
			if (e.target && e.target.id === "bulkAction") {
				const action = e.target.value;
				const checkedBoxes = container.querySelectorAll(
					".shipment-checkbox:checked"
				);
				const selectedShipments = Array.from(checkedBoxes).map((cb) => ({
					shipmentId: cb.value,
					shipmentIndex: cb.getAttribute("data-shipment-index"),
				}));

				if (selectedShipments.length === 0) {
					alert("Please select shipments to perform bulk action.");
					e.target.value = "";
					return;
				}

				const confirmMessage = `Are you sure you want to ${action} ${selectedShipments.length} shipment(s)?`;
				if (!confirm(confirmMessage)) {
					e.target.value = "";
					return;
				}

				try {
					e.target.disabled = true;
					const shipmentIds = selectedShipments.map((item) => item.shipmentId);

					switch (action) {
						case "shipped":
							await Promise.all(
								shipmentIds.map((id) =>
									updateShipment(id, { status: "shipped" })
								)
							);
							this.updateShipmentRows(container, selectedShipments, "shipped");
							break;
						case "delivered":
							await Promise.all(
								shipmentIds.map((id) =>
									updateShipment(id, { status: "delivered" })
								)
							);
							this.updateShipmentRows(
								container,
								selectedShipments,
								"delivered"
							);
							break;
						case "delete":
							await Promise.all(
								shipmentIds.map((id) => deleteShipmentById(id))
							);
							this.removeShipmentRows(container, selectedShipments);
							break;
					}

					// Reset checkboxes
					if (selectAllCheckbox) {
						selectAllCheckbox.checked = false;
						selectAllCheckbox.indeterminate = false;
					}

					this.showSuccessMessage(
						`Successfully ${action}d ${selectedShipments.length} shipment(s)`
					);
				} catch (error) {
					console.error(`Error performing bulk ${action}:`, error);
					alert(`Failed to ${action} shipments. Please try again.`);
				} finally {
					e.target.disabled = false;
					e.target.value = "";
				}
			}
		};

		document.addEventListener("change", this.actionHandler);
	}

	// ========== HTML GENERATORS ==========

	generateShipmentRow(shipment, index) {
		return `
			<tr data-shipment-id="${shipment.id}" data-shipment-index="${index}">
				<td>
					<input type="checkbox" class="form-check-input shipment-checkbox" value="${
						shipment.id
					}" data-shipment-index="${index}">
				</td>
				<td>
					<div class="fw-medium">${shipment.shipmentId || shipment.id}</div>
					<small class="text-muted">Order: ${shipment.orderId || "N/A"}</small>
				</td>
				<td>
					<div class="d-flex align-items-center">
						<div class="bg-light rounded me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 10px;">
							${(shipment.customerName || "U").charAt(0).toUpperCase()}
						</div>
						<div>
							<div class="fw-medium">${shipment.customerName || "Unknown Customer"}</div>
							<small class="text-muted">${shipment.address?.phone || "No phone"}</small>
						</div>
					</div>
				</td>
				<td>
					<span class="fw-medium">${(shipment.items || []).length} items</span><br>
					<small class="text-muted">${(shipment.items || []).reduce(
						(sum, item) => sum + (item.quantity || 0),
						0
					)} total qty</small>
				</td>
				<td>
					<div class="fw-medium">${shipment.carrier?.name || "Unknown"}</div>
					<small class="text-muted">${shipment.carrier?.service || ""}</small>
				</td>
				<td class="status-cell">
					${this.getStatusBadge(shipment.status)}
				</td>
				<td>
					<span class="text-muted">${this.formatDate(shipment.createdAt)}</span>
				</td>
				<td>
					<div class="btn-group btn-group-sm">
						<button type="button" class="btn btn-outline-info view-btn" data-bs-toggle="modal" 
							data-bs-target="#showShipmentModal${shipment.id}" 
							data-shipment-id="${shipment.id}" 
							title="View Details">
							<i class="fa fa-eye"></i>
						</button>
						<button type="button" class="btn btn-outline-primary edit-btn" data-bs-toggle="modal" 
							data-bs-target="#editShipmentModal${shipment.id}" 
							data-shipment-id="${shipment.id}">
							<i class="fa fa-edit"></i>
						</button>
						<button type="button" class="btn btn-outline-danger delete-btn" data-shipment-id="${
							shipment.id
						}">
							<i class="fa fa-trash"></i>
						</button>
					</div>
				</td>
			</tr>
		`;
	}

	generateEditModal(shipment) {
		return `
			<div class="modal fade" id="editShipmentModal${shipment.id}" tabindex="-1">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h1 class="modal-title fs-5">Edit Shipment #${
								shipment.shipmentId || shipment.id
							}</h1>
							<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
						</div>
						<div class="modal-body">
							<form id="editShipmentForm${shipment.id}">
								<input type="hidden" value="${shipment.id}" name="id" />
								<div class="row">
									<div class="col-md-6">
										<div class="mb-3">
											<label class="form-label">Status *</label>
											<select class="form-select" name="status" required>
												<option value="pending" ${
													shipment.status === "pending" ? "selected" : ""
												}>Pending</option>
												<option value="shipped" ${
													shipment.status === "shipped" ? "selected" : ""
												}>Shipped</option>
												<option value="in_transit" ${
													shipment.status === "in_transit" ? "selected" : ""
												}>In Transit</option>
												<option value="delivered" ${
													shipment.status === "delivered" ? "selected" : ""
												}>Delivered</option>
											</select>
										</div>
									</div>
									<div class="col-md-6">
										<div class="mb-3">
											<label class="form-label">Carrier</label>
											<input type="text" class="form-control" value="${
												shipment.carrier?.name || ""
											}" name="carrierName" />
										</div>
									</div>
								</div>
								<div class="row">
									<div class="col-md-6">
										<div class="mb-3">
											<label class="form-label">Service</label>
											<input type="text" class="form-control" value="${
												shipment.carrier?.service || ""
											}" name="carrierService" />
										</div>
									</div>
									<div class="col-md-6">
										<div class="mb-3">
											<label class="form-label">Estimated Delivery</label>
											<input type="datetime-local" class="form-control" value="${this.formatDateTimeLocal(
												shipment.estimatedDelivery
											)}" name="estimatedDelivery" />
										</div>
									</div>
								</div>
								<div class="mb-3">
									<label class="form-label">Add Note</label>
									<textarea class="form-control" name="note" rows="3" placeholder="Add tracking update or note..."></textarea>
								</div>
								<div class="mb-3">
									<label class="form-label">Current Location</label>
									<input type="text" class="form-control" name="location" placeholder="Current package location" />
								</div>
							</form>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
							<button type="button" class="btn btn-primary" id="updateShipmentBtn${
								shipment.id
							}" data-shipment-id="${shipment.id}">
								<span class="spinner-border spinner-border-sm d-none me-2"></span>
								Update Shipment
							</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	generateShowModal(shipment) {
		return `
			<div class="modal fade" id="showShipmentModal${shipment.id}" tabindex="-1">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h1 class="modal-title fs-5">Shipment #${
								shipment.shipmentId || shipment.id
							}</h1>
							<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
						</div>
						<div class="modal-body">
							<h2>Shipment Details</h2>
							<p><strong>Shipment ID:</strong> ${shipment.shipmentId || shipment.id}</p>
							<p><strong>Customer Name:</strong> ${shipment.customerName}</p>
							<p><strong>Status:</strong> ${shipment.status}</p>
							<p><strong>Created At:</strong> ${new Date(
								shipment.createdAt
							).toLocaleString()}</p>
							<p><strong>Updated At:</strong> ${new Date(
								shipment.updatedAt
							).toLocaleString()}</p>
							<h3>Address</h3>
							<p>${shipment.address?.name || ""}</p>
							<p>${shipment.address?.addressLine1 || ""}</p>
							<p>${shipment.address?.addressLine2 || ""}</p>
							<p>${shipment.address?.city || ""}, ${shipment.address?.state || ""} ${
			shipment.address?.postalCode || ""
		}</p>
							<p>${shipment.address?.country || ""}</p>
							<p><strong>Phone:</strong> ${shipment.address?.phone || ""}</p>
							<h3>Carrier</h3>
							<p><strong>Name:</strong> ${shipment.carrier?.name || ""}</p>
							<p><strong>Service:</strong> ${shipment.carrier?.service || ""}</p>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	generateAddModal() {
		return `
			<div class="modal fade" id="addShipmentModal" tabindex="-1">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h1 class="modal-title fs-5">Create New Shipment</h1>
							<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
						</div>
						<div class="modal-body">
							<form id="addShipmentForm">
								<div class="row">
									<div class="col-md-6">
										<div class="mb-3">
											<label for="orderId" class="form-label">Order ID *</label>
											<input type="text" class="form-control" id="orderId" name="orderId" required>
										</div>
									</div>
									<div class="col-md-6">
										<div class="mb-3">
											<label for="userId" class="form-label">Customer ID</label>
											<input type="text" class="form-control" id="userId" name="userId">
										</div>
									</div>
								</div>
								
								<div class="row">
									<div class="col-md-6">
										<div class="mb-3">
											<label for="carrierName" class="form-label">Carrier *</label>
											<select class="form-select" id="carrierName" name="carrierName" required>
												<option value="">Select Carrier</option>
												<option value="FedEx">FedEx</option>
												<option value="UPS">UPS</option>
												<option value="DHL">DHL</option>
												<option value="USPS">USPS</option>
											</select>
										</div>
									</div>
									<div class="col-md-6">
										<div class="mb-3">
											<label for="carrierService" class="form-label">Service Type *</label>
											<select class="form-select" id="carrierService" name="carrierService" required>
												<option value="">Select Service</option>
												<option value="Ground">Ground</option>
												<option value="Express">Express</option>
												<option value="Overnight">Overnight</option>
												<option value="Standard">Standard</option>
											</select>
										</div>
									</div>
								</div>
								
								<div class="mb-3">
									<label for="estimatedDelivery" class="form-label">Estimated Delivery Date *</label>
									<input type="datetime-local" class="form-control" id="estimatedDelivery" name="estimatedDelivery" required>
								</div>
								
								<h6>Customer Address</h6>
								<div class="row">
									<div class="col-md-6">
										<div class="mb-3">
											<label for="customerName" class="form-label">Name *</label>
											<input type="text" class="form-control" id="customerName" name="customerName" required>
										</div>
									</div>
									<div class="col-md-6">
										<div class="mb-3">
											<label for="customerPhone" class="form-label">Phone</label>
											<input type="tel" class="form-control" id="customerPhone" name="customerPhone">
										</div>
									</div>
								</div>
								
								<div class="mb-3">
									<label for="addressLine1" class="form-label">Address Line 1 *</label>
									<input type="text" class="form-control" id="addressLine1" name="addressLine1" required>
								</div>
								
								<div class="mb-3">
									<label for="addressLine2" class="form-label">Address Line 2</label>
									<input type="text" class="form-control" id="addressLine2" name="addressLine2">
								</div>
								
								<div class="row">
									<div class="col-md-4">
										<div class="mb-3">
											<label for="city" class="form-label">City *</label>
											<input type="text" class="form-control" id="city" name="city" required>
										</div>
									</div>
									<div class="col-md-4">
										<div class="mb-3">
											<label for="state" class="form-label">State *</label>
											<input type="text" class="form-control" id="state" name="state" required>
										</div>
									</div>
									<div class="col-md-4">
										<div class="mb-3">
											<label for="postalCode" class="form-label">Postal Code *</label>
											<input type="text" class="form-control" id="postalCode" name="postalCode" required>
										</div>
									</div>
								</div>
							</form>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
							<button type="button" class="btn btn-primary" id="saveShipmentBtn">
								<span class="spinner-border spinner-border-sm d-none me-2"></span>
								Create Shipment
							</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	// ========== UTILITY METHODS ==========

	getStatusBadge(status) {
		switch (status?.toLowerCase()) {
			case "delivered":
				return '<span class="badge bg-success">● Delivered</span>';
			case "in_transit":
				return '<span class="badge bg-primary">● In Transit</span>';
			case "shipped":
				return '<span class="badge bg-info">● Shipped</span>';
			case "pending":
				return '<span class="badge bg-warning">● Pending</span>';
			case "failed":
				return '<span class="badge bg-danger">● Failed</span>';
			case "returned":
				return '<span class="badge bg-secondary">● Returned</span>';
			default:
				return '<span class="badge bg-secondary">● Unknown</span>';
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

	formatDateTimeLocal(dateString) {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			return date.toISOString().slice(0, 16);
		} catch (error) {
			return "";
		}
	}

	// ========== CRUD OPERATIONS ==========

	async addShipment() {
		const form = document.getElementById("addShipmentForm");
		const saveBtn = document.getElementById("saveShipmentBtn");
		const spinner = saveBtn.querySelector(".spinner-border");

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const formData = new FormData(form);
		const shipmentData = {
			orderId: formData.get("orderId"),
			userId: formData.get("userId") || null,
			shipmentId: `shp_${Date.now()}`,
			status: "pending",
			carrier: {
				name: formData.get("carrierName"),
				service: formData.get("carrierService"),
			},
			address: {
				name: formData.get("customerName"),
				phone: formData.get("customerPhone"),
				addressLine1: formData.get("addressLine1"),
				addressLine2: formData.get("addressLine2"),
				city: formData.get("city"),
				state: formData.get("state"),
				postalCode: formData.get("postalCode"),
				country: "Egypt",
			},
			estimatedDelivery: formData.get("estimatedDelivery"),
			history: [
				{
					status: "pending",
					description: "Shipment created and awaiting pickup",
					location: "Fulfillment Center",
					timestamp: new Date().toISOString(),
				},
			],
			items: [], // This would be populated based on the order
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		try {
			saveBtn.disabled = true;
			spinner.classList.remove("d-none");

			await addShipment(shipmentData);

			// Reset form
			form.reset();

			// Close modal
			const addModal = document.getElementById("addShipmentModal");
			if (addModal) {
				const modalInstance = bootstrap.Modal.getInstance(addModal);
				if (modalInstance) {
					modalInstance.hide();
				}
			}

			this.showSuccessMessage("Shipment created successfully!");

			// Reset pagination and refresh to show new shipment
			this.pagination.reset();
			this.currentShipments = [];
			await this.refreshCurrentView();
		} catch (error) {
			console.error("Error adding shipment:", error);
			alert("Failed to create shipment. Please try again.");
		} finally {
			saveBtn.disabled = false;
			spinner.classList.add("d-none");
		}
	}

	async updateShipment(shipmentId, container) {
		const form = container.querySelector(`#editShipmentForm${shipmentId}`);
		const updateBtn = container.querySelector(
			`#updateShipmentBtn${shipmentId}`
		);
		const spinner = updateBtn.querySelector(".spinner-border");

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const formData = new FormData(form);
		const updateData = {
			status: formData.get("status"),
			carrier: {
				name: formData.get("carrierName"),
				service: formData.get("carrierService"),
			},
			estimatedDelivery: formData.get("estimatedDelivery"),
			updatedAt: new Date().toISOString(),
		};

		// Add note to history if provided
		const note = formData.get("note");
		const location = formData.get("location");
		if (note || location) {
			const shipment = await getShipmentById(shipmentId);
			const history = shipment.history || [];
			history.push({
				status: updateData.status,
				description: note || `Status updated to ${updateData.status}`,
				location: location || "Unknown Location",
				timestamp: new Date().toISOString(),
			});
			updateData.history = history;
		}

		try {
			updateBtn.disabled = true;
			spinner.classList.remove("d-none");

			await updateShipment(shipmentId, updateData);

			// Update the table row without full page refresh
			await this.updateShipmentRow(shipmentId, updateData, container);

			// Close modal
			const modal = bootstrap.Modal.getInstance(
				container.querySelector(`#editShipmentModal${shipmentId}`)
			);
			if (modal) {
				modal.hide();
			}

			this.showSuccessMessage("Shipment updated successfully!");
		} catch (error) {
			console.error("Error updating shipment:", error);
			alert("Failed to update shipment. Please try again.");
		} finally {
			updateBtn.disabled = false;
			spinner.classList.add("d-none");
		}
	}

	async updateShipmentRow(shipmentId, updatedData, container) {
		const row = container.querySelector(`tr[data-shipment-id="${shipmentId}"]`);
		if (!row) return;

		// Update the row content
		const carrierCell = row.children[4]; // Carrier column
		const statusCell = row.children[5]; // Status column

		// Update carrier
		carrierCell.innerHTML = `
			<div class="fw-medium">${updatedData.carrier.name || "Unknown"}</div>
			<small class="text-muted">${updatedData.carrier.service || ""}</small>
		`;

		// Update status
		statusCell.innerHTML = this.getStatusBadge(updatedData.status);
	}

	updateShipmentRows(container, selectedShipments, newStatus) {
		selectedShipments.forEach((item) => {
			const row = container.querySelector(
				`tr[data-shipment-id="${item.shipmentId}"][data-shipment-index="${item.shipmentIndex}"]`
			);
			if (row) {
				const statusCell = row.querySelector(".status-cell");
				if (statusCell) {
					statusCell.innerHTML = this.getStatusBadge(newStatus);
				}

				// Uncheck the checkbox
				const checkbox = row.querySelector(".shipment-checkbox");
				if (checkbox) {
					checkbox.checked = false;
				}
			}
		});
	}

	removeShipmentRows(container, selectedShipments) {
		selectedShipments.forEach((item) => {
			const row = container.querySelector(
				`tr[data-shipment-id="${item.shipmentId}"][data-shipment-index="${item.shipmentIndex}"]`
			);
			if (row) {
				row.remove();
			}
		});
	}

	async deleteShipment(shipmentId) {
		if (confirm("Are you sure you want to delete this shipment?")) {
			try {
				await deleteShipmentById(shipmentId);
				this.showSuccessMessage("Shipment deleted successfully!");
				await this.refreshCurrentView();
			} catch (error) {
				console.error("Error deleting shipment:", error);
				alert("Failed to delete shipment. Please try again.");
			}
		}
	}

	showSuccessMessage(message) {
		const alertDiv = document.createElement("div");
		alertDiv.className = "alert alert-success alert-dismissible fade show mt-3";
		alertDiv.innerHTML = `
			${message}
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
		`;

		const container = document.querySelector(".shipments-page");
		if (container) {
			container.insertBefore(alertDiv, container.firstChild.nextSibling);

			setTimeout(() => {
				if (alertDiv && alertDiv.parentNode) {
					alertDiv.remove();
				}
			}, 3000);
		}
	}

	// ========== EMPTY STATE & ERROR HANDLING ==========

	renderEmptyState() {
		const container = document.createElement("div");
		container.className = "shipments-page";
		container.innerHTML = `
			<div class="d-flex justify-content-between align-items-center mb-4">
				<h1>${this.pageTitle}</h1>
				<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addShipmentModal">
					<i class="fa fa-plus me-2"></i>Create Shipment
				</button>
			</div>
			<div class="text-center py-5">
				<div class="mb-3">
					<i class="fa fa-truck fa-3x text-muted"></i>
				</div>
				<h4>No Shipments Found</h4>
				<p class="text-muted">Get started by creating your first shipment.</p>
				<button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#addShipmentModal">
					<i class="fa fa-plus me-2"></i>Create Your First Shipment
				</button>
			</div>
			${this.generateAddModal()}
		`;

		// Add event listeners for empty state
		const saveBtn = container.querySelector("#saveShipmentBtn");
		if (saveBtn) {
			saveBtn.addEventListener("click", () => {
				this.addShipment();
			});
		}

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

		// Force removal of any lingering loading elements
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
		const container = document.createElement("div");
		container.className = "shipments-page";
		container.innerHTML = `
			<div class="alert alert-danger" role="alert">
				<h4 class="alert-heading">Error Loading Shipments</h4>
				<p>There was a problem loading the shipments. Please try again later.</p>
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

		console.log("=== SHIPMENTS PAGE RENDER START ===");
		const result = await this.renderShipments();
		console.log("=== SHIPMENTS PAGE RENDER END ===");

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
