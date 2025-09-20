import changeColor from "./changeColor.js";
import changeSizeOption from "./changeSizeOption.js";
import changeSortText from "./changeSortText.js";
import closeFilter from "./closeFilter.js";
import RangeSlider from "./RangeSlider.js";
import showSortDropdown from "./showSortDropdown.js";

let sidebarRangeSlider;
let offcanvasRangeSlider;

function initializeRangeSliders() {
	// Sidebar range slider
	sidebarRangeSlider = new RangeSlider(
		".filters .range-container",
		"range-min",
		"range-max",
		"slider-range",
		"min-label",
		"max-label"
	);

	// Offcanvas range slider
	offcanvasRangeSlider = new RangeSlider(
		"#filtersOffcanvas .range-container",
		"range-min-mobile",
		"range-max-mobile",
		"slider-range-mobile",
		"min-label-mobile",
		"max-label-mobile"
	);
}

// Handle window resize
window.addEventListener("resize", () => {
	clearTimeout(window.rangeUpdateTimeout);
	window.rangeUpdateTimeout = setTimeout(() => {
		if (sidebarRangeSlider) sidebarRangeSlider.updateRange();
		if (offcanvasRangeSlider) offcanvasRangeSlider.updateRange();
	}, 150);
});

// Bootstrap offcanvas event handlers
const filtersOffcanvas = document.getElementById("filtersOffcanvas");
if (filtersOffcanvas) {
	filtersOffcanvas.addEventListener("shown.bs.offcanvas", function () {
		setTimeout(() => {
			if (offcanvasRangeSlider) offcanvasRangeSlider.updateRange();
		}, 200);
	});

	filtersOffcanvas.addEventListener("show.bs.offcanvas", function () {
		setTimeout(() => {
			if (offcanvasRangeSlider) offcanvasRangeSlider.updateRange();
		}, 100);
	});
}

// Initialize when DOM is ready
function initializeAll() {
	initializeRangeSliders();
	setTimeout(() => {
		if (sidebarRangeSlider) sidebarRangeSlider.updateRange();
		if (offcanvasRangeSlider) offcanvasRangeSlider.updateRange();
	}, 100);
	setTimeout(() => {
		if (sidebarRangeSlider) sidebarRangeSlider.updateRange();
		if (offcanvasRangeSlider) offcanvasRangeSlider.updateRange();
	}, 300);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeAll);
} else {
	initializeAll();
}
closeFilter();
showSortDropdown();
changeSortText();

changeColor();
changeSizeOption();
