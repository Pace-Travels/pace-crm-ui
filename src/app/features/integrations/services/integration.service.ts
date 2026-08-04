import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Integration {
  id: number;
  name: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class IntegrationService {
  integrations = signal<Integration[]>([]);

  constructor(private api: ApiService) {}

  fetchIntegrations() {
    this.api.get<{success: boolean, data: Integration[]}>('integrations').subscribe(res => {
      if (res.success) {
        this.integrations.set(res.data);
      }
    });
  }
}
