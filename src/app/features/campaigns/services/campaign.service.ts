import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Campaign {
  id: number;
  campaignName: string;
  type: string;
  createdAt: string;
  status: string;
  audience: string;
  description?: string;
  templateId?: number;
  parameters?: any;
  totalRecipients?: number;
  sentCount?: number;
  pendingCount?: number;
  failedCount?: number;
  skippedCount?: number;
  autoRetryEnabled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {

  campaigns = signal<Campaign[]>([]);
  isLoading = signal<boolean>(false);

  constructor(private api: ApiService) { }

  fetchCampaigns(silent: boolean = false) {
    if (!silent) {
      this.isLoading.set(true);
    }
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
              audience: audienceLabel,
              description: item.description,
              templateId: item.templateId,
              parameters: item.parameters,
              totalRecipients: item.totalRecipients || 0,
              sentCount: item.sentCount !== undefined ? item.sentCount : (item.deliveredCount || 0),
              pendingCount: item.pendingCount || 0,
              failedCount: item.failedCount || 0,
              skippedCount: item.skippedCount || 0,
              autoRetryEnabled: !!item.autoRetryEnabled
            };
          });
          this.campaigns.set(mapped);
        } else {
          this.campaigns.set([]);
        }
        if (!silent) {
          this.isLoading.set(false);
        }
      },
      error: () => {
        if (!silent) {
          this.isLoading.set(false);
        }
      }
    });
  }

  pauseCampaign(id: number) {
    return this.api.put<any>(`campaigns/${id}/pause`, {});
  }

  resumeCampaign(id: number) {
    return this.api.put<any>(`campaigns/${id}/resume`, {});
  }

  restartCampaign(id: number) {
    return this.api.put<any>(`campaigns/${id}/restart`, {});
  }

  stopCampaign(id: number) {
    return this.api.put<any>(`campaigns/${id}/stop`, {});
  }

  deleteCampaign(id: number) {
    return this.api.delete<any>(`campaigns/delete/${id}`);
  }

  getCampaignResponses(id: number) {
    return this.api.get<any>(`campaigns/responses/${id}`);
  }

  syncResponseToCrm(payload: { recipientId: number; leadStage?: string; readinessStatus?: string; appendTag?: string; targetField?: string; targetValue?: any }) {
    return this.api.post<any>('campaigns/sync-response', payload);
  }

  resendRecipient(recipientId: number) {
    return this.api.post<any>(`campaigns/resend-recipient/${recipientId}`, {});
  }

  resendFailedRecipients(campaignId: number) {
    return this.api.post<any>(`campaigns/resend-failed/${campaignId}`, {});
  }

  sendSelectedRecipients(campaignId: number, recipientIds?: number[], limit?: number) {
    return this.api.post<any>(`campaigns/${campaignId}/send-selected`, { recipientIds, limit });
  }

  toggleAutoRetry(campaignId: number, enabled?: boolean) {
    return this.api.patch<any>(`campaigns/${campaignId}/auto-retry`, { enabled });
  }

  addRecipientToCampaign(campaignId: number, data: { phone: string; name?: string; sendNow?: boolean }) {
    return this.api.post<any>(`campaigns/${campaignId}/add-recipient`, data);
  }

  updateCampaignRecipient(recipientId: number, data: { phone: string; name?: string }) {
    return this.api.put<any>(`campaigns/recipient/${recipientId}`, data);
  }

  resendNewlyAdded(campaignId: number) {
    return this.api.post<any>(`campaigns/${campaignId}/resend-newly-added`, {});
  }

  releaseMemory(campaignId?: number) {
    const url = campaignId ? `campaigns/${campaignId}/release-memory` : 'campaigns/release-memory';
    return this.api.post<any>(url, {});
  }
}
