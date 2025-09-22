import {
	collection,
	query,
	where,
	orderBy,
	limit,
	getDocs,
	startAfter,
	getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";

export class Pagination {
	constructor(pageSize, tableName, filters = null) {
		this.pageSize = pageSize;
		this.tableName = tableName;
		this.currentPage = 1;
		this.total = 0;
		this.totalPages = 0;
		this.filters = filters; // { field: "discount", operator: ">", value: 0 }
		this.lastVisible = null;
		this.firstVisible = null;
		this.snapshots = [];
	}

	_buildBaseQuery(extra = []) {
		const colRef = collection(db, this.tableName);

		// If filter exists
		if (this.filters && this.filters.field) {
			return query(
				colRef,
				where(this.filters.field, this.filters.operator, this.filters.value),
				orderBy(this.filters.field, "desc"),
				...extra
			);
		}

		// No filter → fallback to default ordering (e.g. createdAt)
		return query(colRef, orderBy("createdAt", "desc"), ...extra);
	}

	async getTotalCount() {
		const q = this._buildBaseQuery();
		const snapshot = await getCountFromServer(q);
		this.total = snapshot.data().count;
		this.totalPages = Math.ceil(this.total / this.pageSize);
		return this.total;
	}

	async getFirstPage() {
		const q = this._buildBaseQuery([limit(this.pageSize)]);
		const snapshot = await getDocs(q);

		this.snapshots[1] = snapshot;
		this.firstVisible = snapshot.docs[0];
		this.lastVisible = snapshot.docs[snapshot.docs.length - 1];

		return this._formatResult(snapshot, 1);
	}

	async getNextPage() {
		if (this.currentPage >= this.totalPages) return null;

		const q = this._buildBaseQuery([
			startAfter(this.lastVisible),
			limit(this.pageSize),
		]);

		const snapshot = await getDocs(q);
		this.currentPage++;
		this.snapshots[this.currentPage] = snapshot;
		this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
		this.firstVisible = snapshot.docs[0];

		return this._formatResult(snapshot, this.currentPage);
	}

	async getPreviousPage() {
		if (this.currentPage <= 1) return null;

		this.currentPage--;
		const snapshot = this.snapshots[this.currentPage];
		this.firstVisible = snapshot.docs[0];
		this.lastVisible = snapshot.docs[snapshot.docs.length - 1];

		return this._formatResult(snapshot, this.currentPage);
	}

	async goToPage(pageNumber) {
		if (pageNumber < 1 || pageNumber > this.totalPages) return null;

		// calculate offset
		const offset = (pageNumber - 1) * this.pageSize;

		// load offset first
		const prevQuery = this._buildBaseQuery([limit(offset)]);
		const prevSnapshot = await getDocs(prevQuery);

		let q = this._buildBaseQuery([limit(this.pageSize)]);
		if (!prevSnapshot.empty && offset > 0) {
			const lastVisible = prevSnapshot.docs[prevSnapshot.docs.length - 1];
			q = this._buildBaseQuery([startAfter(lastVisible), limit(this.pageSize)]);
		}

		const snapshot = await getDocs(q);
		this.snapshots[pageNumber] = snapshot;
		this.currentPage = pageNumber;
		this.firstVisible = snapshot.docs[0];
		this.lastVisible = snapshot.docs[snapshot.docs.length - 1];

		return this._formatResult(snapshot, pageNumber);
	}

	_formatResult(snapshot, pageNumber) {
		return {
			content: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
			currentPage: pageNumber,
			totalPages: this.totalPages,
			total: this.total,
			hasNext: pageNumber < this.totalPages,
			hasPrev: pageNumber > 1,
		};
	}

	getPaginationInfo() {
		return {
			currentPage: this.currentPage,
			totalPages: this.totalPages,
			total: this.total,
		};
	}
}
