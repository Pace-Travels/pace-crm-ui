import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SearchService } from '../../services/search.service';
import { HighlightPipe } from '../../pipes/highlight.pipe';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HighlightPipe],
  template: `
    <div class="search-overlay" *ngIf="searchService.isSearchModalOpen()" (click)="closeModal($event)">
      <div class="search-modal" (click)="$event.stopPropagation()">
        
        <!-- Header / Search Input -->
        <div class="search-header">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            #searchInput 
            type="text" 
            placeholder="Search docs, contacts, campaigns, or messages..." 
            [ngModel]="searchService.searchQuery()" 
            (ngModelChange)="onSearchChange($event)"
            class="search-input"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="close-btn" (click)="searchService.closeSearchModal()">
            ESC
          </button>
        </div>

        <!-- Loader -->
        <div class="search-loader" *ngIf="searchService.isLoading()">
          <i class="fa-solid fa-circle-notch fa-spin"></i> Searching...
        </div>

        <!-- Results Body -->
        <div class="search-results" *ngIf="!searchService.isLoading()">
            
            <!-- Default / Empty State -->
            <div class="empty-state" *ngIf="!hasResults() && searchService.searchQuery().length > 0">
                <i class="fa-regular fa-face-frown"></i>
                <p>No results found for "<strong>{{ searchService.searchQuery() }}</strong>"</p>
                <span>Try searching for something else.</span>
            </div>

            <!-- Contacts -->
            <div class="result-group" *ngIf="searchService.searchResults().contacts?.length">
                <div class="group-title">Contacts</div>
                <a class="result-item" *ngFor="let c of searchService.searchResults().contacts" routerLink="/contacts">
                    <i class="fa-regular fa-address-book item-icon"></i>
                    <div class="item-content">
                        <span class="item-title" [innerHTML]="c.name | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle" [innerHTML]="(c.phone || c.customerId) | highlight:searchService.searchQuery()"></span>
                    </div>
                </a>
            </div>

            <!-- Users -->
            <div class="result-group" *ngIf="searchService.searchResults().users?.length">
                <div class="group-title">Team Members</div>
                <a class="result-item" *ngFor="let u of searchService.searchResults().users" routerLink="/agents">
                    <i class="fa-solid fa-user item-icon"></i>
                    <div class="item-content">
                        <span class="item-title" [innerHTML]="u.name | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle" [innerHTML]="(u.email || u.userId) | highlight:searchService.searchQuery()"></span>
                    </div>
                </a>
            </div>

            <!-- Campaigns -->
            <div class="result-group" *ngIf="searchService.searchResults().campaigns?.length">
                <div class="group-title">Campaigns</div>
                <a class="result-item" *ngFor="let camp of searchService.searchResults().campaigns" routerLink="/campaigns">
                    <i class="fa-solid fa-bullhorn item-icon"></i>
                    <div class="item-content">
                        <span class="item-title" [innerHTML]="camp.name | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle">ID: <span [innerHTML]="camp.campaignId | highlight:searchService.searchQuery()"></span> &bull; <span [innerHTML]="camp.status"></span></span>
                    </div>
                </a>
            </div>

            <!-- Messages -->
            <div class="result-group" *ngIf="searchService.searchResults().messages?.length">
                <div class="group-title">Messages</div>
                <a class="result-item" *ngFor="let m of searchService.searchResults().messages" routerLink="/chat">
                    <i class="fa-regular fa-comment-dots item-icon"></i>
                    <div class="item-content">
                        <span class="item-title message-preview" [innerHTML]="m.body | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle">Msg ID: <span [innerHTML]="m.messageId | highlight:searchService.searchQuery()"></span></span>
                    </div>
                </a>
            </div>

        </div>
        
        <!-- Footer -->
        <div class="search-footer">
            <span class="footer-hint">Search powered by <strong>Pace DB</strong></span>
            <div class="footer-shortcuts">
                <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> to navigate</span>
                <span><kbd>ESC</kbd> to close</span>
            </div>
        </div>

      </div>
    </div>
  `,
  styleUrls: ['./global-search.component.scss']
})
export class GlobalSearchComponent implements AfterViewChecked {
  @ViewChild('searchInput') searchInput!: ElementRef;

  private searchTimeout: any;
  private focusSet = false;

  constructor(public searchService: SearchService) {}

  ngAfterViewChecked() {
      // Auto focus the input when modal opens
      if (this.searchService.isSearchModalOpen() && this.searchInput && !this.focusSet) {
          this.searchInput.nativeElement.focus();
          this.focusSet = true;
      } else if (!this.searchService.isSearchModalOpen()) {
          this.focusSet = false;
      }
  }

  onSearchChange(query: string) {
    clearTimeout(this.searchTimeout);
    this.searchService.searchQuery.set(query);
    this.searchTimeout = setTimeout(() => {
        this.searchService.performSearch(query);
    }, 300); // Debounce
  }

  closeModal(event: MouseEvent) {
    this.searchService.closeSearchModal();
  }

  hasResults(): boolean {
      const res = this.searchService.searchResults();
      return (res.contacts?.length > 0 || res.users?.length > 0 || res.campaigns?.length > 0 || res.messages?.length > 0);
  }
}
