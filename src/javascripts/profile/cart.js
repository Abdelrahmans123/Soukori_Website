import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";
import { db, auth } from "../Auth/firebase-config.js"; // your firebase init file
import { onAuthStateChanged, sendEmailVerification, updateEmail, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";

// Elements
const promoInput = document.getElementById("promoCode");
const promoBtn = document.getElementById("promoBTN");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");
const orderSummary = document.getElementById("order_summary");
const storedCart = safeGetCart();

const cartDetails = document.getElementById('cartItems');
let subTotal = 0;
let appliedDiscount = 0;
let cartId = 0;

// Helper: render "not logged in"
function showItemsFromCart() {
  let html = "";
  if (storedCart.length === 0) {
    cartDetails.innerHTML = `
      <div class="text-center">
        <p>Your cart is empty.</p>
      </div>
    `;
    return;
  }
  let index = 0;
  try {
    for (const item of storedCart) {
      const price = item.price;
      const itemTotal = price * item.quantity;
      subTotal += itemTotal;
      subTotal = Number(subTotal.toFixed(2));
      html += `
          <div class="row align-items-center justify-content-center mb-3" data-cart-id="${0}" data-item-index="${index}">
            <div class="col-12 col-md-4 text-center">
              <img src="${item.image || 'placeholder.jpg'}" alt="${item.name}" class="img-fluid" style="width: 150px; height: 150px; object-fit: cover; border-radius: 10px;">
            </div>
            <div class="col-12 col-md-4 text-md-start text-center">
              <h5 class="fw-bold">${item.name}</h5>
              <p class="mb-1">Size: ${item.size}</p>
              <p class="mb-1">Color:<span style="display:inline-block;width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 1px #ddd;cursor:pointer;background-color:${item.color};margin-left:5px;"></span></p>
              <p class="mb-1 fw-semibold">Price: $${price.toFixed(2)}</p>
            </div>
            <div class="col-12 col-md-4 d-flex justify-content-center align-items-center text-center">
              <button class="btn btn-outline-danger btn-sm me-2 delete-item-btn">
                <i class="fas fa-trash"></i>
              </button>
              <div class="input-group input-group-sm" style="width: 100px;">
                <button class="btn btn-outline-secondary decrement-btn" type="button" data-price="${price}">-</button>
                <input type="text" class="form-control text-center quantity" value="${item.quantity}" min="1" readonly>
                <button class="btn btn-outline-secondary increment-btn" type="button" data-price="${price}">+</button>
              </div>
            </div>
          </div>`;

      index++;
    }
  } catch { } finally { cartDetails.innerHTML = html; }

  // Attach event listeners for delete and quantity buttons
  const cartRows = cartDetails.querySelectorAll('.row[data-cart-id]');
  cartRows.forEach(row => {
    const index = parseInt(row.dataset.itemIndex);
    const quantityInput = row.querySelector('.quantity');
    let currentQuantity = parseInt(quantityInput.value);

    // Delete button
    const deleteBtn = row.querySelector('.delete-item-btn');
    deleteBtn.addEventListener('click', () => {
      deleteItemFromLocal(index);
      subTotal = Number((subTotal - parseFloat(decrementBtn.dataset.price) * currentQuantity).toFixed(2));
      updateSummary();
    });

    // Quantity buttons
    const decrementBtn = row.querySelector('.decrement-btn');
    const incrementBtn = row.querySelector('.increment-btn');

    decrementBtn.addEventListener('click', async () => {
      let currentQuantity = parseInt(quantityInput.value);
      if (currentQuantity > 1) {
        currentQuantity--;
        const price = parseFloat(decrementBtn.dataset.price);
        subTotal = Number((subTotal - price).toFixed(2));
        quantityInput.value--;
        changeCountInLocal(index, -1);
        updateSummary();
        syncFireStoreWithLocalStorage()
      }
    });

    incrementBtn.addEventListener('click', async () => {
      let currentQuantity = parseInt(quantityInput.value);
      currentQuantity++;
      const price = parseFloat(incrementBtn.dataset.price);
      subTotal = Number((subTotal + price).toFixed(2));
      quantityInput.value++;
      changeCountInLocal(index, 1);
      updateSummary();
      syncFireStoreWithLocalStorage();
    });
  });
  updateSummary();
  syncFireStoreWithLocalStorage();
}

function updateSummary() {
  recalcSubtotal();
  const deliveryFee = subTotal > 0 ? 5.00 : 0; // Example: $5 if cart has items
  const discountAmount = (subTotal * appliedDiscount) / 100;
  const total = subTotal - discountAmount + deliveryFee;

  subtotalEl.textContent = `$${subTotal.toFixed(2)}`;
  discountEl.textContent = `${appliedDiscount}%`;
  document.getElementById('deliveryFee').textContent = `$${deliveryFee.toFixed(2)}`;
  totalEl.textContent = `$${total.toFixed(2)}`;
}

function showMessage(msg, type = "info") {
  let msgDiv = document.getElementById("promoMessage");
  if (!msgDiv) {
    msgDiv = document.createElement("div");
    msgDiv.id = "promoMessage";
    msgDiv.className = "alert mt-2";
    orderSummary.appendChild(msgDiv);
  }
  msgDiv.className = `alert alert-${type} mt-2`;
  msgDiv.textContent = msg;

  setTimeout(() => {
    msgDiv.remove();
  }, 4000);
}

async function deleteItemFromLocal(index) {
  const targetDiv = document.querySelector(`div[data-item-index="${index}"]`);
  targetDiv.remove();
  const storedCartLocal = safeGetCart();
  const idx = storedCartLocal.findIndex(item =>
    item.id === storedCart[index].id &&
    item.name === storedCart[index].name &&
    item.price === storedCart[index].price &&
    item.color === storedCart[index].color &&
    item.timestamp === storedCart[index].timestamp
  );
  if (idx !== -1) {
    storedCartLocal.splice(idx, 1);
    localStorage.setItem("carts", JSON.stringify(storedCartLocal));
    console.log("Item deleted successfully");
    if (cartDetails.textContent.trim() === '') {
      cartDetails.innerHTML = `
      <div class="text-center">
        <p>Your cart is empty.</p>
      </div>
    `;
    }
    if (cartId && cartId !== 0) {
      try {
        const cartRef = doc(db, "carts", cartId);
        await updateDoc(cartRef, {
          items: storedCartLocal  // overwrite items array
        });
        console.log("Item deleted successfully from Firestore");
      } catch (err) {
        console.error("Failed to delete from Firestore:", err);
      }
    }
    
  }
}

function changeCountInLocal(index, change) {
  const storedCartLocal = safeGetCart();
  const idx = storedCartLocal.findIndex(item =>
    item.id === storedCart[index].id &&
    item.name === storedCart[index].name &&
    item.price === storedCart[index].price &&
    item.color === storedCart[index].color &&
    item.timestamp === storedCart[index].timestamp
  );
  if (idx !== -1) {
    storedCartLocal[idx].quantity += change;
    localStorage.setItem("carts", JSON.stringify(storedCartLocal));
  }
}

async function syncFireStoreWithLocalStorage() {
  if (cartId && cartId !== 0) {
    try {
      const storedCartLocal = safeGetCart();
      const cartRef = doc(db, "carts", cartId);
      await updateDoc(cartRef, {
        items: storedCartLocal  // overwrite items array
      });
      console.log("Items synced successfully from Firestore");
    } catch (err) {
      console.error("Failed to sync with Firestore:", err);
    }
  }
}

function recalcSubtotal() {
  const storedCartLocal = safeGetCart();
  let total = 0;
  for (const item of storedCartLocal) {
    total += item.price * item.quantity;
  }
  subTotal = Number(total.toFixed(2));
}

onAuthStateChanged(auth, async (user) => {
  showItemsFromCart()
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      cartId = userSnap.data().cartID;
    }
  } else {
    cartId = 0;
  }

})

// Helper: render loading spinner
function showLoading() {
  cartDetails.innerHTML = `
    <div class="d-flex justify-content-center align-items-center p-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;
}

promoBtn.addEventListener("click", async () => {
  const code = promoInput.value.trim().toUpperCase();

  if (code) {
    promoBtn.disabled = true;
    const originalText = promoBtn.innerHTML;
    promoBtn.innerHTML = `Applying... <span class="spinner"></span>`;
    try {
      const promoRef = doc(db, "promoCodes", code);
      const promoSnap = await getDoc(promoRef);

      if (!promoSnap.exists()) {
        showMessage("❌ Invalid promo code", "danger");
        appliedDiscount = 0;
        updateSummary();
        return;
      }

      const promo = promoSnap.data();
      const now = new Date();

      if (!promo.isActive) {
        showMessage("⚠️ This promo code is not active", "warning");
        appliedDiscount = 0;
        updateSummary();
        return;
      }

      if (promo.expiryDate.toDate() < now) {
        showMessage("❌ This promo code has expired", "danger");
        appliedDiscount = 0;
        updateSummary();
        return;
      }

      if (subTotal < promo.minSubtotal) {
        showMessage(`⚠️ Minimum order of $${promo.minSubtotal} required`, "warning");
        appliedDiscount = 0;
        updateSummary();
        return;
      }

      // Apply discount
      appliedDiscount = promo.discountPercent;
      showMessage(`✅ Promo applied! ${appliedDiscount}% off`, "success");
      updateSummary();

    } catch (err) {
      console.error(err);
      showMessage("⚠️ Something went wrong applying promo", "danger");
    } finally {
      promoBtn.disabled = false;
      promoBtn.innerHTML = originalText;
    }
  } else {
    appliedDiscount = 0;
    updateSummary();
    return;
  }
});

showLoading();

function safeGetCart() {
  try {
    const data = localStorage.getItem("carts");
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) throw new Error("Cart is not an array");
    return parsed;
  } catch (err) {
    console.warn("Corrupted cart in localStorage, resetting...", err);
    localStorage.setItem("carts", JSON.stringify([]));
    return [];
  }
}