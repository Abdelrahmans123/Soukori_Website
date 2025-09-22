import { doc, getDoc, updateDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";
import { db, auth } from "../Auth/firebase-config.js"; // your firebase init file
import { onAuthStateChanged, sendEmailVerification, updateEmail, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";

// Elements
const promoInput = document.getElementById("promoCode");
const promoBtn = document.getElementById("promoBTN");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");
const orderSummary = document.getElementById("order_summary");
const cartDetails = document.getElementById('cartItems');
const checkoutBTN = document.getElementById('checkoutBTN');
const backToCartBtn = document.getElementById('backToCartBtn');
const cartContainer = document.getElementById('cartContainer');
const checkoutForm = document.getElementById('checkoutForm');
const hide_for_checkout = document.querySelectorAll('.delete_for_checkout');
const placeorderbtn = document.getElementById('placeorder');
const tax = document.getElementById('tax');

let storedCart = safeGetCart();
let subTotal = 0;
let appliedDiscount = 0;
let cartId = 0;
let isCartLoaded = false;
let userID;
// Show checkout form
function showCheckoutForm() {
  cartCheckoutWrapper.classList.add('slide-to-checkout');
  checkoutForm.classList.remove('d-none');
}

// Show cart
function showCart() {
  cartCheckoutWrapper.classList.remove('slide-to-checkout');
  setTimeout(() => {
    checkoutForm.classList.add('d-none');
  }, 500); // Match transition duration
  checkoutBTN.disabled = false; // Re-enable checkout button
}


// Helper: render "not logged in"
function showItemsFromCart() {
  storedCart = safeGetCart();
  let html = "";
  if (storedCart.length === 0) {
    syncFireStoreWithLocalStorage();
    cartDetails.innerHTML = `
      <div class="text-center">
        <p>Your cart is empty.</p>
      </div>
    `;
    checkoutBTN.disabled = true
    isCartLoaded = true;
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
  } catch { } finally { cartDetails.innerHTML = html; isCartLoaded = true; }

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
  const deliveryFee = subTotal * 0.01;
  const taxes = subTotal * 0.14;
  const total = subTotal * (1 + 0.14) * (1 - appliedDiscount) * 1.01; // Match first calc’s order
  subtotalEl.textContent = `$${subTotal.toFixed(2)}`;
  discountEl.textContent = `${appliedDiscount*100}%`;
  tax.textContent = `$${taxes.toFixed(2)}`;
  document.getElementById('deliveryFee').textContent = `$${deliveryFee.toFixed(2)}`;
  totalEl.textContent = `$${total.toFixed(2)}`;
}

function showMessage(msg, type = "info") {
  // Remove old message if it exists
  const oldMsg = document.getElementById("promoMessage");
  if (oldMsg) oldMsg.remove();

  const msgDiv = document.createElement("div");
  msgDiv.id = "promoMessage";
  msgDiv.className = `alert alert-${type} rounded-2`;
  msgDiv.textContent = msg;

  // Position absolutely inside orderSummary
  msgDiv.style.position = "absolute";
  msgDiv.style.top = "10%";
  msgDiv.style.left = "50%";
  msgDiv.style.transform = "translateX(-50%)";
  msgDiv.style.zIndex = "1000";
  // Make it fit message in one line
  msgDiv.style.display = "inline-block";
  msgDiv.style.whiteSpace = "nowrap";
  msgDiv.style.padding = "0.5rem 1rem"; // optional for spacing

  // Make sure parent is relative so absolute positioning works
  orderSummary.style.position = "relative";
  orderSummary.appendChild(msgDiv);

  setTimeout(() => {
    msgDiv.remove();
  }, 1000);
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
      if (storedCartLocal.length !== 0) {
        await updateDoc(cartRef, {
          items: storedCartLocal  // overwrite items array
        });
        console.log("Items synced successfully with Firestore");
      } else {
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
          const cartItemsFS = cartSnap.data().items || [];
          localStorage.setItem("carts", JSON.stringify(cartItemsFS));
          storedCart = cartItemsFS;
          console.log('sss', storedCart)
          console.log("Local storage updated from Firestore:", cartItemsFS);
        } else {
          console.log("No cart found in Firestore for this user");
        }
      }

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
  subTotal = Number(total);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      cartId = userSnap.data().cartID;
      userID = user.uid;
      if (userSnap.data().phone.length !== 0)
        document.getElementById('phoneNumber').value = userSnap.data().phone;
    }
  } else {
    cartId = 0;
  }
  showItemsFromCart();

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
    promoBtn.innerHTML = `Applying<span class="spinner"></span>`;
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
      appliedDiscount = promo.discountPercent / 100;
      showMessage(`✅ Promo applied! ${appliedDiscount*100}% off`, "success");
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


checkoutBTN.addEventListener('click', () => {
  checkoutBTN.disabled = true;
  const originalText = checkoutBTN.innerHTML;
  if (!isCartLoaded) {
    showMessage('Please wait for the cart to load', 'warning');
    checkoutBTN.disabled = false;
    return;
  }
  const user = auth.currentUser;
  if (!user) {
    // Not logged in
    showMessage('⚠️ You must log in before checkout', 'danger');
    checkoutBTN.disabled = false;
    return;
  } else {
    console.log(hide_for_checkout)
    hide_for_checkout.forEach((item) => {
      item.classList.add('d-none');
    })
    showCheckoutForm();
  }
})

backToCartBtn.addEventListener('click', (e) => {
  e.preventDefault();
  hide_for_checkout.forEach((item) => {
    item.classList.remove('d-none');
  })
  showCart();
});

// Handle checkout form submission
/* document.getElementById('checkoutDetails').addEventListener('submit', async (e) => {
  e.preventDefault();
  placeorderbtn.disabled = true;
  const originalText = placeorderbtn.innerHTML;
  placeorderbtn.innerHTML = `placing order..<span class="spinner"></span>`;
  try {
    // Collect address fields

    // Save order to Firestore
    const orderId = `${Date.now()}`;
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, {
      userId: auth.currentUser.uid,
      cart: safeGetCart(),
      total: totalEl.textContent.replace('$', ''),
      address: {
        streetAddress,
        city,
        state,
        zipCode,
        country,
        phoneNumber
      },
      timestamp: new Date(),
      cardLastFour: lastFourDigits,
    });

    // Update user's orders array
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      orders: arrayUnion(orderId)
    }).catch(async (error) => {
      // If user document doesn't exist, create it with the orders array
      if (error.code === 'not-found') {
        await setDoc(userRef, {
          orders: [orderId]
        });
      } else {
        throw error; // Re-throw other errors
      }
    });


    // Clear cart
    localStorage.setItem('carts', JSON.stringify([]));
    await updateDoc(doc(db, 'carts', cartId), { items: [] });
    hide_for_checkout.forEach((item) => {
      item.classList.remove('d-none');
    })
    showItemsFromCart();
    updateSummary();
    showCart()
    const modal = new bootstrap.Modal(document.getElementById('orderSuccessModal'));
    modal.show();
    document.getElementById('goToOrders').addEventListener('click', () => {
      window.location.href = "./orders.html";
    })
  } catch (err) {
    console.error('Checkout error:', err);
    alert('Failed to place order');
  }
}); */


/*
ORDERS TABLE
  userId,
  userAddress,
  items,
  total,
  phone,
  payment_method,
  promocode,
  currency,
  status (FAILED, PAID, SHIPPED, DELIVERED),
  createdAt,
  transactionNumber (from stripe),
 
TRANSACTION TABLE ()
  orderId,
  transactionNumber (from stripe),
  paymentResult,
  payment_method,
  createdAt,
  failureReason

  create order document for orders (both succesful and failed)
  create transcation document for failed orders
  
  
*/

document.getElementById("checkoutDetails").addEventListener("submit", async (e) => {
  e.preventDefault();

  placeorderbtn.disabled = true;
  placeorderbtn.innerHTML = `Redirecting to Stripe...<span class="spinner"></span>`;

  const streetAddress = document.getElementById('streetAddress').value;
  const city = document.getElementById('city').value;
  const state = document.getElementById('state').value;
  const zipCode = document.getElementById('zipCode').value;
  const country = document.getElementById('country').value;
  const phoneNumber = document.getElementById('phoneNumber').value;

  const orderId = `${Date.now()}`;
  const cartItems = safeGetCart();
  const userId = auth.currentUser?.uid;
  const discount = appliedDiscount;
  try {
    const response = await fetch("http://localhost:4242/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartItems,
        orderId,
        userID: userId,
        discount,
        address: { streetAddress, city, state, zipCode, country, phoneNumber }
      })
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url; // Stripe Checkout redirect
    } else {
      throw new Error("Stripe session failed");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("Failed to start checkout");

    placeorderbtn.disabled = false;
    placeorderbtn.innerHTML = "Place Order";
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