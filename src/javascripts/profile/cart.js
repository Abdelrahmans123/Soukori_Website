import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";
import { db } from "../Auth/firebase-config.js"; // your firebase init file

// Elements
const promoInput = document.getElementById("promoCode");
const promoBtn = document.getElementById("promoBTN");
const subtotalEl = document.getElementById("subtotal");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");
const orderSummary = document.getElementById("order_summary");

// Example values (you should calculate real cart subtotal)
let subtotal = 350;  
let deliveryFee = 10;
let appliedDiscount = 0;

// Initial render
updateSummary();

promoBtn.addEventListener("click", async () => {
  const code = promoInput.value.trim().toUpperCase();

  if (code) {
    try {
    const promoRef = doc(db, "promoCodes", code);
    const promoSnap = await getDoc(promoRef);

    if (!promoSnap.exists()) {
      showMessage("❌ Invalid promo code", "danger");
      return;
    }

    const promo = promoSnap.data();
    const now = new Date();

    if (!promo.isActive) {
      showMessage("⚠️ This promo code is not active", "warning");
      return;
    }

    if (promo.expiryDate.toDate() < now) {
      showMessage("❌ This promo code has expired", "danger");
      return;
    }

    if (subtotal < promo.minSubtotal) {
      showMessage(`⚠️ Minimum order of $${promo.minSubtotal} required`, "warning");
      return;
    }

    // Apply discount
    appliedDiscount = promo.discountPercent;
    showMessage(`✅ Promo applied! ${appliedDiscount}% off`, "success");
    updateSummary();

  } catch (err) {
    console.error(err);
    showMessage("⚠️ Something went wrong applying promo", "danger");
  }}
});

function updateSummary() {
  const discountAmount = (subtotal * appliedDiscount) / 100;
  const total = subtotal - discountAmount + deliveryFee;

  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  discountEl.textContent = `${appliedDiscount}%`;
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
