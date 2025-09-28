import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";
import { db, auth } from "../Auth/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";

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
const checkoutForm = document.getElementById('checkoutForm');
const hide_for_checkout = document.querySelectorAll('.delete_for_checkout');
const placeorderbtn = document.getElementById('placeorder');
const tax = document.getElementById('tax');
const checkoutDetails = document.getElementById('checkoutDetails');


let subTotal = 0;
let appliedDiscount = 0;
let cartId = null;
let isCartLoaded = false;

function getLocalStorageCart() {
  try {
    const data = localStorage.getItem("carts");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn("Corrupted cart in LS, resetting", err);
    localStorage.setItem("carts", JSON.stringify([]));
    return [];
  }
}

function setLocalStorageCart(cart) {
  localStorage.setItem("carts", JSON.stringify(cart));
}

function recalcSubtotal() {
  const cart = getLocalStorageCart();
  subTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateSummary() {
  recalcSubtotal();
  const deliveryFee = subTotal * 0.01;
  const taxes = subTotal * 0.14;
  const total = subTotal * (1 + 0.14 + 0.01) * (1 - appliedDiscount);

  subtotalEl.textContent = `$${subTotal.toFixed(2)}`;
  discountEl.textContent = `${appliedDiscount * 100}%`;
  tax.textContent = `$${taxes.toFixed(2)}`;
  document.getElementById("deliveryFee").textContent = `$${deliveryFee.toFixed(2)}`;
  totalEl.textContent = `$${total.toFixed(2)}`;
}

function showMessage(msg, type = "info") {
  const oldMsg = document.getElementById("promoMessage");
  if (oldMsg) oldMsg.remove();

  const msgDiv = document.createElement("div");
  msgDiv.id = "promoMessage";
  msgDiv.className = `alert alert-${type} rounded-2`;
  msgDiv.textContent = msg;
  msgDiv.style.position = "absolute";
  msgDiv.style.top = "10%";
  msgDiv.style.left = "50%";
  msgDiv.style.transform = "translateX(-50%)";
  msgDiv.style.zIndex = "1000";
  msgDiv.style.display = "inline-block";
  msgDiv.style.whiteSpace = "nowrap";
  msgDiv.style.padding = "0.5rem 1rem";
  orderSummary.style.position = "relative";
  orderSummary.appendChild(msgDiv);

  setTimeout(() => {
    msgDiv.remove();
  }, 1000);
}

function showCheckoutForm() {
  cartCheckoutWrapper.classList.add('slide-to-checkout');
  checkoutForm.classList.remove('d-none');
}

function showCart() {
  checkoutForm.classList.add('d-none');
  cartCheckoutWrapper.classList.remove('slide-to-checkout');
}

/* FIRESTORE SYNC */
async function saveLStoFS() {
  if (!cartId) return;
  try {
    const cartRef = doc(db, "carts", cartId);
    const cartLS = getLocalStorageCart();
    await updateDoc(cartRef, {
      items: cartLS,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed LS → FS sync:", err);
  }
}

async function mergeFS_LS(cartId) {
  const cartRef = doc(db, "carts", cartId);
  const cartSnap = await getDoc(cartRef);

  let cartFS = [];
  if (cartSnap.exists()) cartFS = cartSnap.data().items || [];

  let cartLS = getLocalStorageCart();

  // Merge: FS quantity wins over LS if they have the same items 
  let merged = [...cartFS];

  cartLS.forEach(itemLS => {
    const idx = merged.findIndex(itemFS =>
      itemFS.id === itemLS.id &&
      itemFS.color === itemLS.color &&
      itemFS.size === itemLS.size
    );
    if (idx === -1) {
      merged.push(itemLS);
    }
  });

  setLocalStorageCart(merged);

  // Sync merged back to FS
  await updateDoc(cartRef, {
    items: merged,
    updatedAt: serverTimestamp(),
  });

  showItemsFromCart();
}

/* RENDER CART */
function showItemsFromCart() {
  const cart = getLocalStorageCart();
  let html = "";

  if (cart.length === 0) {
    cartDetails.innerHTML = `<div class="text-center"><p>Your cart is empty.</p></div>`;
    checkoutBTN.disabled = true;
    isCartLoaded = true;
    updateSummary();
    return;
  }

  cart.forEach((item, index) => {
    console.log('index', index);
    console.log('cart.length', cart.length);


    html += `
      <div class="row align-items-center mb-3 pb-3 ${index === cart.length - 1 ? '' : 'border-bottom border-secondary-subtle'}" data-index="${index}">
        <div class="col-4 text-center">
          <img src="${item.image || 'placeholder.jpg'}" alt="${item.name}" class="img-fluid" style="width: 120px; height: 120px; object-fit: cover; border-radius: 10px;">
        </div>
        <div class="col-4">
          <h5>${item.name}</h5>
          <p>Size: ${item.size}</p>
          <p>Color: <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${item.color};"></span></p>
          <p>Price: $${item.price.toFixed(2)}</p>
        </div>
        <div class="col-4 d-flex align-items-center">
          <button class="btn btn-outline-danger btn-sm me-2 delete-btn">🗑</button>
          <div class="input-group input-group-sm" style="width: 100px;">
            <button class="btn btn-outline-secondary decrement-btn" type="button">-</button>
            <input type="text" class="form-control text-center quantity" value="${item.quantity}" readonly>
            <button class="btn btn-outline-secondary increment-btn" type="button">+</button>
          </div>
        </div>
      </div>
    `;
  });

  cartDetails.innerHTML = html;
  isCartLoaded = true;
  attachCartEvents();
  updateSummary();
}

function updateCartBadge() {
    const carts = JSON.parse(localStorage.getItem("carts")) || [];
    const cartBadge = document.querySelector(".badge.rounded-pill.bg-danger");
    if (carts.length > 0) {
        cartBadge.textContent = `${carts.length}`; // make sure it's visible
    } else {
        cartBadge.textContent = "";
    }
}

/* CART EVENTS */
function attachCartEvents() {
  const cart = getLocalStorageCart();

  cartDetails.querySelectorAll(".row[data-index]").forEach(row => {
    const index = parseInt(row.dataset.index);
    const deleteBtn = row.querySelector(".delete-btn");
    const decrementBtn = row.querySelector(".decrement-btn");
    const incrementBtn = row.querySelector(".increment-btn");
    const quantityInput = row.querySelector(".quantity");

    deleteBtn.addEventListener("click", () => {
      cart.splice(index, 1);
      setLocalStorageCart(cart);
      saveLStoFS();
      updateCartBadge();
      showItemsFromCart();
    });

    decrementBtn.addEventListener("click", () => {
      if (cart[index].quantity > 1) {
        cart[index].quantity--;
        setLocalStorageCart(cart);
        saveLStoFS();
        quantityInput.value = cart[index].quantity;
        updateSummary();
      }
    });

    incrementBtn.addEventListener("click", () => {
      cart[index].quantity++;
      setLocalStorageCart(cart);
      saveLStoFS();
      quantityInput.value = cart[index].quantity;
      updateSummary();
    });
  });
}

function itemMessages(msg, index) {
  const msgDiv = document.createElement("div");
  msgDiv.id = "itemMessage";
  msgDiv.className = `alert alert-warning rounded-2 text-center fs-5`;
  msgDiv.textContent = msg;
  msgDiv.style.position = "absolute";
  msgDiv.style.top = "30%";
  msgDiv.style.left = "50%";
  msgDiv.style.transform = "translateX(-50%)";
  msgDiv.style.zIndex = "1000";
  msgDiv.style.display = "inline-block";
  msgDiv.style.whiteSpace = "nowrap";
  msgDiv.style.padding = "0.5rem 1rem";
  const selectedChild = cartDetails.children[index];
  selectedChild.style.position = 'relative';
  selectedChild.appendChild(msgDiv)

  setTimeout(() => {
    msgDiv.remove();
  }, 2000);
}

/* STOCK CHECK*/
async function stockCheck(cartLS) {
  let errors = [];
  let checkResult = 1;
  for (let index = 0; index < cartLS.length; index++) {
    const item = cartLS[index];
    const productRef = doc(db, "products", item.id);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      errors.push("There was a problem with this product!", index)
      checkResult = -1;
    }

    const variants = productSnap.data().variants;
    const variantINDEX = variants.findIndex(m => m.color === item.color);
    if (variantINDEX === -1) {
      errors.push("There was a problem with this product!", index)
      checkResult = -1;
    }

    const variantSizes = variants[variantINDEX].sizes;
    const sizeIndex = variantSizes.findIndex(m => m.size === item.size);
    if (sizeIndex === -1) {
      errors.push("There was a problem with this product!", index)
      checkResult = -1;
    }

    const stockQuantity = variantSizes[sizeIndex].quantity;
    if (item.quantity > stockQuantity) {
      errors.push(`Only ${stockQuantity} left in stock`, index)
      checkResult = -1;
    }
  }
  for (let i = 0; i < errors.length; i += 2) {
    itemMessages(errors[i], errors[i + 1])
  }

  return checkResult;
}

/* CHECKOUT*/
checkoutBTN.addEventListener('click', async () => {
  checkoutBTN.disabled = true;
  const originalText = checkoutBTN.innerHTML;
  checkoutBTN.innerHTML = 'Loading Cart...<span class="spinner"><span>';
  if (!isCartLoaded) {
    showMessage('Please wait for the cart to load', 'warning');
    checkoutBTN.innerHTML = originalText;
    checkoutBTN.disabled = false;
    return;
  }
  const user = auth.currentUser;
  checkoutBTN.innerHTML = 'Checking user...<span class="spinner"><span>';
  if (!user) {
    // Not logged in
    showMessage('⚠️ You must log in before checkout', 'danger');
    checkoutBTN.innerHTML = originalText;
    checkoutBTN.disabled = false;
    return;
  }
  checkoutBTN.innerHTML = 'Checking stock...<span class="spinner"><span>';
  // check stock before placing order
  const stockStatus = await stockCheck(getLocalStorageCart());
  console.log('stockStatus: ', stockStatus);

  if (stockStatus === 1) {
    hide_for_checkout.forEach((item) => {
      item.classList.add('d-none');
    })
    showCheckoutForm();
  }
  checkoutBTN.innerHTML = originalText;
  checkoutBTN.disabled = false;
})

/* PROMO BUTTON */
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
      showMessage(`✅ Promo applied! ${appliedDiscount * 100}% off`, "success");
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

/* BACK TO CART BUTTON */
backToCartBtn.addEventListener('click', (e) => {
  e.preventDefault();
  hide_for_checkout.forEach((item) => {
    item.classList.remove('d-none');
  })
  showCart();
});

/* PLACING ORDERS */
checkoutDetails.addEventListener("submit", async (e) => {
  e.preventDefault();

  // check if user is logged in
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to checkout.");
    return;
  }

  // check if email is verified
  if (!user.emailVerified) {
    alert("Please verify your email before checking out.");
    return;
  }

  placeorderbtn.disabled = true;
  placeorderbtn.innerHTML = `Redirecting to Stripe...<span class="spinner"></span>`;

  const streetAddress = document.getElementById('streetAddress').value;
  const city = document.getElementById('city').value;
  const state = document.getElementById('state').value;
  const zipCode = document.getElementById('zipCode').value;
  const country = document.getElementById('country').value;
  const phoneNumber = document.getElementById('phoneNumber').value;

  const orderId = `${Date.now()}`;
  const cartItems = getLocalStorageCart();
  const userId = user.uid;
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

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  showItemsFromCart();
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      cartId = userSnap.data().cartID;
      await mergeFS_LS(cartId);
    }
  } else {
    cartId = null; // guest cart only
    showItemsFromCart();
  }
});
