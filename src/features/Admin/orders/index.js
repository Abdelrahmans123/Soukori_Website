import { OrdersPage } from "./ordersUI.js";

const orders = new OrdersPage();
orders
    .render()
    .then((container) => {
        document.getElementById("main-content").innerHTML = "";
        document.getElementById("main-content").appendChild(container);
    })
    .catch((error) => {
        console.error("Error rendering orders page:", error);
        const errorContainer = orders.renderError();
        document.getElementById("main-content").innerHTML = "";
        document.getElementById("main-content").appendChild(errorContainer);
    });
