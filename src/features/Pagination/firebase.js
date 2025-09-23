import {
	collection,
	query,
	where,
	orderBy,
	limit,
	getDocs,
	startAfter,
	getCountFromServer,
	endBefore,
	limitToLast,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";

export class Pagination {
	constructor(pageSize, tableName, orderConfig = null, filters = null) {
		this.pageSize = pageSize;
		this.tableName = tableName;
		this.currentPage = 1;
		this.total = 0;
		this.totalPages = 0;

		this.orderConfig = orderConfig || { field: "createdAt", direction: "desc" };
		this.filters = filters;

		this.lastVisible = null;
		this.firstVisible = null;
		this.pageSnapshots = new Map(); // Store snapshots by page number
	}

	_buildBaseQuery(extra = []) {
		const colRef = collection(db, this.tableName);
		const constraints = [];

		// Add filters if they exist
		if (
			this.filters &&
			this.filters.field &&
			this.filters.operator &&
			this.filters.value !== undefined
		) {
			constraints.push(
				where(this.filters.field, this.filters.operator, this.filters.value)
			);
		}

		// Add ordering
		if (this.orderConfig && this.orderConfig.field) {
			constraints.push(
				orderBy(this.orderConfig.field, this.orderConfig.direction || "desc")
			);
		} else {
			constraints.push(orderBy("createdAt", "desc"));
		}

		// Add any extra constraints
		constraints.push(...extra);

		return query(colRef, ...constraints);
	}

	async getTotalCount() {
		try {
			const q = this._buildBaseQuery();
			const snapshot = await getCountFromServer(q);
			this.total = snapshot.data().count;
			this.totalPages = Math.ceil(this.total / this.pageSize);
			console.log(
				`Total orders: ${this.total}, Total pages: ${this.totalPages}`
			);
			return this.total;
		} catch (error) {
			console.error("Error getting total count:", error);
			throw error;
		}
	}

	async getFirstPage() {
		try {
			const q = this._buildBaseQuery([limit(this.pageSize)]);
			const snapshot = await getDocs(q);

			this.currentPage = 1;
			this.pageSnapshots.set(1, snapshot);

			if (!snapshot.empty) {
				this.firstVisible = snapshot.docs[0];
				this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
			}

			const result = this._formatResult(snapshot, 1);
			console.log(`First page loaded: ${result.content.length} items`);
			return result;
		} catch (error) {
			console.error("Error getting first page:", error);
			throw error;
		}
	}

	async getNextPage() {
		if (this.currentPage >= this.totalPages) {
			console.log("Already at last page");
			return null;
		}

		try {
			const nextPage = this.currentPage + 1;

			// Check if we have this page cached
			if (this.pageSnapshots.has(nextPage)) {
				const snapshot = this.pageSnapshots.get(nextPage);
				this.currentPage = nextPage;
				this.firstVisible = snapshot.docs[0];
				this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
				return this._formatResult(snapshot, nextPage);
			}

			// Fetch next page
			if (!this.lastVisible) {
				throw new Error("No lastVisible document for pagination");
			}

			const q = this._buildBaseQuery([
				startAfter(this.lastVisible),
				limit(this.pageSize),
			]);

			const snapshot = await getDocs(q);
			this.currentPage = nextPage;
			this.pageSnapshots.set(nextPage, snapshot);

			if (!snapshot.empty) {
				this.firstVisible = snapshot.docs[0];
				this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
			}

			const result = this._formatResult(snapshot, nextPage);
			console.log(`Next page loaded: ${result.content.length} items`);
			return result;
		} catch (error) {
			console.error("Error getting next page:", error);
			throw error;
		}
	}

	async getPreviousPage() {
		if (this.currentPage <= 1) {
			console.log("Already at first page");
			return null;
		}

		try {
			const prevPage = this.currentPage - 1;

			// Check if we have this page cached
			if (this.pageSnapshots.has(prevPage)) {
				const snapshot = this.pageSnapshots.get(prevPage);
				this.currentPage = prevPage;
				this.firstVisible = snapshot.docs[0];
				this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
				return this._formatResult(snapshot, prevPage);
			}

			// If it's page 1, just call getFirstPage
			if (prevPage === 1) {
				return await this.getFirstPage();
			}

			// For other pages, we need to fetch from beginning
			return await this.goToPage(prevPage);
		} catch (error) {
			console.error("Error getting previous page:", error);
			throw error;
		}
	}

	async goToPage(pageNumber) {
		if (pageNumber < 1 || pageNumber > this.totalPages) {
			console.log(`Invalid page number: ${pageNumber}`);
			return null;
		}

		if (pageNumber === 1) {
			return await this.getFirstPage();
		}

		try {
			// Check if we have this page cached
			if (this.pageSnapshots.has(pageNumber)) {
				const snapshot = this.pageSnapshots.get(pageNumber);
				this.currentPage = pageNumber;
				this.firstVisible = snapshot.docs[0];
				this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
				return this._formatResult(snapshot, pageNumber);
			}

			// Calculate offset and fetch the page
			const offset = (pageNumber - 1) * this.pageSize;

			// First, get all documents up to the start of our target page
			const offsetQuery = this._buildBaseQuery([limit(offset)]);
			const offsetSnapshot = await getDocs(offsetQuery);

			let targetQuery;
			if (offsetSnapshot.empty || offset === 0) {
				// If no offset needed, just get first page
				targetQuery = this._buildBaseQuery([limit(this.pageSize)]);
			} else {
				// Start after the last document from offset query
				const lastOffsetDoc =
					offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
				targetQuery = this._buildBaseQuery([
					startAfter(lastOffsetDoc),
					limit(this.pageSize),
				]);
			}

			const snapshot = await getDocs(targetQuery);
			this.currentPage = pageNumber;
			this.pageSnapshots.set(pageNumber, snapshot);

			if (!snapshot.empty) {
				this.firstVisible = snapshot.docs[0];
				this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
			}

			const result = this._formatResult(snapshot, pageNumber);
			console.log(`Page ${pageNumber} loaded: ${result.content.length} items`);
			return result;
		} catch (error) {
			console.error(`Error going to page ${pageNumber}:`, error);
			throw error;
		}
	}

	_formatResult(snapshot, pageNumber) {
		const content = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		return {
			content: content,
			currentPage: pageNumber,
			totalPages: this.totalPages,
			total: this.total,
			hasNext: pageNumber < this.totalPages,
			hasPrev: pageNumber > 1,
			itemsOnPage: content.length,
		};
	}

	getPaginationInfo() {
		return {
			currentPage: this.currentPage,
			totalPages: this.totalPages,
			total: this.total,
			hasNext: this.currentPage < this.totalPages,
			hasPrev: this.currentPage > 1,
		};
	}

	reset() {
		this.currentPage = 1;
		this.lastVisible = null;
		this.firstVisible = null;
		this.pageSnapshots.clear();
		console.log("Pagination reset");
	}
}
