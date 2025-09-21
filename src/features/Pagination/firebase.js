// firebase.js - Fixed pagination methods with consistent property names
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
import db from "../../config/firebase.js";

class Pagination {
	constructor(pageSize, tableName) {
		this.pageSize = pageSize;
		this.currentPage = 1;
		this.total = 0;
		this.totalPages = 0;
		this.firstVisible = null;
		this.lastVisible = null;
		this.pageSnapshots = new Map();
		this.tableName = tableName;
	}

	// Get total count of items
	async getTotalCount() {
		try {
			const tablesRef = collection(db, this.tableName);
			const snapshot = await getCountFromServer(tablesRef);
			this.total = snapshot.data().count;
			this.totalPages = Math.ceil(this.total / this.pageSize);
			return this.total;
		} catch (error) {
			console.error("Error getting total count:", error);
			return 0;
		}
	}

	async getFirstPage() {
		try {
			const tablesRef = collection(db, this.tableName);
			const q = query(
				tablesRef,
				orderBy("createdAt", "desc"),
				limit(this.pageSize)
			);
			const querySnapshot = await getDocs(q);
			const content = [];
			querySnapshot.forEach((doc) => {
				content.push({ id: doc.id, ...doc.data() });
			});
			this.firstVisible = querySnapshot.docs[0];
			this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
			this.currentPage = 1;
			this.pageSnapshots.set(1, {
				content,
				firstDoc: this.firstVisible,
				lastDoc: this.lastVisible,
			});
			return {
				content, // ✅ CONSISTENT: Always use 'content'
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				total: this.total,
				hasNext: querySnapshot.docs.length === this.pageSize,
				hasPrev: false,
			};
		} catch (error) {
			console.error("Error getting first page:", error);
			throw error;
		}
	}

	async getNextPage() {
		if (!this.lastVisible) {
			throw new Error(
				"No reference to last document. Call getFirstPage() first."
			);
		}
		if (this.totalPages > 0 && this.currentPage >= this.totalPages) {
			throw new Error("Already on the last page.");
		}
		try {
			const tablesRef = collection(db, this.tableName);
			const q = query(
				tablesRef,
				orderBy("createdAt", "desc"),
				startAfter(this.lastVisible),
				limit(this.pageSize)
			);

			const querySnapshot = await getDocs(q);
			const content = [];

			querySnapshot.forEach((doc) => {
				content.push({ id: doc.id, ...doc.data() });
			});

			if (content.length > 0) {
				this.firstVisible = querySnapshot.docs[0];
				this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
				this.currentPage++;
				this.pageSnapshots.set(this.currentPage, {
					content,
					firstDoc: this.firstVisible,
					lastDoc: this.lastVisible,
				});
			}
			return {
				content, // ✅ FIXED: Changed from 'products' to 'content'
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				total: this.total, // ✅ FIXED: Changed from 'totalProducts' to 'total'
				hasNext: content.length === this.pageSize, // ✅ FIXED: Changed from 'products' to 'content'
				hasPrev: this.currentPage > 1,
			};
		} catch (error) {
			console.error("Error getting next page:", error);
			throw error;
		}
	}

	// Get previous page
	async getPreviousPage() {
		if (!this.firstVisible || this.currentPage <= 1) {
			throw new Error(
				"Already on first page or no reference to first document."
			);
		}

		try {
			const tablesRef = collection(db, this.tableName);
			const q = query(
				tablesRef,
				orderBy("createdAt", "desc"),
				endBefore(this.firstVisible),
				limitToLast(this.pageSize)
			);

			const querySnapshot = await getDocs(q);
			const content = []; // ✅ FIXED: Changed from 'contents' to 'content'

			querySnapshot.forEach((doc) => {
				content.push({ id: doc.id, ...doc.data() });
			});

			if (content.length > 0) {
				this.firstVisible = querySnapshot.docs[0];
				this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
				this.currentPage--;

				// Cache this page
				this.pageSnapshots.set(this.currentPage, {
					content, // ✅ FIXED: Changed from 'contents' to 'content'
					firstDoc: this.firstVisible,
					lastDoc: this.lastVisible,
				});
			}

			return {
				content, // ✅ FIXED: Changed from 'contents' to 'content'
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				total: this.total, // ✅ FIXED: Changed from 'totalProducts' to 'total'
				hasNext: this.currentPage < this.totalPages,
				hasPrev: this.currentPage > 1,
			};
		} catch (error) {
			console.error("Error getting previous page:", error);
			throw error;
		}
	}

	async goToPage(pageNumber) {
		if (this.totalPages === 0) {
			await this.getTotalCount();
		}
		if (
			pageNumber < 1 ||
			(this.totalPages > 0 && pageNumber > this.totalPages)
		) {
			throw new Error(`Invalid page number. Valid range: 1-${this.totalPages}`);
		}
		if (this.pageSnapshots.has(pageNumber)) {
			const cached = this.pageSnapshots.get(pageNumber);
			this.currentPage = pageNumber;
			this.firstVisible = cached.firstDoc;
			this.lastVisible = cached.lastDoc;
			return {
				content: cached.content, // ✅ FIXED: Changed from 'products' to 'content'
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				total: this.total, // ✅ FIXED: Changed from 'totalProducts' to 'total'
				hasNext: this.currentPage < this.totalPages,
				hasPrev: this.currentPage > 1,
			};
		}
		try {
			const tablesRef = collection(db, this.tableName);
			const offset = (pageNumber - 1) * this.pageSize;
			const q = query(
				tablesRef,
				orderBy("createdAt", "desc"),
				limit(offset + this.pageSize)
			);

			const querySnapshot = await getDocs(q);
			const allDocs = querySnapshot.docs;
			const pageContent = allDocs.slice(offset, offset + this.pageSize); // ✅ FIXED: Changed from 'pageContents' to 'pageContent'
			const content = pageContent.map((doc) => ({
				// ✅ FIXED: Changed from 'contents' to 'content'
				id: doc.id,
				...doc.data(),
			}));

			if (content.length > 0) {
				this.firstVisible = pageContent[0]; // ✅ FIXED: Use document reference, not data
				this.lastVisible = pageContent[pageContent.length - 1]; // ✅ FIXED: Use document reference, not data
				this.currentPage = pageNumber;
				this.pageSnapshots.set(pageNumber, {
					content,
					firstDoc: this.firstVisible,
					lastDoc: this.lastVisible,
				});
			}
			return {
				content, // ✅ FIXED: Changed from 'contents' to 'content'
				currentPage: this.currentPage,
				totalPages: this.totalPages,
				total: this.total,
				hasNext: this.currentPage < this.totalPages,
				hasPrev: this.currentPage > 1,
			};
		} catch (error) {
			console.error("Error going to page:", error);
			throw error;
		}
	}

	getPaginationInfo() {
		return {
			currentPage: this.currentPage,
			totalPages: this.totalPages,
			total: this.total,
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
export { Pagination };
