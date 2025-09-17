const toggleSearch = () => {
	const searchIcon = document.querySelector(".mobile-icons .fa-search.icon");
	const searchBar = document.querySelector(".searchInput");
	console.log("Hello from toggleSearch.js");
	if (!searchIcon || !searchBar) {
		console.warn("Search elements not found.");
		return;
	}

	searchIcon.addEventListener("click", () => {
		searchBar.classList.toggle("d-none");
	});
};

export default toggleSearch;
