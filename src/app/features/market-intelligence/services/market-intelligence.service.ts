import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

export interface CompetitorItem {
  id: number;
  name: string;
  brandName?: string;
  websiteUrl?: string;
  industry?: string;
  priority?: string;
  status?: string;
  watchlist?: boolean;
  aggressionScore: number;
  opportunityScore: number;
}

export interface AdItem {
  id: number;
  competitorId?: number;
  competitorName?: string;
  headline: string;
  description: string;
  cta: string;
  platform: string;
  category: string;
  estimatedSpend: number;
  launchDate: string;
}

export interface PriceItem {
  id: number;
  competitorId?: number;
  competitorName?: string;
  productName: string;
  previousPrice: number;
  newPrice: number;
  currency: string;
  changeType: string;
  percentageChange: number;
  promoCode?: string;
}

export interface RecommendationItem {
  title: string;
  actionText: string;
  reasoning: string;
  suggestedRoute: string;
  confidenceScore: number;
}

export interface MarketIntelligenceDashboardData {
  activeCompetitorsCount: number;
  todayDetectedChanges: number;
  activeAdsCount: number;
  priceChangesCount: number;
  overallAggressionScore: number;
  overallOpportunityScore: number;
  executiveSummary: string;
  recommendations: RecommendationItem[];
  competitors: CompetitorItem[];
  ads: AdItem[];
  pricing: PriceItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MarketIntelligenceService {
  private api = inject(ApiService);

  dashboardData = signal<MarketIntelligenceDashboardData | null>(null);
  isLoading = signal<boolean>(false);
  isAnalyzing = signal<boolean>(false);

  fetchDashboard() {
    this.isLoading.set(true);
    this.api.get<any>('/market-intelligence/dashboard').subscribe({
      next: (res: any) => {
        if (res.success && res.dashboard) {
          this.dashboardData.set(res.dashboard);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  runAiAnalysis(): Observable<any> {
    this.isAnalyzing.set(true);
    return this.api.post<any>('/market-intelligence/analyze', {});
  }

  addCompetitor(payload: any): Observable<any> {
    return this.api.post<any>('/market-intelligence/competitors', payload);
  }
}
