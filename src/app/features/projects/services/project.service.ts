import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Project {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  wabaId?: string;
  testPhoneNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  projects = signal<Project[]>([]);
  currentProject = signal<Project | null>(null);

  constructor(private api: ApiService) {
    this.loadCachedProject();
  }

  loadCachedProject() {
    const cachedId = localStorage.getItem('activeProjectId');
    if (cachedId) {
      this.currentProject.set({ id: Number(cachedId), name: 'Loading...', status: 'Active', createdAt: '' });
    }
  }

  fetchProjects(callback?: () => void) {
    this.api.get<{success: boolean, data: Project[]}>('projects/list').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.projects.set(res.data);
          const cachedId = localStorage.getItem('activeProjectId');
          const match = res.data.find((p: any) => p.id === Number(cachedId));
          if (match) {
            this.currentProject.set(match);
          } else if (res.data.length > 0) {
            this.setCurrentProject(res.data[0]);
          } else {
            this.currentProject.set(null);
          }
          if (callback) callback();
        }
      }
    });
  }

  setCurrentProject(proj: Project | null) {
    this.currentProject.set(proj);
    if (proj) {
      localStorage.setItem('activeProjectId', String(proj.id));
    } else {
      localStorage.removeItem('activeProjectId');
    }
    // Refresh page context to reload lists under new project filters
    window.location.reload();
  }

  createProject(payload: any) {
    return this.api.post<any>('projects/add', payload);
  }
}
