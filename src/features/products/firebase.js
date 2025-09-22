// firebase.js - Updated with pagination methods
import {
	collection,
	query,
	orderBy,
	limit,
	startAfter,
	endBefore,
	limitToLast,
	getDocs,
	getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js"; // Your Firebase config
class ProductPagination {
	constructor(pageSize = 12) {
		this.pageSize = pageSize;
		this.currentPage = 1;
		this.totalProducts = 0;
		this.totalPages = 0;
		this.firstVisible = null;
		this.lastVisible = null;
		this.pageSnapshots = new Map(); // Cache for page snapshots
	}

	// Get total count of products
	async getTotalCount() {
		try {
			const productsRef = collection(db, "products");
			const snapshot = await getCountFromServer(productsRef);
			this.totalProducts = snapshot.data().count;
			this.totalPages = Math.ceil(this.totalProducts / this.pageSize);
			return this.totalProducts;
		} catch (error) {
			console.error("Error getting total count:", error);
			return 0;
		}
	}

	// Get first page of products
	async getFirstPage() {
		try {
			const productsRef = collection(db, "products");
			const q = query(
				productsRef,
				orderBy("createdAt", "desc"), // or any field you want to order by
				limit(this.pageSize)
			);

			const querySnapshot = await getDocs(q);
			const products = [];

			querySnapshot.forEach((doc) => {
				products.push({ id: doc.id, ...doc.data() });
			});

			// Store pagination cursors
			this.firstVisible = querySnapshot.docs[0];
			this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
			this.currentPage = 1;

			// Cache this page
			this.pageSnapshots.set(1, {
				products,
				firstDoc: this.firstVisible,
				lastDoc: this.lastVisible,
			});

			return {
				products,
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				totalProducts: this.totalProducts,
				hasNext: querySnapshot.docs.length === this.pageSize,
				hasPrev: false,
			};
		} catch (error) {
			console.error("Error getting first page:", error);
			throw error;
		}
	}

	// Get next page of products
	async getNextPage() {
		if (!this.lastVisible) {
			throw new Error(
				"No reference to last document. Call getFirstPage() first."
			);
		}

		// Check if we can go to next page
		if (this.totalPages > 0 && this.currentPage >= this.totalPages) {
			throw new Error("Already on the last page.");
		}

		try {
			const productsRef = collection(db, "products");
			const q = query(
				productsRef,
				orderBy("createdAt", "desc"),
				startAfter(this.lastVisible),
				limit(this.pageSize)
			);

			const querySnapshot = await getDocs(q);
			const products = [];

			querySnapshot.forEach((doc) => {
				products.push({ id: doc.id, ...doc.data() });
			});

			if (products.length > 0) {
				this.firstVisible = querySnapshot.docs[0];
				this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
				this.currentPage++;

				// Cache this page
				this.pageSnapshots.set(this.currentPage, {
					products,
					firstDoc: this.firstVisible,
					lastDoc: this.lastVisible,
				});
			}

			return {
				products,
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				totalProducts: this.totalProducts,
				hasNext: products.length === this.pageSize,
				hasPrev: this.currentPage > 1,
			};
		} catch (error) {
			console.error("Error getting next page:", error);
			throw error;
		}
	}

	// Get previous page of products
	async getPreviousPage() {
		if (!this.firstVisible || this.currentPage <= 1) {
			throw new Error(
				"Already on first page or no reference to first document."
			);
		}

		try {
			const productsRef = collection(db, "products");
			const q = query(
				productsRef,
				orderBy("createdAt", "desc"),
				endBefore(this.firstVisible),
				limitToLast(this.pageSize)
			);

			const querySnapshot = await getDocs(q);
			const products = [];

			querySnapshot.forEach((doc) => {
				products.push({ id: doc.id, ...doc.data() });
			});

			if (products.length > 0) {
				this.firstVisible = querySnapshot.docs[0];
				this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
				this.currentPage--;

				// Cache this page
				this.pageSnapshots.set(this.currentPage, {
					products,
					firstDoc: this.firstVisible,
					lastDoc: this.lastVisible,
				});
			}

			return {
				products,
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				totalProducts: this.totalProducts,
				hasNext: this.currentPage < this.totalPages,
				hasPrev: this.currentPage > 1,
			};
		} catch (error) {
			console.error("Error getting previous page:", error);
			throw error;
		}
	}

	// Jump to specific page (less efficient but sometimes needed)
	async goToPage(pageNumber) {
		// Initialize total count if not already done
		if (this.totalPages === 0) {
			await this.getTotalCount();
		}

		if (
			pageNumber < 1 ||
			(this.totalPages > 0 && pageNumber > this.totalPages)
		) {
			throw new Error(`Invalid page number. Valid range: 1-${this.totalPages}`);
		}

		// Check cache first
		if (this.pageSnapshots.has(pageNumber)) {
			const cached = this.pageSnapshots.get(pageNumber);
			this.currentPage = pageNumber;
			this.firstVisible = cached.firstDoc;
			this.lastVisible = cached.lastDoc;

			return {
				products: cached.products,
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				totalProducts: this.totalProducts,
				hasNext: this.currentPage < this.totalPages,
				hasPrev: this.currentPage > 1,
			};
		}

		try {
			const productsRef = collection(db, "products");
			const offset = (pageNumber - 1) * this.pageSize;

			// This is less efficient for large offsets
			const q = query(
				productsRef,
				orderBy("createdAt", "desc"),
				limit(offset + this.pageSize)
			);

			const querySnapshot = await getDocs(q);
			const allDocs = querySnapshot.docs;
			const pageProducts = allDocs.slice(offset, offset + this.pageSize);

			const products = pageProducts.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			if (products.length > 0) {
				this.firstVisible = pageProducts[0];
				this.lastVisible = pageProducts[pageProducts.length - 1];
				this.currentPage = pageNumber;

				// Cache this page
				this.pageSnapshots.set(pageNumber, {
					products,
					firstDoc: this.firstVisible,
					lastDoc: this.lastVisible,
				});
			}

			return {
				products,
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				totalProducts: this.totalProducts,
				hasNext: this.currentPage < this.totalPages,
				hasPrev: this.currentPage > 1,
			};
		} catch (error) {
			console.error("Error going to page:", error);
			throw error;
		}
	}

	// Get pagination info without fetching data
	getPaginationInfo() {
		return {
			currentPage: this.currentPage,
			totalPages: this.totalPages,
			totalProducts: this.totalProducts,
			pageSize: this.pageSize,
			hasNext: this.currentPage < this.totalPages,
			hasPrev: this.currentPage > 1,
		};
	}

	// Reset pagination
	reset() {
		this.currentPage = 1;
		this.firstVisible = null;
		this.lastVisible = null;
		this.pageSnapshots.clear();
	}
}

// Export instance and class
export const productPagination = new ProductPagination(6); // 12 products per page
export { ProductPagination };
