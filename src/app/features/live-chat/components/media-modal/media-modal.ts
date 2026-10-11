import { Component, EventEmitter, Output, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { ApiService } from '../../../../shared/services/api.service';

export type MediaType = 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO' | 'LINK';

export interface MediaPayload {
  messageType: MediaType;
  mediaUrl: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
}

@Component({
  selector: 'app-media-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-modal.html',
  styleUrl: './media-modal.scss'
})
export class MediaModal {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() sendMedia = new EventEmitter<MediaPayload>();

  api = inject(ApiService);
  http = inject(HttpClient);

  selectedType: MediaType = 'IMAGE';
  inputMode: 'UPLOAD' | 'URL' = 'UPLOAD';
  
  mediaUrl = '';
  caption = '';
  fileName = '';
  fileSize = 0;
  
  isUploading = signal(false);
  uploadProgress = signal(0);
  previewUrl = signal<string | null>(null);
  uploadError = signal<string | null>(null);

  isDragging = false;

  onTypeChange(type: MediaType) {
    this.selectedType = type;
    this.resetUploadState();
  }

  onModeChange(mode: 'UPLOAD' | 'URL') {
    this.inputMode = mode;
    this.resetUploadState();
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  onFilePicked(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0]);
    }
  }

  private handleFileSelected(file: File) {
    this.uploadError.set(null);
    this.fileName = file.name;
    this.fileSize = file.size;

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      this.uploadError.set('File size exceeds maximum allowed limit of 50MB.');
      return;
    }

    // Auto detect media type if needed
    if (file.type.startsWith('image/')) this.selectedType = 'IMAGE';
    else if (file.type.startsWith('video/')) this.selectedType = 'VIDEO';
    else if (file.type.startsWith('audio/')) this.selectedType = 'AUDIO';
    else if (file.type === 'application/pdf') this.selectedType = 'PDF';

    // Local object URL preview
    const objectUrl = URL.createObjectURL(file);
    this.previewUrl.set(objectUrl);

    // Upload to backend storage
    this.uploadFileToBackend(file);
  }

  private uploadFileToBackend(file: File) {
    this.isUploading.set(true);
    this.uploadProgress.set(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderCategory', 'chat-media');

    const uploadUrl = `${this.api.baseUrl}/storage/upload`;

    this.http.post<any>(uploadUrl, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const percent = Math.round((100 * event.loaded) / event.total);
          this.uploadProgress.set(percent);
        } else if (event.type === HttpEventType.Response) {
          this.isUploading.set(false);
          const res = event.body;
          if (res && res.success && res.url) {
            this.mediaUrl = res.url;
          } else {
            this.uploadError.set(res?.error || 'Failed to complete upload.');
          }
        }
      },
      error: (err: any) => {
        this.isUploading.set(false);
        this.uploadError.set(err.error?.error || err.message || 'File upload failed');
      }
    });
  }

  onUrlInput(url: string) {
    this.mediaUrl = url;
    if (url.trim()) {
      this.previewUrl.set(url.trim());
    } else {
      this.previewUrl.set(null);
    }
  }

  submitMedia() {
    if (!this.mediaUrl.trim()) {
      this.uploadError.set('Please select or upload a valid file / URL.');
      return;
    }

    this.sendMedia.emit({
      messageType: this.selectedType,
      mediaUrl: this.mediaUrl.trim(),
      caption: this.caption.trim(),
      fileName: this.fileName,
      fileSize: this.fileSize
    });

    this.closeModal();
  }

  closeModal() {
    this.resetUploadState();
    this.close.emit();
  }

  private resetUploadState() {
    this.mediaUrl = '';
    this.caption = '';
    this.fileName = '';
    this.fileSize = 0;
    this.isUploading.set(false);
    this.uploadProgress.set(0);
    this.previewUrl.set(null);
    this.uploadError.set(null);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
