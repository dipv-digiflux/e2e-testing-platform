/**
 * Data Fetcher Utility
 * Handles fetching data from n8n webhooks with caching and error handling
 */

class DataFetcher {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.baseUrl = window.location.origin;
    }

    /**
     * Generic fetch method with caching and error handling
     */
    async fetchData(endpoint, cacheKey) {
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            console.log(`Using cached data for ${cacheKey}`);
            return cached.data;
        }

        try {
            console.log(`Fetching fresh data from ${endpoint}`);
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Always return an array, even on error
            const data = result.success ? result.data : [];
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
            
        } catch (error) {
            console.error(`Failed to fetch ${cacheKey}:`, error);
            
            // Return cached data if available, otherwise empty array
            const cached = this.cache.get(cacheKey);
            return cached ? cached.data : [];
        }
    }

    /**
     * Fetch users data
     */
    async getUsers() {
        return await this.fetchData('/api/data/users', 'users');
    }

    /**
     * Fetch projects data
     */
    async getProjects() {
        return await this.fetchData('/api/data/projects', 'projects');
    }

    /**
     * Fetch project testers data
     */
    async getProjectTesters() {
        return await this.fetchData('/api/data/project-testers', 'project-testers');
    }

    /**
     * Fetch test cases data
     */
    async getTestCases() {
        return await this.fetchData('/api/data/test-cases', 'test-cases');
    }

    /**
     * Fetch test automation data
     */
    async getTestAutomation() {
        return await this.fetchData('/api/data/test-automation', 'test-automation');
    }

    /**
     * Fetch test results data
     */
    async getTestResults() {
        return await this.fetchData('/api/data/test-results', 'test-results');
    }

    /**
     * Clear cache for a specific key or all cache
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
            console.log(`Cache cleared for ${key}`);
        } else {
            this.cache.clear();
            console.log('All cache cleared');
        }
    }

    /**
     * Get cache status
     */
    getCacheStatus() {
        const status = {};
        for (const [key, value] of this.cache.entries()) {
            const age = Date.now() - value.timestamp;
            status[key] = {
                age: Math.round(age / 1000), // age in seconds
                expired: age > this.cacheTimeout,
                count: Array.isArray(value.data) ? value.data.length : 0
            };
        }
        return status;
    }
}

/**
 * Dropdown Population Utilities
 */
class DropdownHelper {
    /**
     * Populate a select element with options
     */
    static populateSelect(selectElement, data, options = {}) {
        const {
            valueField = 'id',
            textField = 'name',
            placeholder = 'Select an option',
            clearFirst = true
        } = options;

        if (clearFirst) {
            selectElement.innerHTML = '';
        }

        // Add placeholder option
        if (placeholder) {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholder;
            selectElement.appendChild(placeholderOption);
        }

        // Add data options
        if (Array.isArray(data)) {
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item[valueField] || '';
                option.textContent = item[textField] || item[valueField] || 'Unknown';
                selectElement.appendChild(option);
            });
        }

        console.log(`Populated select with ${data.length} options`);
    }

    /**
     * Create a searchable dropdown (for future enhancement)
     */
    static createSearchableDropdown(container, data, options = {}) {
        // This is a placeholder for future searchable dropdown implementation
        // For now, we'll use regular select elements
        const select = document.createElement('select');
        select.className = options.className || '';
        select.required = options.required || false;
        
        this.populateSelect(select, data, options);
        
        container.appendChild(select);
        return select;
    }

    /**
     * Filter data based on search term
     */
    static filterData(data, searchTerm, searchFields = ['name']) {
        if (!searchTerm) return data;
        
        const term = searchTerm.toLowerCase();
        return data.filter(item => {
            return searchFields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(term);
            });
        });
    }

    /**
     * Find item by ID
     */
    static findById(data, id, idField = 'id') {
        return data.find(item => item[idField] === id);
    }

    /**
     * Get display text for an item
     */
    static getDisplayText(item, textField = 'name') {
        return item[textField] || item.id || 'Unknown';
    }
}

// Create global instances
window.dataFetcher = new DataFetcher();
window.dropdownHelper = DropdownHelper;

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataFetcher, DropdownHelper };
}
