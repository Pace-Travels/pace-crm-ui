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

export interface AccountAgent {
  id: number;
  name: string;
  email?: string;
  roleId?: number;
  roleName?: string;
  isActive?: boolean;
  avatarUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  agents = signal<Agent[]>([]);
  accountAgents = signal<AccountAgent[]>([]);

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

  fetchAccountAgents(): Observable<any> {
    const obs = this.api.get<any>('agents/account-agents');
    obs.subscribe(res => {
      if (res && res.success && Array.isArray(res.data)) {
        this.accountAgents.set(res.data);
      }
    });
    return obs;
  }

  assignConversation(conversationId: number, userId: number | null, assignedToType: string = 'HUMAN'): Observable<any> {
    return this.api.post<any>('agents/assign-conversation', {
      conversationId,
      userId,
      assignedToType
    });
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

