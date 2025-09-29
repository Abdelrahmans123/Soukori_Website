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
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../../config/firebase.js";

export const getAllShipments = async () => {
	try {
		const shipmentsRef = collection(db, "shipments");
		const q = query(shipmentsRef, orderBy("createdAt", "desc"));
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching shipments:", error);
		throw error;
	}
};

export const getShipmentById = async (shipmentId) => {
	try {
		const shipmentRef = doc(db, "shipments", shipmentId);
		const shipmentSnap = await getDoc(shipmentRef);
		if (shipmentSnap.exists()) {
			return { id: shipmentSnap.id, ...shipmentSnap.data() };
		} else {
			throw new Error("No such shipment!");
		}
	} catch (error) {
		console.error("Error fetching shipment:", error);
		throw error;
	}
};

export const addShipment = async (shipmentData) => {
	try {
		const shipmentsRef = collection(db, "shipments");
		const docRef = await addDoc(shipmentsRef, {
			...shipmentData,
			createdAt: new Date(),
		});
		return { id: docRef.id, ...shipmentData };
	} catch (error) {
		console.error("Error adding shipment:", error);
		throw error;
	}
};

export const updateShipment = async (shipmentId, updatedData) => {
	try {
		const shipmentRef = doc(db, "shipments", shipmentId);
		await updateDoc(shipmentRef, {
			...updatedData,
			updatedAt: new Date(),
		});
	} catch (error) {
		console.error("Error updating shipment:", error);
		throw error;
	}
};

export const deleteShipmentById = async (shipmentId) => {
	try {
		const shipmentRef = doc(db, "shipments", shipmentId);
		await deleteDoc(shipmentRef);
	} catch (error) {
		console.error("Error deleting shipment:", error);
		throw error;
	}
};

export const getShipmentsByStatus = async (status) => {
	try {
		const shipmentsRef = collection(db, "shipments");
		const q = query(shipmentsRef, where("status", "==", status));
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));
	} catch (error) {
		console.error("Error fetching shipments by status:", error);
		throw error;
	}
};

export const addShipmentNote = async (shipmentId, note) => {
	try {
		const shipment = await getShipmentById(shipmentId);
		const history = shipment.history || [];
		history.push({
			...note,
			timestamp: new Date().toISOString(),
		});
		await updateShipment(shipmentId, { history });
	} catch (error) {
		console.error("Error adding shipment note:", error);
		throw error;
	}
};
