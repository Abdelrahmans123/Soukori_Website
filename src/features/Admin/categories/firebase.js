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
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../../config/firebase.js";
export const getAllCategories = async () => {
    try {
        const categoriesRef = collection(db, "categories");
        const q = query(categoriesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching categories:", error);
        throw error;
    }
};
export const getCategoryById = async (categoryId) => {
    try {
        const categoryRef = doc(db, "categories", categoryId);
        const categorySnap = await getDoc(categoryRef);
        if (categorySnap.exists()) {
            return { id: categorySnap.id, ...categorySnap.data() };
        } else {
            throw new Error("No such category!");
        }
    } catch (error) {
        console.error("Error fetching category:", error);
        throw error;
    }
};
export const addCategory = async (categoryData) => {
    try {
        const categoriesRef = collection(db, "categories");
        const docRef = await addDoc(categoriesRef, {
            ...categoryData,
            createdAt: new Date(),
        });
        return { id: docRef.id, ...categoryData };
    } catch (error) {
        console.error("Error adding category:", error);
        throw error;
    }
};
export const updateCategory = async (categoryId, updatedData) => {
    try {
        const categoryRef = doc(db, "categories", categoryId);
        await updateDoc(categoryRef, updatedData);
    } catch (error) {
        console.error("Error updating category:", error);
        throw error;
    }
};
export const deleteCategoryById = async (categoryId) => {
    try {
        const categoryRef = doc(db, "categories", categoryId);
        await deleteDoc(categoryRef);
    } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
};
