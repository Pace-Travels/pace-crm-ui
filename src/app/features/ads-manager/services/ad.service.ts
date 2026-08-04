import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Ad {
  id: number;
  name: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdService {
  ads = signal<Ad[]>([]);

  constructor(private api: ApiService) {}

  fetchAds() {
    this.api.get<{success: boolean, data: Ad[]}>('ads').subscribe(res => {
      if (res.success) {
        this.ads.set(res.data);
      }
    });
  }
}
