import {
	collection,
	query,
	getDocs,
	doc,
	getDoc,
	orderBy,
	addDoc,
	updateDoc,
	deleteDoc,
	where,
	limit,
	startAfter,
	getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../../config/firebase.js";

export const getAllReviews = async () => {
	try {
		const reviewsRef = collection(db, "reviews");
		const q = query(reviewsRef, orderBy("createdAt", "desc"));
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching reviews:", error);
		throw error;
	}
};

export const getReviewById = async (reviewId) => {
	try {
		const reviewRef = doc(db, "reviews", reviewId);
		const reviewSnap = await getDoc(reviewRef);
		if (reviewSnap.exists()) {
			return { id: reviewSnap.id, ...reviewSnap.data() };
		} else {
			throw new Error("No such review!");
		}
	} catch (error) {
		console.error("Error fetching review:", error);
		throw error;
	}
};

export const addReview = async (reviewData) => {
	try {
		const reviewsRef = collection(db, "reviews");
		const docRef = await addDoc(reviewsRef, {
			...reviewData,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		return { id: docRef.id, ...reviewData };
	} catch (error) {
		console.error("Error adding review:", error);
		throw error;
	}
};

export const updateReview = async (reviewId, updatedData) => {
	try {
		const reviewRef = doc(db, "reviews", reviewId);
		await updateDoc(reviewRef, {
			...updatedData,
			updatedAt: new Date(),
		});
	} catch (error) {
		console.error("Error updating review:", error);
		throw error;
	}
};

export const deleteReviewById = async (reviewId) => {
	try {
		const reviewRef = doc(db, "reviews", reviewId);
		await deleteDoc(reviewRef);
	} catch (error) {
		console.error("Error deleting review:", error);
		throw error;
	}
};

export const getReviewsByRating = async (rating) => {
	try {
		const reviewsRef = collection(db, "reviews");
		const q = query(
			reviewsRef,
			where("rating", "==", rating),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching reviews by rating:", error);
		throw error;
	}
};

export const getReviewsByProductId = async (productId) => {
	try {
		const reviewsRef = collection(db, "reviews");
		const q = query(
			reviewsRef,
			where("productId", "==", productId),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching reviews by product:", error);
		throw error;
	}
};

export const getReviewsByStatus = async (status) => {
	try {
		const reviewsRef = collection(db, "reviews");
		const q = query(
			reviewsRef,
			where("status", "==", status),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching reviews by status:", error);
		throw error;
	}
};

export const updateReviewStatus = async (reviewId, status) => {
	try {
		await updateReview(reviewId, { status });
	} catch (error) {
		console.error("Error updating review status:", error);
		throw error;
	}
};

export const addReviewReply = async (reviewId, replyData) => {
	try {
		const review = await getReviewById(reviewId);
		const replies = review.replies || [];
		replies.push({
			...replyData,
			timestamp: new Date().toISOString(),
			id: `reply_${Date.now()}`,
		});
		await updateReview(reviewId, { replies, hasReply: true });
	} catch (error) {
		console.error("Error adding review reply:", error);
		throw error;
	}
};

export const getReviewStats = async () => {
	try {
		const reviewsRef = collection(db, "reviews");
		const [
			totalSnapshot,
			approvedSnapshot,
			pendingSnapshot,
			refusedSnapshot,
			fiveStarSnapshot,
			fourStarSnapshot,
			threeStarSnapshot,
			twoStarSnapshot,
			oneStarSnapshot,
		] = await Promise.all([
			getCountFromServer(reviewsRef),
			getCountFromServer(query(reviewsRef, where("status", "==", "approved"))),
			getCountFromServer(query(reviewsRef, where("status", "==", "pending"))),
			getCountFromServer(query(reviewsRef, where("status", "==", "refused"))),
			getCountFromServer(query(reviewsRef, where("rating", "==", 5))),
			getCountFromServer(query(reviewsRef, where("rating", "==", 4))),
			getCountFromServer(query(reviewsRef, where("rating", "==", 3))),
			getCountFromServer(query(reviewsRef, where("rating", "==", 2))),
			getCountFromServer(query(reviewsRef, where("rating", "==", 1))),
		]);

		const total = totalSnapshot.data().count;
		const approved = approvedSnapshot.data().count;
		const pending = pendingSnapshot.data().count;
		const refused = refusedSnapshot.data().count;

		const ratingCounts = {
			5: fiveStarSnapshot.data().count,
			4: fourStarSnapshot.data().count,
			3: threeStarSnapshot.data().count,
			2: twoStarSnapshot.data().count,
			1: oneStarSnapshot.data().count,
		};

		const totalRatings = Object.values(ratingCounts).reduce(
			(sum, count) => sum + count,
			0
		);
		const averageRating =
			totalRatings > 0
				? Object.entries(ratingCounts).reduce(
						(sum, [rating, count]) => sum + rating * count,
						0
				  ) / totalRatings
				: 0;

		return {
			total,
			approved,
			pending,
			refused,
			ratingCounts,
			averageRating: Math.round(averageRating * 10) / 10,
		};
	} catch (error) {
		console.error("Error fetching review stats:", error);
		throw error;
	}
};
const userCache = new Map();
const productCache = new Map();
export async function getUserById(userId) {
	if (!userId) return null;

	// Check cache first
	if (userCache.has(userId)) {
		return userCache.get(userId);
	}
	try {
		const userDoc = await getDoc(doc(db, "users", userId));
		if (userDoc.exists()) {
			const userData = userDoc.data();
			const user = {
				id: userId,
				name:
					userData.displayName ||
					userData.name ||
					userData.firstName + " " + userData.lastName ||
					"Anonymous",
				email: userData.email || "",
			};
			userCache.set(userId, user);
			return user;
		}
	} catch (error) {
		console.error("Error fetching user:", error);
	}

	// Cache null result to avoid repeated failed requests
	userCache.set(userId, null);
	return null;
}
export async function getProductById(productId) {
	if (!productId) return null;

	// Check cache first
	if (productCache.has(productId)) {
		return productCache.get(productId);
	}

	try {
		// Replace with your actual Firebase product collection query
		const productDoc = await getDoc(doc(db, "products", productId));
		if (productDoc.exists()) {
			const productData = productDoc.data();
			const product = {
				id: productId,
				name: productData.name || productData.title || `Product ${productId}`,
				price: productData.price || 0,
				image: productData.image || productData.images?.[0] || "",
			};
			productCache.set(productId, product);
			return product;
		}
	} catch (error) {
		console.error("Error fetching product:", error);
	}

	// Cache null result to avoid repeated failed requests
	productCache.set(productId, null);
	return null;
}
