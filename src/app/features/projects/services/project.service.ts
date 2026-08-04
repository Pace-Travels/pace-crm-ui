import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Project {
  id: number;
  name: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  projects = signal<Project[]>([]);

  constructor(private api: ApiService) {}

  fetchProjects() {
    this.api.get<{success: boolean, data: Project[]}>('projects').subscribe(res => {
      if (res.success) {
        this.projects.set(res.data);
      }
    });
  }
}
