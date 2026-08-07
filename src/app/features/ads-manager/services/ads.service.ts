import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

export interface FBPage {
  pageId: string;
  name: string;
  category?: string;
}

export interface AdSetupState {
  id?: number;
  projectId?: number;
  pageId?: string;
  pageName?: string;
  termsAccepted?: boolean;
  whatsappNumber?: string;
  status?: string;
  isConnectedFB?: boolean;
  pages?: FBPage[];
}

export interface AdAnalytics {
  totalCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversations: number;
  totalSpend: number;
  adCreditsBalance: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdsService {
  currentStep = signal<number>(1);
  setupState = signal<AdSetupState | null>(null);
  analytics = signal<AdAnalytics>({
    totalCampaigns: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversations: 0,
    totalSpend: 0,
    adCreditsBalance: 1000.00
  });
  campaigns = signal<any[]>([]);

  constructor(private api: ApiService) {}

  fetchSetupState(): Observable<any> {
    const obs = this.api.get<any>('ads/setup');
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.currentStep.set(res.step || 1);
          this.setupState.set(res.setup);
        }
      },
      error: (err) => console.warn('Fetch ads setup error', err)
    });
    return obs;
  }

  connectFacebook(accessToken: string): Observable<any> {
    return this.api.post<any>('ads/fb-connect', { accessToken });
  }

  selectPage(pageId: string, pageName?: string): Observable<any> {
    return this.api.post<any>('ads/select-page', { pageId, pageName });
  }

  acceptTerms(): Observable<any> {
    return this.api.post<any>('ads/accept-terms', {});
  }

  linkWhatsappNumber(whatsappNumber: string): Observable<any> {
    return this.api.post<any>('ads/link-number', { whatsappNumber });
  }

  createAd(payload: { name: string; budget: number; headline?: string; primaryText?: string }): Observable<any> {
    return this.api.post<any>('ads/create', payload);
  }

  fetchAnalytics(): Observable<any> {
    const obs = this.api.get<any>('ads/analytics');
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.analytics.set(res.analytics);
          this.campaigns.set(res.campaigns || []);
        }
      },
      error: (err) => console.warn('Fetch ads analytics error', err)
    });
    return obs;
  }
}
