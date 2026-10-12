import { Component, EventEmitter, Output, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';

export interface GalleryAsset {
  id: string | number;
  name: string;
  url: string;
  category: 'BRAND_PUBLIC' | 'TEAM_UPLOADS' | 'AI_GENERATED';
  tag?: string;
}

@Component({
  selector: 'app-asset-gallery-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="gallery-popover-overlay" *ngIf="isOpen" (click)="closeModal()">
      <div class="gallery-card" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="gallery-header">
          <div class="title-group">
            <i class="fa-solid fa-photo-film header-icon"></i>
            <div>
              <h4 class="m-0">Media Asset Gallery</h4>
              <p class="subtitle m-0">Select a brand banner, team upload, or AI graphic for your campaign</p>
            </div>
          </div>
          <button type="button" class="btn-close" (click)="closeModal()">&times;</button>
        </div>

        <!-- Search Bar -->
        <div class="search-bar-container">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            class="form-control search-input" 
            placeholder="Search gallery assets by title or tag..." 
            [(ngModel)]="searchQuery" 
          />
        </div>

        <!-- Category Tabs -->
        <div class="tabs-container">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'BRAND_PUBLIC'" 
            (click)="activeTab = 'BRAND_PUBLIC'">
            <i class="fa-solid fa-images"></i> Public Brand Gallery ({{ galleryData.brandPublic.length }})
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'TEAM_UPLOADS'" 
            (click)="activeTab = 'TEAM_UPLOADS'">
            <i class="fa-solid fa-users"></i> Team Uploads ({{ galleryData.teamUploads.length }})
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'AI_GENERATED'" 
            (click)="activeTab = 'AI_GENERATED'">
            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Generated ({{ galleryData.aiGenerated.length }})
          </button>
        </div>

        <!-- Body & Thumbnail Grid -->
        <div class="gallery-body">
          <div *ngIf="loading" class="loading-state">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Loading media gallery assets...
          </div>

          <div *ngIf="!loading && getFilteredAssets().length === 0" class="empty-state">
            <i class="fa-regular fa-image empty-icon"></i>
            <p>No assets found in this category matching "{{ searchQuery }}".</p>
          </div>

          <div *ngIf="!loading && getFilteredAssets().length > 0" class="assets-grid">
            <div 
              class="asset-card" 
              *ngFor="let asset of getFilteredAssets()" 
              (click)="chooseAsset(asset.url)" 
              [title]="asset.name">
              
              <div class="image-wrapper">
                <img [src]="asset.url" [alt]="asset.name" (error)="handleImgError($event)" />
                <div class="hover-overlay">
                  <i class="fa-solid fa-check-circle"></i>
                  <span>Select Image</span>
                </div>
              </div>

              <div class="asset-info">
                <span class="asset-name">{{ asset.name }}</span>
                <span class="asset-tag" *ngIf="asset.tag">{{ asset.tag }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="gallery-footer">
          <span class="footer-hint"><i class="fa-solid fa-circle-info"></i> Clicking any image auto-fills the header URL and updates the live WhatsApp preview.</span>
          <button type="button" class="btn btn-cancel" (click)="closeModal()">Close</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .gallery-popover-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px);
      z-index: 1050; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .gallery-card {
      background: #ffffff; width: 100%; max-width: 780px; border-radius: 20px;
      box-shadow: 0 20px 45px rgba(0,0,0,0.25); overflow: hidden; display: flex; flex-direction: column;
      max-height: 85vh; animation: galleryFadeIn 0.22s ease-out;
    }
    @keyframes galleryFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .gallery-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 22px; border-bottom: 1px solid #e2e8f0; background: #ffffff;
      .title-group { display: flex; align-items: center; gap: 12px; }
      .header-icon { font-size: 20px; color: #4338ca; background: #eef2ff; padding: 10px; border-radius: 10px; }
      h4 { font-size: 16px; font-weight: 700; color: #0f172a; }
      .subtitle { font-size: 12px; color: #64748b; }
      .btn-close { background: transparent; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; }
    }
    .search-bar-container {
      position: relative; padding: 12px 22px 4px 22px;
      .search-icon { position: absolute; left: 34px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 13.5px; }
      .search-input { width: 100%; box-sizing: border-box; padding: 9px 12px 9px 36px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 12.5px; outline: none; }
    }
    .tabs-container {
      display: flex; gap: 8px; padding: 10px 22px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;
      .tab-btn {
        background: transparent; border: 1px solid transparent; padding: 7px 14px; border-radius: 8px;
        font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s;
        display: flex; align-items: center; gap: 6px;
        &:hover { color: #4338ca; background: #ffffff; }
        &.active { background: #ffffff; border-color: #cbd5e1; color: #4338ca; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      }
    }
    .gallery-body { padding: 18px 22px; overflow-y: auto; flex: 1; min-height: 280px; }
    .loading-state { padding: 50px; text-align: center; color: #6366f1; font-weight: 600; font-size: 13.5px; }
    .empty-state {
      padding: 40px; text-align: center; color: #94a3b8; font-size: 13px;
      .empty-icon { font-size: 36px; margin-bottom: 8px; color: #cbd5e1; display: block; }
    }
    .assets-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px;
    }
    .asset-card {
      border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;
      cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column;
      &:hover {
        border-color: #6366f1; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(99, 102, 241, 0.15);
        .hover-overlay { opacity: 1; }
      }
    }
    .image-wrapper {
      position: relative; width: 100%; height: 110px; background: #f1f5f9; overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; }
      .hover-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(67, 56, 202, 0.82); color: white; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 700;
        opacity: 0; transition: opacity 0.2s;
        i { font-size: 18px; }
      }
    }
    .asset-info {
      padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; background: #ffffff;
      .asset-name { font-size: 11.5px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .asset-tag { font-size: 9.5px; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 1px 6px; border-radius: 4px; width: fit-content; text-transform: uppercase; }
    }
    .gallery-footer {
      display: flex; align-items: center; justify-content: space-between; padding: 14px 22px;
      background: #f8fafc; border-top: 1px solid #e2e8f0;
      .footer-hint { font-size: 11.5px; color: #64748b; font-weight: 500; }
      .btn-cancel { background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 8px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    }
  `]
})
export class AssetGalleryPicker implements OnInit, OnChanges {
  private api = inject(ApiService);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() selectAsset = new EventEmitter<string>();

  activeTab: 'BRAND_PUBLIC' | 'TEAM_UPLOADS' | 'AI_GENERATED' = 'BRAND_PUBLIC';
  searchQuery = '';
  loading = false;

  galleryData = {
    teamUploads: [] as GalleryAsset[],
    aiGenerated: [] as GalleryAsset[],
    brandPublic: [] as GalleryAsset[]
  };

  ngOnInit(): void {
    if (this.isOpen) {
      this.loadGalleryAssets();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadGalleryAssets();
    }
  }

  loadGalleryAssets(): void {
    this.loading = true;

    // Safety timeout to ensure spinner never hangs indefinitely
    const safetyTimer = setTimeout(() => {
      this.loading = false;
    }, 1500);

    // Fetch storage gallery
    this.api.get<any>('storage/gallery').subscribe({
      next: (res: any) => {
        clearTimeout(safetyTimer);
        this.loading = false;
        const data = res.data || res || {};
        this.galleryData = {
          teamUploads: data.teamUploads && data.teamUploads.length > 0 ? data.teamUploads : this.galleryData.teamUploads,
          aiGenerated: data.aiGenerated && data.aiGenerated.length > 0 ? data.aiGenerated : this.galleryData.aiGenerated,
          brandPublic: data.brandPublic || []
        };
      },
      error: () => {
        clearTimeout(safetyTimer);
        this.loading = false;
      }
    });

    // Also query gallery/assets endpoint to pull any S3 MediaAssets uploads
    this.api.get<any>('gallery/assets').subscribe({
      next: (res: any) => {
        const assetsList = res.data || [];
        if (Array.isArray(assetsList) && assetsList.length > 0) {
          const mapped: GalleryAsset[] = assetsList.map((m: any) => ({
            id: `ma_${m.id}`,
            name: m.title || m.filename,
            url: m.publicUrl,
            category: 'TEAM_UPLOADS',
            tag: m.mediaType
          }));

          const combined = [...mapped];
          this.galleryData.teamUploads.forEach(existing => {
            if (!combined.some(c => c.url === existing.url)) {
              combined.push(existing);
            }
          });
          this.galleryData.teamUploads = combined;
        }
      },
      error: () => {}
    });
  }

  getFilteredAssets(): GalleryAsset[] {
    let list: GalleryAsset[] = [];
    if (this.activeTab === 'BRAND_PUBLIC') list = this.galleryData.brandPublic;
    else if (this.activeTab === 'TEAM_UPLOADS') list = this.galleryData.teamUploads;
    else if (this.activeTab === 'AI_GENERATED') list = this.galleryData.aiGenerated;

    if (!this.searchQuery.trim()) return list;
    const q = this.searchQuery.toLowerCase().trim();
    return list.filter(a => (a.name && a.name.toLowerCase().includes(q)) || (a.tag && a.tag.toLowerCase().includes(q)));
  }

  chooseAsset(url: string): void {
    if (!url) return;
    this.selectAsset.emit(url);
    this.closeModal();
  }

  handleImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://messenger.quotedesks.com/wabaptposter.png';
  }

  closeModal(): void {
    this.close.emit();
  }
}
