import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

export interface SaaSProvisionPayload {
  agencyId: number;
  planType: 'STARTER' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';
  maxSeats: number;
  maxContacts: number;
  maxMessagesPerMonth: number;
  validityDays: number;
  autoRenew: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LicenseAdminService {
  private api = inject(ApiService);

  getAdminOverview(): Observable<any> {
    return this.api.get<any>('licenses/admin/overview');
  }

  provisionLicense(payload: SaaSProvisionPayload): Observable<any> {
    return this.api.post<any>('licenses/provision', payload);
  }

  terminateLicense(licenseId: number, reason: string): Observable<any> {
    return this.api.post<any>(`licenses/${licenseId}/terminate`, { reason });
  }

  suspendLicense(licenseId: number, reason: string): Observable<any> {
    return this.api.post<any>(`licenses/${licenseId}/suspend`, { reason });
  }

  reactivateLicense(licenseId: number, extendDays: number = 30): Observable<any> {
    return this.api.post<any>(`licenses/${licenseId}/reactivate`, { extendDays });
  }
}
