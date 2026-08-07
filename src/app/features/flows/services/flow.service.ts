import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

export interface CanvasNode {
  id: string;
  type: 'TRIGGER' | 'MESSAGE' | 'QUESTION' | 'CONDITION' | 'AI_AGENT' | 'HANDOFF';
  title: string;
  content?: string;
  keyword?: string;
  x: number;
  y: number;
}

export interface CanvasConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface Flow {
  id?: number;
  name: string;
  triggerKeyword?: string;
  nodes?: CanvasNode[];
  connections?: CanvasConnection[];
  status: string;
  aiEnabled?: boolean;
  executionCount?: number;
  nodeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FlowService {
  flows = signal<Flow[]>([]);
  activeFlowsCount = signal<number>(0);
  totalFlowsQuota = signal<number>(10);
  aiEnabledFlows = signal<number>(0);

  activeFlow = signal<Flow | null>(null);

  constructor(private api: ApiService) { }

  fetchFlows(): Observable<any> {
    const obs = this.api.get<{ success: boolean, data: Flow[] }>('flows');
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          const list = res.data || [];
          this.flows.set(list);

          const activeCount = list.filter(f => f.status === 'ACTIVE').length;
          const aiCount = list.filter(f => f.aiEnabled).length;
          this.activeFlowsCount.set(activeCount);
          this.aiEnabledFlows.set(aiCount);
        }
      },
      error: (err) => console.warn('Fetch flows error', err)
    });
    return obs;
  }

  saveFlow(flowPayload: Partial<Flow>): Observable<any> {
    return this.api.post<any>('flows/save', flowPayload);
  }

  getFlow(id: number): Observable<any> {
    const obs = this.api.get<any>(`flows/${id}`);
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.activeFlow.set(res.flow);
        }
      }
    });
    return obs;
  }

  toggleFlow(id: number): Observable<any> {
    return this.api.put<any>(`flows/toggle/${id}`, {});
  }

  testFlow(id: number, triggerMessage?: string): Observable<any> {
    return this.api.post<any>('flows/test', { id, triggerMessage });
  }
}
