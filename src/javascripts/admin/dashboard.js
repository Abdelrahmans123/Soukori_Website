const selectAll = document.getElementById("select-all");
const checkboxes = document.querySelectorAll(".row-checkbox");

// select all
selectAll.addEventListener("change", function () {
    checkboxes.forEach((cb) => (cb.checked = this.checked));
});

// select-all
checkboxes.forEach((cb) => {
    cb.addEventListener("change", function () {
        if (!this.checked) {
            selectAll.checked = false;
        } else if (
            document.querySelectorAll(".row-checkbox:checked").length ===
            checkboxes.length
        ) {
            selectAll.checked = true;
        }
    });
});

const toggleBtn = document.getElementById("toggleSidebar");
const sidebar = document.querySelector(".sidebar");

toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});

const ctx = document.getElementById("saleChart").getContext("2d");
new Chart(ctx, {
    type: "line",
    data: {
        labels: ["Sep 1", "Sep 5", "Sep 10", "Sep 15", "Sep 18"],
        datasets: [
            {
                label: "Sales",
                data: [100, 120, 140, 160, 180],
                borderColor: "#144e4e",
                borderWidth: 2,
                fill: false,
                tension: 0.3,
            },
        ],
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return "₹" + value;
                    },
                },
            },
        },
        plugins: { legend: { display: false } },
    },
});


