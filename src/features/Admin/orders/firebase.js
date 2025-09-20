import {
	collection,
	query,
	getDocs,
	doc,
	getDoc,
	updateDoc,
	orderBy,
	writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../../config/firebase.js";

export const getAllOrders = async () => {
	try {
		const ordersRef = collection(db, "orders");
		const q = query(ordersRef, orderBy("createdAt", "desc"));
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching orders:", error);
		throw error;
	}
};

export const getOrderById = async (orderId) => {
	try {
		const orderRef = doc(db, "orders", orderId);
		const orderSnap = await getDoc(orderRef);
		if (orderSnap.exists()) {
			return { id: orderSnap.id, ...orderSnap.data() };
		} else {
			throw new Error("No such order!");
		}
	} catch (error) {
		console.error("Error fetching order:", error);
		throw error;
	}
};

export const updateOrderStatus = async (orderId, newStatus) => {
	try {
		const orderRef = doc(db, "orders", orderId);
		await updateDoc(orderRef, {
			status: newStatus,
			updatedAt: new Date().toISOString(),
		});
		return { id: orderId, status: newStatus };
	} catch (error) {
		console.error("Error updating order status:", error);
		throw error;
	}
};

// Batch update multiple orders
export const updateMultipleOrderStatuses = async (orderIds, newStatus) => {
	try {
		const batch = writeBatch(db);
		const updateTime = new Date().toISOString();

		orderIds.forEach((orderId) => {
			const orderRef = doc(db, "orders", orderId);
			batch.update(orderRef, {
				status: newStatus,
				updatedAt: updateTime,
			});
		});

		await batch.commit();

		return orderIds.map((id) => ({ id, status: newStatus }));
	} catch (error) {
		console.error("Error updating multiple order statuses:", error);
		throw error;
	}
};

export const getUserById = async (userId) => {
	try {
		const userRef = doc(db, "users", userId);
		const userSnap = await getDoc(userRef);
		if (userSnap.exists()) {
			return { id: userSnap.id, ...userSnap.data() };
		} else {
			throw new Error("No such user!");
		}
	} catch (error) {
		console.error("Error fetching user:", error);
		throw error;
	}
};

// New function to get product details
export const getProductById = async (productId) => {
	try {
		const productRef = doc(db, "products", productId);
		const productSnap = await getDoc(productRef);
		if (productSnap.exists()) {
			return { id: productSnap.id, ...productSnap.data() };
		} else {
			throw new Error("No such product!");
		}
	} catch (error) {
		console.error("Error fetching product:", error);
		throw error;
	}
};

// Function to get all products (useful for dropdowns, etc.)
export const getAllProducts = async () => {
	try {
		const productsRef = collection(db, "products");
		const querySnapshot = await getDocs(productsRef);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching products:", error);
		throw error;
	}
};

// Batch function to get orders with expanded items
export const getOrdersWithExpandedItems = async (limit = 50) => {
	try {
		const orders = await getAllOrders();
		const limitedOrders = orders.slice(0, limit);

		const expandedItems = [];

		for (const order of limitedOrders) {
			if (order.items && Array.isArray(order.items)) {
				for (const item of order.items) {
					expandedItems.push({
						// Order info
						orderId: order.id,
						orderDate: order.createdAt,
						orderStatus: order.status,
						grandTotal: order.grandTotal,
						subtotal: order.subtotal,
						tax: order.tax,
						shipping: order.shipping,
						userId: order.userId,

						// Item info
						productId: item.productId,
						productName: item.name,
						brand: item.brand,
						category: item.category,
						price: item.price,
						quantity: item.quantity,
						total: item.total,
						discount: item.discount,
						variant: item.variant,
					});
				}
			}
		}

		return expandedItems;
	} catch (error) {
		console.error("Error fetching expanded order items:", error);
		throw error;
	}
};

// Get orders by status
export const getOrdersByStatus = async (status) => {
	try {
		const ordersRef = collection(db, "orders");
		const q = query(
			ordersRef,
			where("status", "==", status),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching orders by status:", error);
		throw error;
	}
};

// Get order statistics
export const getOrderStats = async () => {
	try {
		const orders = await getAllOrders();

		const stats = {
			totalOrders: orders.length,
			totalRevenue: orders.reduce(
				(sum, order) => sum + (order.grandTotal || 0),
				0
			),
			totalItems: orders.reduce((sum, order) => {
				return sum + (order.items ? order.items.length : 0);
			}, 0),
			statusBreakdown: {
				pending: orders.filter((order) => order.status === "pending").length,
				delivered: orders.filter((order) => order.status === "delivered")
					.length,
				cancelled: orders.filter((order) => order.status === "cancelled")
					.length,
				processing: orders.filter((order) => order.status === "processing")
					.length,
				shipped: orders.filter((order) => order.status === "shipped").length,
			},
			avgOrderValue:
				orders.length > 0
					? orders.reduce((sum, order) => sum + (order.grandTotal || 0), 0) /
					  orders.length
					: 0,
		};

		return stats;
	} catch (error) {
		console.error("Error calculating order stats:", error);
		throw error;
	}
};
