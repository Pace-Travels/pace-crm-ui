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
    this.api.get<any>('campaigns/list').subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          const mapped: Campaign[] = res.data.map((item: any) => {
            let audienceLabel = 'All Contacts';
            if (item.targetType === 'B2B') audienceLabel = 'B2B Business Contacts';
            else if (item.targetType === 'B2C') audienceLabel = 'B2C Travel Customers';
            else if (item.targetType === 'GROUP') audienceLabel = `Group #${item.targetGroupId || 'Default'}`;

            const formattedDate = item.createdAt 
              ? new Date(item.createdAt).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'Recently';

            return {
              id: item.id,
              campaignName: item.name || 'Untitled Campaign',
              type: item.targetType || 'BROADCAST',
              createdAt: formattedDate,
              status: item.status || 'RUNNING',
              audience: audienceLabel
            };
          });
          this.campaigns.set(mapped);
        } else {
          this.campaigns.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  deleteCampaign(id: number) {
    return this.api.delete<any>(`campaigns/delete/${id}`);
  }
}
