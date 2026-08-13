import { Injectable, signal, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './api.service';

export interface SearchResults {
    contacts: any[];
    users: any[];
    campaigns: any[];
    messages: any[];
}

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    
    // Modal visibility state
    isSearchModalOpen = signal<boolean>(false);
    
    // Search query state
    searchQuery = signal<string>('');
    
    // Results state
    searchResults = signal<SearchResults>({ contacts: [], users: [], campaigns: [], messages: [] });
    
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
        this.searchResults.set({ contacts: [], users: [], campaigns: [], messages: [] });
    }

    performSearch(query: string) {
        this.searchQuery.set(query);
        
        if (!query || query.trim().length === 0) {
            this.searchResults.set({ contacts: [], users: [], campaigns: [], messages: [] });
            this.isLoading.set(false);
            return;
        }

        this.isLoading.set(true);
        this.api.get(`/system/search?q=${encodeURIComponent(query)}`).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.searchResults.set(res.data);
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Search failed', err);
                this.isLoading.set(false);
                this.searchResults.set({ contacts: [], users: [], campaigns: [], messages: [] });
            }
        });
    }
}
