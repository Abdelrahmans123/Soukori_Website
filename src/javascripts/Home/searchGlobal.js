// searchGlobal.js - Global search functionality for SOUKORI
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import db from "../../config/firebase.js";

class SearchGlobal {
    constructor() {
        this.searchCache = new Map();
        this.searchDebounceTimer = null;
        this.isSearching = false;
        this.allProducts = [];
        this.isInitialized = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.bindSearchEvents();
        this.setupMobileSearch();
        this.handleUrlSearch();
        this.preloadProducts();
    }

    bindSearchEvents() {
        // Desktop search forms
        const searchForms = document.querySelectorAll('.searchInput');
        
        searchForms.forEach(form => {
            const searchInput = form.querySelector('input[type="search"]');
            const searchIcon = form.querySelector('.searchIcon');
            
            if (searchInput) {
                // Handle input with debouncing for suggestions
                searchInput.addEventListener('input', (e) => {
                    this.handleSearchInput(e.target.value);
                });

                // Handle Enter key
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.performSearch(searchInput.value.trim());
                    }
                });
            }

            // Handle search icon clicks
            if (searchIcon) {
                searchIcon.addEventListener('click', (e) => {
                    e.preventDefault();
                    const input = form.querySelector('input[type="search"]');
                    if (input && input.value.trim()) {
                        this.performSearch(input.value.trim());
                    }
                });
            }

            // Handle form submission
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = form.querySelector('input[type="search"]');
                if (input && input.value.trim()) {
                    this.performSearch(input.value.trim());
                }
            });
        });

        // Mobile search icon
        const mobileSearchIcon = document.querySelector('.mobile-icons .fa-search');
        if (mobileSearchIcon) {
            mobileSearchIcon.addEventListener('click', () => {
                this.showMobileSearch();
            });
        }
    }

    setupMobileSearch() {
        // Create mobile search overlay if it doesn't exist
        if (!document.getElementById('mobileSearchOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'mobileSearchOverlay';
            overlay.className = 'mobile-search-overlay';
            overlay.innerHTML = `
                <div class="mobile-search-container">
                    <div class="mobile-search-header">
                        <button class="btn-back" id="closeMobileSearch">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div class="mobile-search-input-container">
                            <input type="search" class="mobile-search-input" 
                                   placeholder="Search for products..." 
                                   id="mobileSearchInput">
                            <button class="btn-search" id="mobileSearchBtn">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mobile-search-suggestions" id="mobileSearchSuggestions">
                        <div class="search-placeholder">
                            <i class="fas fa-search"></i>
                            <p>Start typing to search products...</p>
                        </div>
                    </div>
                </div>
            `;

            // Add styles
            const styles = document.createElement('style');
            styles.textContent = `
                .mobile-search-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    background: white;
                    z-index: 9999;
                    display: none;
                }
                
                .mobile-search-overlay.active {
                    display: block;
                }

                .mobile-search-container {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .mobile-search-header {
                    display: flex;
                    align-items: center;
                    padding: 15px;
                    border-bottom: 1px solid #eee;
                    background: white;
                }

                .btn-back {
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #333;
                    margin-right: 15px;
                    cursor: pointer;
                }

                .mobile-search-input-container {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 8px;
                }

                .mobile-search-input {
                    flex: 1;
                    border: none;
                    background: none;
                    outline: none;
                    font-size: 16px;
                    padding: 0 10px;
                }

                .btn-search {
                    background: none;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    padding: 5px 10px;
                }

                .mobile-search-suggestions {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }

                .search-placeholder {
                    text-align: center;
                    color: #999;
                    margin-top: 50px;
                }

                .search-placeholder i {
                    font-size: 48px;
                    margin-bottom: 15px;
                    color: #ddd;
                }

                .suggestion-item {
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    margin-bottom: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .suggestion-item:hover {
                    background: #f8f9fa;
                }

                .suggestion-image {
                    width: 50px;
                    height: 50px;
                    object-fit: cover;
                    border-radius: 6px;
                    margin-right: 12px;
                }

                .suggestion-content {
                    flex: 1;
                }

                .suggestion-name {
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 4px;
                }

                .suggestion-price {
                    color: #666;
                    font-size: 14px;
                }

                .no-results {
                    text-align: center;
                    color: #999;
                    padding: 40px 20px;
                }
            `;

            document.head.appendChild(styles);
            document.body.appendChild(overlay);

            // Bind mobile search events
            document.getElementById('closeMobileSearch').addEventListener('click', () => {
                this.hideMobileSearch();
            });

            const mobileInput = document.getElementById('mobileSearchInput');
            mobileInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value, true);
            });

            mobileInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value.trim());
                }
            });

            document.getElementById('mobileSearchBtn').addEventListener('click', () => {
                const input = document.getElementById('mobileSearchInput');
                if (input.value.trim()) {
                    this.performSearch(input.value.trim());
                }
            });
        }
    }

    handleSearchInput(searchTerm, isMobile = false) {
        // Clear previous debounce timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        // Show suggestions after 300ms delay
        this.searchDebounceTimer = setTimeout(async () => {
            if (searchTerm.trim().length > 2) {
                await this.showSearchSuggestions(searchTerm.trim(), isMobile);
            } else if (isMobile) {
                // Clear suggestions on mobile
                const container = document.getElementById('mobileSearchSuggestions');
                if (container) {
                    container.innerHTML = `
                        <div class="search-placeholder">
                            <i class="fas fa-search"></i>
                            <p>Start typing to search products...</p>
                        </div>
                    `;
                }
            }
        }, 300);
    }

    async showSearchSuggestions(searchTerm, isMobile = false) {
        try {
            const suggestions = await this.searchProducts(searchTerm, 5);
            
            if (isMobile) {
                const container = document.getElementById('mobileSearchSuggestions');
                if (container) {
                    this.renderMobileSuggestions(suggestions, container, searchTerm);
                }
            }
        } catch (error) {
            console.error('Error showing suggestions:', error);
        }
    }

    renderMobileSuggestions(suggestions, container, searchTerm) {
        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No products found for "${searchTerm}"</p>
                </div>
            `;
            return;
        }

        let html = '';
        suggestions.forEach(product => {
            const price = this.getProductPrice(product);
            const imageUrl = product.variants?.[0]?.image || '/assets/placeholder.jpg';
            
            html += `
                <div class="suggestion-item" onclick="searchGlobal.selectProduct('${product.id}')">
                    <img src="${imageUrl}" 
                         alt="${product.name}" 
                         class="suggestion-image"
                         onerror="this.src='/assets/placeholder.jpg'">
                    <div class="suggestion-content">
                        <div class="suggestion-name">${product.name}</div>
                        <div class="suggestion-price">$${price}</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async preloadProducts() {
        if (this.allProducts.length > 0) return;

        try {
            const productsQuery = query(
                collection(db, "products"),
                where("status", "==", "available"),
                orderBy("name")
            );
            
            const snapshot = await getDocs(productsQuery);
            this.allProducts = [];
            
            snapshot.forEach((doc) => {
                this.allProducts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.isInitialized = true;
            console.log(`Preloaded ${this.allProducts.length} products for search`);
        } catch (error) {
            console.error("Error preloading products:", error);
        }
    }

    async searchProducts(searchTerm, limit = 10) {
        const searchKey = searchTerm.toLowerCase();
        
        // Check cache first
        if (this.searchCache.has(searchKey)) {
            return this.searchCache.get(searchKey);
        }

        try {
            // Ensure products are loaded
            if (!this.isInitialized) {
                await this.preloadProducts();
            }

            // Client-side filtering for better search experience
            const results = this.allProducts.filter(product => {
                const searchableText = [
                    product.name || '',
                    product.description || '',
                    product.category || '',
                    product.brand || '',
                    ...(product.tags || [])
                ].join(' ').toLowerCase();
                
                return searchableText.includes(searchKey);
            });

            // Sort by relevance (name matches first)
            results.sort((a, b) => {
                const aName = (a.name || '').toLowerCase();
                const bName = (b.name || '').toLowerCase();
                
                const aNameMatch = aName.includes(searchKey);
                const bNameMatch = bName.includes(searchKey);
                
                if (aNameMatch && !bNameMatch) return -1;
                if (!aNameMatch && bNameMatch) return 1;
                return aName.localeCompare(bName);
            });

            const limitedResults = results.slice(0, limit);
            
            // Cache results
            this.searchCache.set(searchKey, limitedResults);
            
            return limitedResults;
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    }

    async performSearch(searchTerm) {
        if (!searchTerm || searchTerm.length === 0) {
            return;
        }

        this.isSearching = true;
        
        try {
            // Hide mobile search if open
            this.hideMobileSearch();
            
            // Get current page
            const currentPage = window.location.pathname;
            
            // If not on product page, navigate to product page with search
            if (!currentPage.includes('product.html')) {
                const productPageUrl = this.getProductPageUrl();
                window.location.href = `${productPageUrl}?search=${encodeURIComponent(searchTerm)}`;
                return;
            }
            
            // If already on product page, trigger search
            this.triggerProductSearch(searchTerm);
            
        } catch (error) {
            console.error('Error performing search:', error);
        } finally {
            this.isSearching = false;
        }
    }

    getProductPageUrl() {
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/pages/Product/')) {
            return './product.html';
        } else if (currentPath.includes('/pages/')) {
            return '../Product/product.html';
        } else {
            return './pages/Product/product.html';
        }
    }

    triggerProductSearch(searchTerm) {
        // Update URL with search parameter
        const url = new URL(window.location);
        url.searchParams.set('search', searchTerm);
        window.history.pushState({}, '', url);
        
        // Trigger search in product page
        if (window.productSearchHandler) {
            window.productSearchHandler.search(searchTerm);
        } else if (typeof searchProducts === 'function') {
            // Fallback for direct function call
            searchProducts(searchTerm);
        } else {
            // Last resort: reload page
            window.location.reload();
        }
    }

    selectProduct(productId) {
        // Hide mobile search
        this.hideMobileSearch();
        
        // Navigate to product details
        const currentPath = window.location.pathname;
        let productDetailsUrl;
        
        if (currentPath.includes('/pages/Product/')) {
            productDetailsUrl = './productDetails.html';
        } else if (currentPath.includes('/pages/')) {
            productDetailsUrl = '../Product/productDetails.html';
        } else {
            productDetailsUrl = './pages/Product/productDetails.html';
        }
        
        window.location.href = `${productDetailsUrl}?id=${productId}`;
    }

    showMobileSearch() {
        const overlay = document.getElementById('mobileSearchOverlay');
        if (overlay) {
            overlay.classList.add('active');
            document.getElementById('mobileSearchInput').focus();
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }

    hideMobileSearch() {
        const overlay = document.getElementById('mobileSearchOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            // Restore body scroll
            document.body.style.overflow = '';
            
            // Clear search input
            const input = document.getElementById('mobileSearchInput');
            if (input) {
                input.value = '';
            }
            
            // Clear suggestions
            const container = document.getElementById('mobileSearchSuggestions');
            if (container) {
                container.innerHTML = `
                    <div class="search-placeholder">
                        <i class="fas fa-search"></i>
                        <p>Start typing to search products...</p>
                    </div>
                `;
            }
        }
    }

    handleUrlSearch() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search');
        
        if (searchTerm) {
            // Fill search inputs with the search term
            document.querySelectorAll('.searchInput input[type="search"]').forEach(input => {
                input.value = searchTerm;
            });
            
            // If on product page and handler exists, trigger search
            if (window.location.pathname.includes('product.html')) {
                if (window.productSearchHandler) {
                    setTimeout(() => {
                        window.productSearchHandler.search(searchTerm);
                    }, 500);
                }
            }
        }
    }

    getProductPrice(product) {
        if (product.variants && product.variants[0] && 
            product.variants[0].sizes && product.variants[0].sizes[0]) {
            let price = product.variants[0].sizes[0].price;
            
            // Apply discount if exists
            if (product.discount && product.discount > 0) {
                price = price * (1 - product.discount);
            }
            
            return price.toFixed(2);
        }
        return '0.00';
    }

    // Public method to clear search cache
    clearCache() {
        this.searchCache.clear();
        console.log('Search cache cleared');
    }
}

// Create global instance
const searchGlobal = new SearchGlobal();

// Export for use in other modules
export default searchGlobal;