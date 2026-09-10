import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

export interface Agent {
  id: number;
  name: string;
  role?: string;
  systemPrompt?: string;
  modelName?: string;
  status: string;
  avatarUrl?: string;
  isAutopilot?: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  agents = signal<Agent[]>([]);

  constructor(private api: ApiService) {}

  fetchAgents(): Observable<any> {
    const obs = this.api.get<any>('agents');
    obs.subscribe(res => {
      if (res && res.success && Array.isArray(res.data)) {
        this.agents.set(res.data);
      }
    });
    return obs;
  }

  createAgent(payload: Partial<Agent>): Observable<any> {
    return this.api.post<any>('agents', payload);
  }

  updateAgent(id: number, payload: Partial<Agent>): Observable<any> {
    return this.api.put<any>(`agents/${id}`, payload);
  }

  deleteAgent(id: number): Observable<any> {
    return this.api.delete<any>(`agents/${id}`);
  }
}
