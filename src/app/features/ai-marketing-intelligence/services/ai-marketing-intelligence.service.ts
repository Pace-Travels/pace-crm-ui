import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AIMarketingIntelligenceService {
  private api = inject(ApiService);

  getOverview(): Observable<any> {
    return this.api.get('/marketing-intelligence/overview');
  }

  getCompetitors(): Observable<any> {
    return this.api.get('/marketing-intelligence/competitors');
  }

  addCompetitor(data: any): Observable<any> {
    return this.api.post('/marketing-intelligence/competitors/add', data);
  }

  deleteCompetitor(id: number | string): Observable<any> {
    return this.api.delete(`/marketing-intelligence/competitors/${id}`);
  }

  discoverCompetitors(params: any): Observable<any> {
    return this.api.post('/marketing-intelligence/competitors/discover', params);
  }

  analyzeCompetitorPattern(id: number | string): Observable<any> {
    return this.api.get(`/marketing-intelligence/competitors/${id}/analyze`);
  }

  runMarketAnalysis(): Observable<any> {
    return this.api.post('/marketing-intelligence/run-analysis', {});
  }

  getMetaAds(): Observable<any> {
    return this.api.get('/marketing-intelligence/meta-ads');
  }

  getMarketDemand(): Observable<any> {
    return this.api.get('/marketing-intelligence/demand');
  }

  getGeographyIntelligence(): Observable<any> {
    return this.api.get('/marketing-intelligence/geography');
  }

  getRecommendations(): Observable<any> {
    return this.api.get('/marketing-intelligence/recommendations');
  }

  generateWhatsappStatus(params: any): Observable<any> {
    return this.api.post('/marketing-intelligence/studio/whatsapp-status', params);
  }

  generateFacebookCampaign(params: any): Observable<any> {
    return this.api.post('/marketing-intelligence/studio/facebook-campaign', params);
  }

  getAlerts(): Observable<any> {
    return this.api.get('/marketing-intelligence/alerts');
  }

  generateReport(reportType: string, format: string): Observable<any> {
    return this.api.get(`/marketing-intelligence/reports/download?reportType=${reportType}&format=${format}`);
  }

  getSettings(): Observable<any> {
    return this.api.get('/marketing-intelligence/settings');
  }
}
