import { auth, db } from "../Auth/firebase-config.js";
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";
import { onAuthStateChanged, sendEmailVerification, updateEmail, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";

const ordersContainer = document.querySelector('.ordersData');



// Check if user is logged in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.log(auth.currentUser)
        ordersContainer.innerHTML = `
      <div class="alert alert-warning text-center" role="alert">
        Please <a href="../Auth/login.html">log in</a> to view your orders.
      </div>`;
        return;
    } else {
        loadOrders();
    }
});

async function loadOrders() {
    try {
        // Fetch user document
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            ordersContainer.innerHTML = `
        <div class="alert alert-info text-center" role="alert">
          No orders found.
        </div>`;
            return;
        }

        const userData = userDoc.data();
        const orderIds = userData.orders || [];

        if (orderIds.length === 0) {
            ordersContainer.innerHTML = `
        <div class="alert alert-info text-center" role="alert">
          No orders found.
        </div>`;
            return;
        }

        // Fetch order details
        const orders = [];
        for (const orderId of orderIds) {
            const orderRef = doc(db, 'orders', orderId);
            const orderDoc = await getDoc(orderRef);
            if (orderDoc.exists()) {
                orders.push({ id: orderId, ...orderDoc.data() });
            }
        }

        // Sort orders by timestamp (newest first)
        orders.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

        // Render orders
        ordersContainer.innerHTML = orders
            .map(order => {
                const address = order.address
                    ? `${order.address.streetAddress}, ${order.address.city}, ${order.address.state} ${order.address.zipCode}, ${order.address.country}`
                    : 'No address provided';
                const statuses = ["Shipped", "Pending", "Delivered"];
                const status = order.status || statuses[Math.floor(Math.random() * statuses.length)];
                const date = order.timestamp.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                return `
          <div class="order-card card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Order #${order.id}</h5>
              <span class=" badge bg-${status === 'Pending'
                        ? 'warning'   
                        : status === 'Shipped'
                            ? 'primary' 
                            : 'success'
                    }">
  ${status}
</span>
            </div>
            <div class="card-body">
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Total:</strong> $${order.total}</p>
              <p><strong>Shipping Address:</strong> ${address}</p>
              <p><strong>Phone Number:</strong> ${order.address.phoneNumber || 'N/A'}</p>
              <p><strong>Card:</strong> **** **** **** ${order.cardLastFour}</p>
              <p><strong>Items:</strong> ${order.cart.length} item${order.cart.length !== 1 ? 's' : ''}</p>
              <button class="btn btn-outline-dark btn-sm toggle-details" data-order-id="${order.id}">
                View Details
              </button>
              <div class="order-details mt-3" id="details-${order.id}" style="display: none;">
                <h6>Order Items:</h6>
                <ul class="list-group list-group-flush">
                  ${order.cart
                        .map(item => `
                      <li class="list-group-item">
                        ${item.name || 'Item'} (Qty: ${item.quantity || 1}) - $${item.price.toFixed(2) || 'N/A'}
                      </li>
                    `)
                        .join('')}
                </ul>
              </div>
            </div>
          </div>
        `;
            })
            .join('');

        // Add event listeners for toggling order details
        document.querySelectorAll('.toggle-details').forEach(button => {
            button.addEventListener('click', () => {
                const orderId = button.getAttribute('data-order-id');
                const detailsDiv = document.getElementById(`details-${orderId}`);
                detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
                button.textContent = detailsDiv.style.display === 'block' ? 'Hide Details' : 'View Details';
            });
        });

    } catch (err) {
        console.error('Error fetching orders:', err);
        ordersContainer.innerHTML = `
      <div class="alert alert-danger text-center" role="alert">
        Failed to load orders. Please try again later.
      </div>`;
    }
}
