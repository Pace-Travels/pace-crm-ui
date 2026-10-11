import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './api.service';

export interface SearchResults {
    contacts: any[];
    users: any[];
    campaigns: any[];
    messages: any[];
    templates: any[];
    flows: any[];
    cannedResponses: any[];
}

const EMPTY_RESULTS: SearchResults = {
    contacts: [],
    users: [],
    campaigns: [],
    messages: [],
    templates: [],
    flows: [],
    cannedResponses: []
};

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    
    // Modal visibility state
    isSearchModalOpen = signal<boolean>(false);
    
    // Search query state
    searchQuery = signal<string>('');
    
    // Results state
    searchResults = signal<SearchResults>(EMPTY_RESULTS);
    
    // Loading state
    isLoading = signal<boolean>(false);

    constructor(
        private api: ApiService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        if (isPlatformBrowser(this.platformId)) {
            // Global keyboard listener for Cmd+K or Ctrl+K
            window.addEventListener('keydown', (e: KeyboardEvent) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    this.toggleSearchModal();
                }
                // Close on Escape
                if (e.key === 'Escape' && this.isSearchModalOpen()) {
                    this.closeSearchModal();
                }
            });
        }
    }

    toggleSearchModal() {
        this.isSearchModalOpen.update(v => !v);
        if (!this.isSearchModalOpen()) {
            this.clearSearch();
        }
    }

    openSearchModal() {
        this.isSearchModalOpen.set(true);
    }

    closeSearchModal() {
        this.isSearchModalOpen.set(false);
        this.clearSearch();
    }

    clearSearch() {
        this.searchQuery.set('');
        this.searchResults.set({ ...EMPTY_RESULTS });
    }

    performSearch(query: string) {
        this.searchQuery.set(query);
        
        if (!query || query.trim().length === 0) {
            this.searchResults.set({ ...EMPTY_RESULTS });
            this.isLoading.set(false);
            return;
        }

        this.isLoading.set(true);
        this.api.get(`/system/search?q=${encodeURIComponent(query)}`).subscribe({
            next: (res: any) => {
                if (res.success && res.data) {
                    this.searchResults.set({
                        contacts: res.data.contacts || [],
                        users: res.data.users || [],
                        campaigns: res.data.campaigns || [],
                        messages: res.data.messages || [],
                        templates: res.data.templates || [],
                        flows: res.data.flows || [],
                        cannedResponses: res.data.cannedResponses || []
                    });
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Search failed', err);
                this.isLoading.set(false);
                this.searchResults.set({ ...EMPTY_RESULTS });
            }
        });
    }
}
