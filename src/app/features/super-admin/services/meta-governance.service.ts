import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MetaGovernanceFrontendService {
  private api = inject(ApiService);

  getPlatformRadar(): Observable<any> {
    return this.api.get<any>('meta-governance/radar');
  }

  getTenantsHealth(): Observable<any> {
    return this.api.get<any>('meta-governance/tenants-health');
  }

  restrictTenant(agencyId: number, allow: boolean, reason: string): Observable<any> {
    return this.api.post<any>(`meta-governance/tenants/${agencyId}/restrict`, { allow, reason });
  }
}
