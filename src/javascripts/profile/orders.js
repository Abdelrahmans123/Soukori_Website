import { auth, db } from "../Auth/firebase-config.js";
import { query, where, getDocs, orderBy, collection, limit, startAfter } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.5/firebase-auth.js";

const ordersContainer = document.querySelector('.ordersData');

const spinny = document.getElementById("spinny");
const orderList = document.getElementById('ordersList');
let totalOrdersLoaded = 0;


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

let lastVisibleOrder = null;
const ORDERS_PAGE_SIZE = 2;

async function loadOrders(loadMore = false) {
  try {
    if (!auth.currentUser) {
      ordersContainer.innerHTML = `
        <div class="alert alert-warning text-center" role="alert">
          Please <a href="../Auth/login.html">log in</a> to view your orders.
        </div>`;
      return;
    }

    const ordersRef = collection(db, "orders");
    let q;

    if (lastVisibleOrder && loadMore) {
      q = query(
        ordersRef,
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleOrder),
        limit(ORDERS_PAGE_SIZE)
      );
    } else {
      // first page
      q = query(
        ordersRef,
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(ORDERS_PAGE_SIZE)
      );
    }

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      if (!loadMore) {
        spinny.style.display = 'none';
        ordersContainer.innerHTML = `
          <div class="alert alert-info text-center" role="alert">
            No orders found.
          </div>`;
      }
      return;
    }

    totalOrdersLoaded += querySnapshot.docs.length;

    // Update last visible order
    lastVisibleOrder = querySnapshot.docs[querySnapshot.docs.length - 1];

    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Render orders
    orders.forEach(order => {
      const address = order.address
        ? `${order.address.streetAddress}, ${order.address.city}, ${order.address.state} ${order.address.zipCode}, ${order.address.country}`
        : 'No address provided';
      const status = order.status || 'PENDING';
      const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      spinny.style.display = 'none';

      ordersList.innerHTML += `
        <div class="order-card card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Order #${order.id}</h5>
            <span class="badge bg-${status.toUpperCase() === 'PENDING' ? 'warning' :
          status.toUpperCase() === 'PAID' ? 'success' :
            status.toUpperCase() === 'FAILED' ? 'danger' :
              'secondary'}">
              ${status}
            </span>
          </div>
          <div class="card-body">
            <p><strong>Date:</strong> ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Total:</strong> $${order.total}</p>
            <p><strong>Shipping Address:</strong> ${address}</p>
            <p><strong>Phone Number:</strong> ${order.address?.phoneNumber || 'N/A'}</p>
            <p><strong>Transaction ID:</strong> ${order.transactionID || 'N/A'}</p>
            <p><strong>Items:</strong> ${order.items.length} item${order.items.length !== 1 ? 's' : ''}</p>
            <button class="btn btn-outline-dark btn-sm toggle-details" data-order-id="${order.id}">
              View Details
            </button>
            <div class="order-details mt-3" id="details-${order.id}" style="display: none;">
              <h6>Order Items:</h6>
              <ul class="list-group list-group-flush">
                ${order.items.map(item => `<li class="list-group-item">
                  ${item.name} (Size: ${item.size}, 
                  Color: <span style="
                    display:inline-block;
                    width:12px;
                    height:12px;
                    border-radius:50%;
                    background-color:${item.color};
                    border: 1px solid #ccc;
                    margin-right:5px;
                    vertical-align:middle;"></span>, 
                  Qty: ${item.quantity}) - Item Price: $${item.price.toFixed(2)} - Subtotal: $${(item.price * item.quantity).toFixed(2)}
                </li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `;
    });

    // Toggle details
    document.querySelectorAll('.toggle-details').forEach(button => {
      button.addEventListener('click', () => {
        const orderId = button.getAttribute('data-order-id');
        const detailsDiv = document.getElementById(`details-${orderId}`);
        const isVisible = detailsDiv.style.display === 'block';
        detailsDiv.style.display = isVisible ? 'none' : 'block';
        button.textContent = isVisible ? 'View Details' : 'Hide Details';
      });
    });

    // Show "Load More" button if there might be more orders
    const totalOrdersQuery = query(
      ordersRef,
      where("userId", "==", auth.currentUser.uid)
    );
    const totalOrdersSnapshot = await getDocs(totalOrdersQuery);
    if (totalOrdersLoaded < totalOrdersSnapshot.size) {
      console.log('1-', totalOrdersSnapshot.size);
      console.log('2-', totalOrdersLoaded);
      if (!document.getElementById('loadMoreBtn')) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'loadMoreBtn';
        loadMoreBtn.className = 'btn btn-outline-primary w-100 d-flex justify-content-center align-items-center my-3';
        loadMoreBtn.innerHTML = `
  <span class="me-2">Load Previous Orders</span>
  <svg class="spinner-border spinner-border-sm text-primary" role="status" style="display:none;" id="loadMoreSpinner">
    <span class="visually-hidden">Loading...</span>
  </svg>
`;
        ordersContainer.appendChild(loadMoreBtn);
        loadMoreBtn.addEventListener('click', () => loadOrders(true));
      }
    } else {
      console.log('222')
      // remove button if no more orders
      const btn = document.getElementById('loadMoreBtn');
      if (btn) btn.remove();
    }

  } catch (err) {
    console.error('Error fetching orders:', err);
    ordersContainer.innerHTML = `
      <div class="alert alert-danger text-center" role="alert">
        Failed to load orders. Please try again later.
      </div>`;
  }
}
