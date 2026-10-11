import { Component, ElementRef, ViewChild, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SearchService } from '../../services/search.service';
import { HighlightPipe } from '../../pipes/highlight.pipe';

export interface FlatSearchResult {
  type: 'contact' | 'user' | 'campaign' | 'message' | 'template' | 'flow' | 'canned';
  title: string;
  subtitle: string;
  route: string;
  queryParams?: any;
  data: any;
}

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
            placeholder="Search contacts, campaigns, messages, templates, flows, quick replies..." 
            [ngModel]="searchService.searchQuery()" 
            (ngModelChange)="onSearchChange($event)"
            (keydown)="onKeyDown($event)"
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
          <i class="fa-solid fa-circle-notch fa-spin"></i> Searching database...
        </div>

        <!-- Results Body -->
        <div class="search-results" *ngIf="!searchService.isLoading()">
            
            <!-- Default / Empty State -->
            <div class="empty-state" *ngIf="!hasResults() && searchService.searchQuery().length > 0">
                <i class="fa-regular fa-face-frown"></i>
                <p>No matches found for "<strong>{{ searchService.searchQuery() }}</strong>"</p>
                <span>Try searching by contact name, phone, broadcast title, message text, or template.</span>
            </div>

            <!-- Contacts -->
            <div class="result-group" *ngIf="searchService.searchResults().contacts.length">
                <div class="group-title">
                  <i class="fa-regular fa-address-book"></i> Contacts ({{ searchService.searchResults().contacts.length }})
                </div>
                <a class="result-item" 
                   *ngFor="let c of searchService.searchResults().contacts" 
                   [routerLink]="'/contacts'" 
                   [queryParams]="{ search: c.phone || c.name }"
                   (click)="searchService.closeSearchModal()">
                    <i class="fa-solid fa-user-tag item-icon"></i>
                    <div class="item-content">
                        <span class="item-title" [innerHTML]="c.name | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle">Phone: <span [innerHTML]="(c.phone || c.customerId) | highlight:searchService.searchQuery()"></span></span>
                    </div>
                </a>
            </div>

            <!-- Team Members / Users -->
            <div class="result-group" *ngIf="searchService.searchResults().users.length">
                <div class="group-title">
                  <i class="fa-solid fa-users"></i> Team Members ({{ searchService.searchResults().users.length }})
                </div>
                <a class="result-item" 
                   *ngFor="let u of searchService.searchResults().users" 
                   routerLink="/agents" 
                   (click)="searchService.closeSearchModal()">
                    <i class="fa-solid fa-user-gear item-icon"></i>
                    <div class="item-content">
                        <span class="item-title" [innerHTML]="u.name | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle" [innerHTML]="(u.email || u.userId) | highlight:searchService.searchQuery()"></span>
                    </div>
                </a>
            </div>

            <!-- Campaigns -->
            <div class="result-group" *ngIf="searchService.searchResults().campaigns.length">
                <div class="group-title">
                  <i class="fa-solid fa-bullhorn"></i> Broadcast Campaigns ({{ searchService.searchResults().campaigns.length }})
                </div>
                <a class="result-item" 
                   *ngFor="let camp of searchService.searchResults().campaigns" 
                   routerLink="/campaigns" 
                   (click)="searchService.closeSearchModal()">
                    <i class="fa-solid fa-paper-plane item-icon"></i>
                    <div class="item-content">
                        <span class="item-title" [innerHTML]="camp.name | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle">ID: <span [innerHTML]="camp.campaignId | highlight:searchService.searchQuery()"></span> &bull; Status: <strong>{{ camp.status }}</strong></span>
                    </div>
                </a>
            </div>

            <!-- Messages -->
            <div class="result-group" *ngIf="searchService.searchResults().messages.length">
                <div class="group-title">
                  <i class="fa-regular fa-comment-dots"></i> Live Chat Messages ({{ searchService.searchResults().messages.length }})
                </div>
                <a class="result-item" 
                   *ngFor="let m of searchService.searchResults().messages" 
                   routerLink="/chat" 
                   [queryParams]="{ conversationId: m.conversationId }"
                   (click)="searchService.closeSearchModal()">
                    <i class="fa-solid fa-comments item-icon"></i>
                    <div class="item-content">
                        <span class="item-title message-preview" [innerHTML]="m.body | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle">Msg ID: <span [innerHTML]="m.messageId | highlight:searchService.searchQuery()"></span></span>
                    </div>
                </a>
            </div>

            <!-- Message Templates -->
            <div class="result-group" *ngIf="searchService.searchResults().templates.length">
                <div class="group-title">
                  <i class="fa-solid fa-file-code"></i> Message Templates ({{ searchService.searchResults().templates.length }})
                </div>
                <a class="result-item" 
                   *ngFor="let t of searchService.searchResults().templates" 
                   routerLink="/manage/templates" 
                   (click)="searchService.closeSearchModal()">
                    <i class="fa-solid fa-layer-group item-icon"></i>
                    <div class="item-content">
                        <span class="item-title" [innerHTML]="t.templateName | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle">Category: <strong>{{ t.category || 'UTILITY' }}</strong> &bull; Lang: {{ t.language }}</span>
                    </div>
                </a>
            </div>

            <!-- Visual Automations / Flows -->
            <div class="result-group" *ngIf="searchService.searchResults().flows.length">
                <div class="group-title">
                  <i class="fa-solid fa-diagram-project"></i> Visual Flow Automations ({{ searchService.searchResults().flows.length }})
                </div>
                <a class="result-item" 
                   *ngFor="let f of searchService.searchResults().flows" 
                   routerLink="/flows" 
                   (click)="searchService.closeSearchModal()">
                    <i class="fa-solid fa-network-wired item-icon"></i>
                    <div class="item-content">
                        <span class="item-title" [innerHTML]="f.name | highlight:searchService.searchQuery()"></span>
                        <span class="item-subtitle">Trigger Keyword: <code>{{ f.triggerKeyword || 'HI' }}</code></span>
                    </div>
                </a>
            </div>

            <!-- Canned Responses -->
            <div class="result-group" *ngIf="searchService.searchResults().cannedResponses.length">
                <div class="group-title">
                  <i class="fa-solid fa-bolt"></i> Canned Quick Replies ({{ searchService.searchResults().cannedResponses.length }})
                </div>
                <a class="result-item" 
                   *ngFor="let cr of searchService.searchResults().cannedResponses" 
                   routerLink="/manage/master-data" 
                   (click)="searchService.closeSearchModal()">
                    <i class="fa-solid fa-reply item-icon"></i>
                    <div class="item-content">
                        <span class="item-title">/{{ cr.shortcut }}</span>
                        <span class="item-subtitle" [innerHTML]="cr.content | highlight:searchService.searchQuery()"></span>
                    </div>
                </a>
            </div>

        </div>
        
        <!-- Footer -->
        <div class="search-footer">
            <span class="footer-hint">Search powered by <strong>QuoteDesks Instant DB Index</strong></span>
            <div class="footer-shortcuts">
                <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</span>
                <span><kbd>ESC</kbd> close</span>
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

  constructor(
    public searchService: SearchService,
    private router: Router
  ) {}

  ngAfterViewChecked() {
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
    }, 250); // Fluid fast 250ms debounce
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.searchService.closeSearchModal();
    }
  }

  closeModal(event: MouseEvent) {
    this.searchService.closeSearchModal();
  }

  hasResults(): boolean {
    const res = this.searchService.searchResults();
    return (
      (res.contacts && res.contacts.length > 0) ||
      (res.users && res.users.length > 0) ||
      (res.campaigns && res.campaigns.length > 0) ||
      (res.messages && res.messages.length > 0) ||
      (res.templates && res.templates.length > 0) ||
      (res.flows && res.flows.length > 0) ||
      (res.cannedResponses && res.cannedResponses.length > 0)
    );
  }
}
