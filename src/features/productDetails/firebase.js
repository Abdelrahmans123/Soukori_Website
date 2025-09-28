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
	setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";
import { auth } from "../../javascripts/Auth/firebase-config.js";
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
	let lastVisible = null;
	const pageSize = 5;
	try {
		const reviewsRef = collection(db, "reviews");
		let q = query(
			reviewsRef,
			where("productId", "==", productId),
			where("status", "==", "approved"),
			orderBy("createdAt", "desc"),
			limit(pageSize)
		);
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
			lastVisible = snapshot.docs[snapshot.docs.length - 1];
		}

		return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
	} catch (error) {
		console.error("Error fetching reviews:", error);
		return [];
	}
}

export async function addCartToFirestore(cartItem, timestamp, userId) {
	try {
		const cartRef = doc(db, "carts", userId); // Use userId directly as document ID
		const cartSnap = await getDoc(cartRef);

		if (!cartSnap.exists()) {
			// Create new cart document
			await setDoc(cartRef, {
				userId: userId,
				items: [cartItem],
				createdAt: timestamp,
				updatedAt: timestamp,
			});
		} else {
			// Update existing cart
			const existingCart = cartSnap.data();
			const existingItems = existingCart.items || [];

			const existingItemIndex = existingItems.findIndex(
				(item) =>
					item.id === cartItem.id &&
					item.size === cartItem.size &&
					item.color === cartItem.color
			);

			if (existingItemIndex > -1) {
				existingItems[existingItemIndex].quantity += cartItem.quantity;
			} else {
				existingItems.push(cartItem);
			}

			await updateDoc(cartRef, {
				items: existingItems,
				updatedAt: timestamp,
			});
		}
		console.log("Cart updated successfully in Firestore");
	} catch (error) {
		console.error("Error in addCartToFirestore function:", error);
		throw error;
	}
}

export const updateCart = async (docId, cartItem) => {
	const docRef = doc(db, "carts", docId);
	const snapshot = await getDoc(docRef);

	if (!snapshot.exists()) return;

	const cartData = snapshot.data();
	let items = cartData.items || [];
	const index = items.findIndex(
		(item) =>
			item.id === cartItem.id &&
			item.size === cartItem.size &&
			item.color === cartItem.color
	);

	if (index !== -1) {
		items[index].quantity = cartItem.quantity;
		await updateDoc(docRef, { items });
	}
};
export const addReview = async (productId, comment, rating, title, userId) => {
	try {
		const userRef = doc(db, "users", userId);
		const userSnap = await getDoc(userRef);
		if (!userSnap.exists()) {
			throw new Error("User does not exist");
		}
		const ordersRef = collection(db, "orders");
		const ordersQuery = query(ordersRef, where("userId", "==", userId));
		const ordersSnapshot = await getDocs(ordersQuery);

		if (ordersSnapshot.empty) {
			throw new Error("No orders found for this user");
		}
		let hasOrderedProduct = false;
		let orderWithProduct = null;

		ordersSnapshot.forEach((doc) => {
			const orderData = doc.data();
			const items = orderData.items || [];

			for (let item of items) {
				if (item.id === productId || item.productId === productId) {
					hasOrderedProduct = true;
					orderWithProduct = { id: doc.id, ...orderData };
					break;
				}
			}
		});

		if (!hasOrderedProduct) {
			throw new Error("You can only review products you have purchased");
		}
		const productRef = doc(db, "products", productId);
		const productSnap = await getDoc(productRef);
		if (!productSnap.exists()) {
			throw new Error("Product does not exist");
		}
		const existingReviewSnapshot = await getDocs(
			query(
				collection(db, "reviews"),
				where("productId", "==", productId),
				where("userId", "==", userId)
			)
		);

		if (!existingReviewSnapshot.empty) {
			throw new Error("You have already reviewed this product");
		}

		// Add the review
		const reviewsRef = collection(db, "reviews");
		await addDoc(reviewsRef, {
			productId,
			comment,
			rating,
			title,
			orderId: orderWithProduct.id,
			userId: userId,
			status: "pending",
			createdAt: new Date(),
		});

		console.log("Review added successfully");
		return { success: true, message: "Review added successfully" };
	} catch (error) {
		console.error("Error adding review:", error);
		throw error;
	}
};
