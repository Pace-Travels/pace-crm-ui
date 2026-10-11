import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryService, MediaAsset, GalleryStats } from '../services/gallery.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gallery-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gallery-view.html',
  styleUrl: './gallery-view.scss'
})
export class GalleryView implements OnInit {
  galleryService = inject(GalleryService);

  // Filters & View State
  activeTab = signal<string>('ALL');
  searchQuery = signal<string>('');
  viewMode = signal<'GRID' | 'LIST'>('GRID');
  sortBy = signal<'NEWEST' | 'SIZE' | 'NAME'>('NEWEST');

  // Modals state
  showUploadModal = signal<boolean>(false);
  showPreviewModal = signal<boolean>(false);
  selectedAsset = signal<MediaAsset | null>(null);

  // Upload state
  dragOver = signal<boolean>(false);
  selectedFiles = signal<File[]>([]);
  uploading = signal<boolean>(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.galleryService.fetchAssets(this.activeTab(), this.searchQuery()).subscribe({
      next: (res: any) => {
        this.galleryService.assets.set(res.data || []);
        this.galleryService.isLoading.set(false);
      },
      error: () => this.galleryService.isLoading.set(false)
    });

    this.galleryService.fetchStats().subscribe({
      next: (res: any) => {
        if (res.stats) {
          this.galleryService.stats.set(res.stats);
        }
      }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
    this.loadData();
  }

  onSearchChange() {
    this.loadData();
  }

  get processedAssets(): MediaAsset[] {
    let list = [...this.galleryService.assets()];
    const query = this.searchQuery().trim().toLowerCase();

    if (query) {
      list = list.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.filename.toLowerCase().includes(query)
      );
    }

    const sort = this.sortBy();
    if (sort === 'NEWEST') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'SIZE') {
      list.sort((a, b) => b.fileSize - a.fileSize);
    } else if (sort === 'NAME') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }

  // File Selection & Drag & Drop Handling
  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFiles(Array.from(input.files));
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
  }

  addFiles(files: File[]) {
    const current = [...this.selectedFiles()];
    files.forEach(f => {
      if (!current.some(existing => existing.name === f.name && existing.size === f.size)) {
        current.push(f);
      }
    });
    this.selectedFiles.set(current);
  }

  removeFile(index: number) {
    const current = [...this.selectedFiles()];
    current.splice(index, 1);
    this.selectedFiles.set(current);
  }

  startUpload() {
    const files = this.selectedFiles();
    if (files.length === 0) return;

    this.uploading.set(true);
    let uploadedCount = 0;

    files.forEach(file => {
      this.galleryService.uploadFile(file).subscribe({
        next: () => {
          uploadedCount++;
          if (uploadedCount === files.length) {
            this.uploading.set(false);
            this.selectedFiles.set([]);
            this.showUploadModal.set(false);
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: `${uploadedCount} file(s) uploaded successfully to S3 Gallery`,
              timer: 3000,
              showConfirmButton: false
            });
            this.loadData();
          }
        },
        error: (err) => {
          this.uploading.set(false);
          Swal.fire('Upload Error', err.error?.message || 'Failed to upload asset', 'error');
        }
      });
    });
  }

  // Copy CDN Public URL
  copyPublicUrl(asset: MediaAsset, event?: Event) {
    if (event) event.stopPropagation();
    navigator.clipboard.writeText(asset.publicUrl);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'S3 Public URL copied to clipboard!',
      timer: 2000,
      showConfirmButton: false
    });
  }

  // Preview Lightbox Modal
  openPreview(asset: MediaAsset) {
    this.selectedAsset.set(asset);
    this.showPreviewModal.set(true);
  }

  closePreview() {
    this.showPreviewModal.set(false);
    this.selectedAsset.set(null);
  }

  // Delete Asset
  deleteAsset(asset: MediaAsset, event?: Event) {
    if (event) event.stopPropagation();

    Swal.fire({
      title: 'Delete Asset?',
      text: `Are you sure you want to delete "${asset.title}" from S3 bucket and gallery?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    }).then((res) => {
      if (res.isConfirmed) {
        this.galleryService.deleteAsset(asset.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Media asset removed from S3.', 'success');
            if (this.selectedAsset()?.id === asset.id) {
              this.closePreview();
            }
            this.loadData();
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Failed to delete asset', 'error')
        });
      }
    });
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
