import {
	collection,
	query,
	getDocs,
	doc,
	getDoc,
	addDoc,
	updateDoc,
	where,
	orderBy,
	limit,
	startAfter,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";
export const getProductById = async (productId) => {
	const productRef = doc(db, "products", productId);
	const productSnap = await getDoc(productRef);
	if (productSnap.exists()) {
		return { id: productSnap.id, ...productSnap.data() };
	} else {
		throw new Error("No such product!");
	}
};

export async function getReviewsByProduct(productId, isNextPage = false) {
	let lastVisible = null; // track last doc
	const pageSize = 5; // reviews per batch
	try {
		const reviewsRef = collection(db, "reviews");

		// base query
		let q = query(
			reviewsRef,
			where("productId", "==", productId),
			where("status", "==", "approved"),
			orderBy("createdAt", "desc"),
			limit(pageSize)
		);
        

		// add pagination
		if (isNextPage && lastVisible) {
			q = query(
				reviewsRef,
				where("productId", "==", productId),
				where("status", "==", "approved"),
				orderBy("createdAt", "desc"),
				startAfter(lastVisible),
				limit(pageSize)
			);
		}

		const snapshot = await getDocs(q);

		if (!snapshot.empty) {
			lastVisible = snapshot.docs[snapshot.docs.length - 1]; // update for pagination
		}

		return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
	} catch (error) {
		console.error("Error fetching reviews:", error);
		return [];
	}
}

export const addCart = async (cartItem, createdAt) => {
	const cartRef = collection(db, "carts");
	await addDoc(cartRef, { items: [cartItem], createdAt: createdAt });
};
export const updateCart = async (docId, cartItem) => {
	const docRef = doc(db, "carts", docId);
	const snapshot = await getDoc(docRef);

	if (!snapshot.exists()) return;

	const cartData = snapshot.data();
	let items = cartData.items || [];

	// Find the index of the matching item
	const index = items.findIndex(
		(item) =>
			item.id === cartItem.id &&
			item.size === cartItem.size &&
			item.color === cartItem.color
	);

	if (index !== -1) {
		// Update quantity
		items[index].quantity = cartItem.quantity;

		// Save back the whole array
		await updateDoc(docRef, { items });
	}
};
export const addReview = async (productId, comment, rating, title) => {
	try {
		const reviewsRef = collection(db, "reviews");
		await addDoc(reviewsRef, {
			productId,
			comment,
			rating,
			title,
			orderId: "order123", // Placeholder, replace with actual order ID if available
			userId: "user123", // Placeholder, replace with actual user ID if available
			status: "approved", // New reviews are pending approval
			createdAt: new Date(),
		});
		console.log("Review added successfully");
	} catch (error) {
		console.error("Error adding review:", error);
	}
};
