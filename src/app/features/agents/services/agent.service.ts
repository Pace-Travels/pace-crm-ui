import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Agent {
  id: number;
  name: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  agents = signal<Agent[]>([]);

  constructor(private api: ApiService) {}

  fetchAgents() {
    this.api.get<{success: boolean, data: Agent[]}>('agents').subscribe(res => {
      if (res.success) {
        this.agents.set(res.data);
      }
    });
  }
}
