import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MediaAsset {
  id: number;
  projectId?: number;
  uploaderUserId?: number;
  title: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'STICKER';
  s3Key: string;
  publicUrl: string;
  thumbnailUrl?: string;
  dimensions?: string;
  durationSeconds?: number;
  tags?: string;
  categorySource: 'UPLOAD' | 'AI_GENERATED' | 'BRAND_LIBRARY' | 'CAMPAIGN';
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryStats {
  totalFiles: number;
  totalSizeFormatted: string;
  totalSizeBytes: number;
  imageCount: number;
  videoCount: number;
  documentCount: number;
  audioCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl || 'https://messengerapi.quotedesks.com/api/v1'}/gallery`;

  assets = signal<MediaAsset[]>([]);
  stats = signal<GalleryStats | null>(null);
  isLoading = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);

  fetchAssets(mediaType: string = 'ALL', search: string = '', categorySource: string = 'ALL'): Observable<any> {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (mediaType && mediaType !== 'ALL') params = params.set('mediaType', mediaType);
    if (search && search.trim()) params = params.set('search', search.trim());
    if (categorySource && categorySource !== 'ALL') params = params.set('categorySource', categorySource);

    return this.http.get<any>(`${this.apiUrl}/assets`, { params });
  }

  fetchStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  uploadFile(file: File, title?: string, categorySource: string = 'UPLOAD'): Observable<any> {
    this.isUploading.set(true);
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    formData.append('categorySource', categorySource);

    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  deleteAsset(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/assets/${id}`);
  }

  updateAsset(id: number, data: { title?: string; tags?: string[] }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/assets/${id}`, data);
  }
}
