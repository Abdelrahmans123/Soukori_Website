// Enhanced productUI.js with Global Search Integration
import { Pagination } from "../Pagination/firebase.js";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";

const pageSize = 6;
const tableName = "products";
const productPagination = new Pagination(pageSize, tableName);

// Search-related variables
let currentSearchTerm = '';
let allProductsCache = [];
let isSearchMode = false;
let searchResultsCount = 0;

// Initialize products
export async function initializeProducts() {
    try {
        showLoadingState();

        // Check for search parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search');
        
        if (searchTerm && searchTerm.trim()) {
            // Fill search inputs
            document.querySelectorAll('.searchInput input[type="search"]').forEach(input => {
                input.value = searchTerm;
            });
            
            // Perform search
            await searchProducts(searchTerm);
            return;
        }

        // Normal pagination flow
        isSearchMode = false;
        await productPagination.getTotalCount();
        const result = await productPagination.getFirstPage();
        renderProducts(result.content);
        updatePaginationUI(result);

        return result;
    } catch (error) {
        console.error("Error initializing products:", error);
        showErrorState(error);
        throw error;
    }
}

// Search products function
export async function searchProducts(searchTerm) {
    if (!searchTerm || searchTerm.trim().length === 0) {
        // If empty search, return to normal pagination
        isSearchMode = false;
        currentSearchTerm = '';
        await initializeProducts();
        return;
    }

    try {
        showLoadingState();
        isSearchMode = true;
        currentSearchTerm = searchTerm.toLowerCase();

        // Load all products if not cached
        if (allProductsCache.length === 0) {
            await loadAllProductsForSearch();
        }

        // Filter products based on search term
        const filteredProducts = allProductsCache.filter(product => {
            const searchableText = [
                product.name || '',
                product.description || '',
                product.category || '',
                product.brand || '',
                ...(product.tags || [])
            ].join(' ').toLowerCase();

            return searchableText.includes(currentSearchTerm);
        });

        // Sort by relevance (name matches first)
        filteredProducts.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            
            const aNameMatch = aName.includes(currentSearchTerm);
            const bNameMatch = bName.includes(currentSearchTerm);
            
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            return aName.localeCompare(bName);
        });

        searchResultsCount = filteredProducts.length;

        // Render filtered products
        renderProducts(filteredProducts);

        // Update pagination for search results
        updateSearchPaginationUI(filteredProducts.length, searchTerm);

        // Update breadcrumb
        updateBreadcrumbForSearch(searchTerm);

    } catch (error) {
        console.error("Error searching products:", error);
        showErrorState(error);
    }
}

// Load all products for searching
async function loadAllProductsForSearch() {
    try {
        console.log('Loading all products for search...');
        
        const productsQuery = query(
            collection(db, "products"),
            where("status", "==", "available"),
            orderBy("name")
        );
        
        const snapshot = await getDocs(productsQuery);
        allProductsCache = [];
        
        snapshot.forEach((doc) => {
            allProductsCache.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Loaded ${allProductsCache.length} products for search`);
    } catch (error) {
        console.error("Error loading all products:", error);
        
        // Fallback: try without orderBy if it fails
        try {
            const fallbackQuery = query(
                collection(db, "products"),
                where("status", "==", "available")
            );
            
            const snapshot = await getDocs(fallbackQuery);
            allProductsCache = [];
            
            snapshot.forEach((doc) => {
                allProductsCache.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Fallback: Loaded ${allProductsCache.length} products for search`);
        } catch (fallbackError) {
            console.error("Fallback search loading failed:", fallbackError);
            throw fallbackError;
        }
    }
}

// Update pagination UI for search results
function updateSearchPaginationUI(totalResults, searchTerm) {
    const showNumbers = document.querySelector(".showNumbers p");
    if (showNumbers) {
        showNumbers.innerHTML = `
            <span>Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "<strong>${searchTerm}</strong>"</span>
        `;
    }

    // Hide pagination controls in search mode
    const paginationContainer = document.querySelector(".pagination");
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }

    // Add clear search button
    addClearSearchButton();
}

// Add clear search button
function addClearSearchButton() {
    const showNumbers = document.querySelector(".showNumbers");
    if (showNumbers && !document.getElementById('clearSearchBtn')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clearSearchBtn';
        clearBtn.className = 'btn btn-outline-secondary btn-sm ms-3';
        clearBtn.innerHTML = '<i class="fas fa-times me-1"></i>Clear Search';
        
        clearBtn.addEventListener('click', clearSearch);
        showNumbers.appendChild(clearBtn);
    }
}

// Update breadcrumb for search
function updateBreadcrumbForSearch(searchTerm) {
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <li class="breadcrumb-item">
                <a href="../../index.html">Home</a>
                <i class="fa-solid fa-chevron-right"></i>
            </li>
            <li class="breadcrumb-item">
                <a href="./product.html">Shop</a>
                <i class="fa-solid fa-chevron-right"></i>
            </li>
            <li class="breadcrumb-item active" aria-current="page">
                Search: "${searchTerm}"
            </li>
        `;
    }
}

// Clear search function
export function clearSearch() {
    isSearchMode = false;
    currentSearchTerm = '';
    searchResultsCount = 0;
    
    // Clear search inputs
    document.querySelectorAll('.searchInput input[type="search"]').forEach(input => {
        input.value = '';
    });

    // Remove clear button
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
        clearBtn.remove();
    }

    // Restore normal pagination view
    const paginationContainer = document.querySelector(".pagination");
    if (paginationContainer) {
        paginationContainer.style.display = '';
    }

    // Restore original breadcrumb
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <li class="breadcrumb-item">
                <a href="../../index.html">Home</a>
                <i class="fa-solid fa-chevron-right"></i>
            </li>
            <li class="breadcrumb-item active" aria-current="page">Shop</li>
        `;
    }

    // Reload normal products
    initializeProducts();

    // Update URL
    const url = new URL(window.location);
    url.searchParams.delete('search');
    window.history.pushState({}, '', url);
}

// Existing pagination functions
export async function loadPage(pageNumber) {
    if (isSearchMode) {
        // Don't use pagination in search mode
        return;
    }
    
    try {
        showLoadingState();
        const result = await productPagination.goToPage(pageNumber);
        renderProducts(result.content);
        updatePaginationUI(result);
        return result;
    } catch (error) {
        console.error("Error loading page:", error);
        showErrorState(error);
        throw error;
    }
}

export async function nextPage() {
    if (isSearchMode) return;
    
    try {
        const result = await productPagination.getNextPage();
        renderProducts(result.content);
        updatePaginationUI(result);
        return result;
    } catch (error) {
        console.error(error.message);
    }
}

export async function previousPage() {
    if (isSearchMode) return;
    
    try {
        const result = await productPagination.getPreviousPage();
        renderProducts(result.content);
        updatePaginationUI(result);
        return result;
    } catch (error) {
        console.error(error.message);
    }
}

export function getPaginationState() {
    return productPagination.getPaginationInfo();
}

// Utility functions remain the same
function showLoadingState() {
    const productsContainer = document.getElementById("productsContainer");
    if (productsContainer) {
        productsContainer.innerHTML = `
            <div class="col-12">
                <div class="products-loading text-center py-5">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted">Loading products...</p>
                </div>
            </div>
        `;
    }
}

function showErrorState(error) {
    const productsContainer = document.getElementById("productsContainer");
    if (productsContainer) {
        productsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load products. Please try again later.
                    <br><small class="text-muted mt-2">${error.message}</small>
                    <br><button class="btn btn-outline-danger mt-2" onclick="location.reload()">Retry</button>
                </div>
            </div>
        `;
    }
}

function generateStarRating(avgRating) {
    let starsHTML = "";
    for (let i = 0; i < 5; i++) {
        if (i < Math.floor(avgRating)) {
            starsHTML += '<i class="fas fa-star"></i>';
        } else if (i < avgRating) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        } else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }
    return starsHTML;
}

function getAverageRating(ratings) {
    if (!ratings) return 0;
    let totalStars = 0;
    let totalVotes = 0;
    for (const [stars, count] of Object.entries(ratings)) {
        totalStars += parseInt(stars) * count;
        totalVotes += count;
    }
    return totalVotes === 0 ? 0 : totalStars / totalVotes;
}

function getTotalRatings(ratings) {
    if (!ratings) return 0;
    return Object.values(ratings).reduce((total, count) => total + count, 0);
}

function renderProducts(products) {
    const productsContainer = document.getElementById("productsContainer");
    if (!productsContainer) {
        console.error("Products container not found");
        return;
    }

    if (!products || products.length === 0) {
        const emptyMessage = isSearchMode 
            ? `No products found for "${currentSearchTerm}". Try different keywords.`
            : "No products found. Please try again later.";
            
        productsContainer.innerHTML = `
            <div class="col-12">
                <div class="products-empty text-center py-5">
                    <i class="fas fa-box-open mb-3" style="font-size: 3rem; color: #ddd;"></i>
                    <h4>No Products Found</h4>
                    <p class="text-muted">${emptyMessage}</p>
                    ${isSearchMode ? '<button class="btn btn-primary" onclick="clearSearch()">Browse All Products</button>' : ''}
                </div>
            </div>
        `;
        return;
    }

    productsContainer.innerHTML = "";

    products.forEach((product) => {
        const productCard = document.createElement("div");
        productCard.classList.add("col-12", "col-md-6", "col-lg-4", "mb-4");

        const avgRating = getAverageRating(product.ratings);
        const totalRatings = getTotalRatings(product.ratings);
        const originalPrice = product.variants?.[0]?.sizes?.[0]?.price || 0;
        const discountedPrice = product.discount && product.discount > 0 
            ? originalPrice * (1 - product.discount) 
            : originalPrice;

        productCard.innerHTML = `
            <div class="productCard h-100">
                <div class="productImage position-relative">
                    <img src="${product.variants?.[0]?.image || "/assets/placeholder.jpg"}" 
                         alt="${product.name}" 
                         class="img-fluid w-100" 
                         style="height: 250px; object-fit: cover;"
                         onerror="this.src='/assets/placeholder.jpg'">
                    
                    <div class="productActions position-absolute" style="top: 10px; right: 10px;">
                        <button class="actionBtn wishlistBtn btn btn-light btn-sm rounded-circle me-2" 
                                title="Add to Wishlist" style="width: 35px; height: 35px;">
                            <i class="far fa-heart"></i>
                        </button>
                        <button class="actionBtn quickViewBtn btn btn-light btn-sm rounded-circle" 
                                title="Quick View" 
                                data-product-id="${product.id}" 
                                style="width: 35px; height: 35px;">
                            <i class="far fa-eye"></i>
                        </button>
                    </div>
                    
                    ${product.discount && product.discount > 0
                        ? `<div class="discountBadge position-absolute bg-danger text-white px-2 py-1 rounded" 
                                style="top: 10px; left: 10px; font-size: 12px;">
                               -${(product.discount * 100).toFixed(0)}%
                           </div>`
                        : ""
                    }
                </div>
                
                <div class="productInfo p-3">
                    <h5 class="productTitle mb-2" style="height: 48px; overflow: hidden;">
                        ${product.name}
                    </h5>
                    
                    <div class="productRating mb-2">
                        <div class="stars text-warning">
                            ${generateStarRating(avgRating)}
                        </div>
                        <small class="text-muted">(${totalRatings} reviews)</small>
                    </div>
                    
                    <div class="productPrice mb-3">
                        ${product.discount && product.discount > 0
                            ? `<span class="currentPrice fw-bold text-success fs-5">
                                   $${discountedPrice.toFixed(2)}
                               </span>
                               <span class="originalPrice text-muted text-decoration-line-through ms-2">
                                   $${originalPrice.toFixed(2)}
                               </span>`
                            : `<span class="currentPrice fw-bold fs-5">
                                   $${originalPrice.toFixed(2)}
                               </span>`
                        }
                    </div>
                    
                    <button class="addToCartBtn btn btn-primary w-100" 
                            data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart me-2"></i>
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });

    addProductEventListeners();
}

function updatePaginationUI(paginationData) {
    if (isSearchMode) return; // Skip pagination update in search mode
    
    const { currentPage, totalPages, total, hasNext, hasPrev } = paginationData;
    
    const showNumbers = document.querySelector(".showNumbers p");
    if (showNumbers) {
        const startItem = (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, total);
        showNumbers.textContent = `Showing ${startItem}-${endItem} of ${total} results`;
    }

    const paginationContainer = document.querySelector(".pagination");
    if (paginationContainer) {
        const prevBtn = paginationContainer.querySelector(".previous button");
        if (prevBtn) {
            prevBtn.disabled = !hasPrev;
            prevBtn.classList.toggle("disabled", !hasPrev);
        }

        const nextBtn = paginationContainer.querySelector(".next button");
        if (nextBtn) {
            nextBtn.disabled = !hasNext;
            nextBtn.classList.toggle("disabled", !hasNext);
        }

        const pagesList = paginationContainer.querySelector(".pages");
        if (pagesList) {
            pagesList.innerHTML = generatePageNumbers(currentPage, totalPages);
        }
    }
}

function generatePageNumbers(currentPage, totalPages) {
    let pagesHTML = "";
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
            pagesHTML += `<li class="page ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</li>`;
        }
    } else {
        pagesHTML += `<li class="page ${1 === currentPage ? "active" : ""}" data-page="1">1</li>`;

        if (currentPage > 4) {
            pagesHTML += '<li class="page dots">...</li>';
        }

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            pagesHTML += `<li class="page ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</li>`;
        }

        if (currentPage < totalPages - 3) {
            pagesHTML += '<li class="page dots">...</li>';
        }

        if (totalPages > 1) {
            pagesHTML += `<li class="page ${totalPages === currentPage ? "active" : ""}" data-page="${totalPages}">${totalPages}</li>`;
        }
    }

    return pagesHTML;
}

function addProductEventListeners() {
    // Add to cart buttons
    document.querySelectorAll(".addToCartBtn").forEach((btn) => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            
            // Navigate to product details page
            window.location.href = `./productDetails.html?id=${productId}`;
        });
    });

    // Wishlist buttons
    document.querySelectorAll(".wishlistBtn").forEach((btn) => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            const icon = this.querySelector("i");
            if (icon.classList.contains("far")) {
                icon.classList.remove("far");
                icon.classList.add("fas");
                this.style.color = "#e74c3c";
                // Here you would typically save to wishlist
            } else {
                icon.classList.remove("fas");
                icon.classList.add("far");
                this.style.color = "";
                // Here you would typically remove from wishlist
            }
        });
    });

    // Quick view buttons
    document.querySelectorAll(".quickViewBtn").forEach((btn) => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            
            // Navigate to product details page
            window.location.href = `./productDetails.html?id=${productId}`;
        });
    });
}

function initializePaginationEvents() {
    const prevBtn = document.querySelector(".pagination .previous button");
    if (prevBtn) {
        prevBtn.addEventListener("click", previousPage);
    }

    const nextBtn = document.querySelector(".pagination .next button");
    if (nextBtn) {
        nextBtn.addEventListener("click", nextPage);
    }

    const paginationContainer = document.querySelector(".pagination .pages");
    if (paginationContainer) {
        paginationContainer.addEventListener("click", async (e) => {
            if (
                e.target.classList.contains("page") &&
                !e.target.classList.contains("dots") &&
                !e.target.classList.contains("active")
            ) {
                const pageNumber = parseInt(e.target.dataset.page);
                if (pageNumber && !isSearchMode) {
                    await loadPage(pageNumber);
                }
            }
        });
    }
}

// Make functions globally available for the search system
if (typeof window !== 'undefined') {
    window.productSearchHandler = {
        search: searchProducts,
        clear: clearSearch,
        isSearchMode: () => isSearchMode,
        getCurrentSearchTerm: () => currentSearchTerm
    };
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    initializePaginationEvents();
    initializeProducts();
});