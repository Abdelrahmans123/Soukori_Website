import {
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../../config/firebase.js";
import {
  showDeleteConfirmation,
  showSuccessMessage,
  showErrorMessage,
} from "../../../features/general/utils.js";

// Function to delete a product
async function deleteProduct(productId) {
  try {
    const result = await showDeleteConfirmation();

    if (result.isConfirmed) {
      const productRef = doc(db, "products", productId); // Reference to the specific product
      await deleteDoc(productRef); // Delete the document

      const productCard = document.querySelector(
        `div[data-product-id="${productId}"]`
      );
      if (productCard) {
        productCard.closest(".col-lg-3").remove();
      }

      await showSuccessMessage(
        "Deleted!",
        "Product has been deleted successfully."
      );
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    showErrorMessage("Failed to delete product. Please try again.");
  }
}

