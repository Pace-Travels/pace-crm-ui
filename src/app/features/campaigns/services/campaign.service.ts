import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Campaign {
  id: number;
  campaignName: string;
  type: string;
  createdAt: string;
  status: string;
  audience: string;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {

  campaigns = signal<Campaign[]>([]);
  isLoading = signal<boolean>(false);

  constructor(private api: ApiService) { }

  fetchCampaigns() {
    this.isLoading.set(true);
    // Mock data based on screenshot
    const mockData: Campaign[] = [
      { id: 1, campaignName: 'Summer Sale', type: 'BROADCAST', createdAt: '02 Aug 2026, 14:00', status: 'Completed', audience: 'All Users (1.2k)' },
      { id: 2, campaignName: 'Welcome Series', type: 'API', createdAt: '01 Aug 2026, 09:30', status: 'Active', audience: 'New Signups' }
    ];
    
    // Simulate API delay
    setTimeout(() => {
      this.campaigns.set(mockData);
      this.isLoading.set(false);
    }, 500);

    /*
    this.api.get<any>('campaigns/fetchAll').subscribe({
      next: (res) => {
        if(res.success) this.campaigns.set(res.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
    */
  }
}
