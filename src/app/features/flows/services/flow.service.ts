import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Flow {
  id: number;
  name: string;
  flowName?: string;
  createdBy?: string;
  status: string | boolean;
  createdAt: string;
  flowName?: string;
  createdBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FlowService {
  flows = signal<Flow[]>([]);

  // For the chart and metrics
  activeFlowsCount = signal<number>(0);
  totalFlowsQuota = signal<number>(1);
  aiEnabledFlows = signal<number>(0);

  constructor(private api: ApiService) { }

  fetchFlows() {
    this.api.get<{ success: boolean, data: Flow[] }>('flows').subscribe(res => {
      if (res.success) {
        this.flows.set(res.data);
      }
    });
  }
}
