import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface WhatsappNumber {
  id: number;
  projectId: number;
  phoneNumberId: string;
  phoneNumber: string;
  phoneDisplayNumber?: string;
  verifiedName?: string;
  qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  messagingLimit: string;
  codeVerificationStatus: string;
  status: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface Project {
  id: number;
  name: string;
  iconUrl?: string;
  status: string;
  createdAt: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  testPhoneNumber?: string;
  testPhoneNumberId?: string;
  testAccessToken?: string;
  mode?: 'DEVELOPMENT' | 'PRODUCTION';
  whatsappNumbers?: WhatsappNumber[];
  connectionStatus?: 'CONNECTED' | 'EXPIRED' | 'BROKEN' | 'UNKNOWN';
  tokenExpiresAt?: string | null;
  lastHealthCheckAt?: string | null;
  lastHealthError?: string | null;
  failedSendCount?: number;
  isSandbox?: boolean;
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

  updateProject(id: number, payload: any) {
    return this.api.put<any>(`projects/${id}`, payload);
  }

  metaAuth(accessToken: string) {
    return this.api.post<any>('projects/meta-auth', { accessToken });
  }

  impactPreview(projectIds: number[]) {
    return this.api.post<any>('projects/impact-preview', { projectIds });
  }

  syncProjects(payload: any) {
    return this.api.post<any>('projects/meta-sync', payload);
  }

  undoSync(auditId: number) {
    return this.api.post<any>(`projects/meta-sync/undo/${auditId}`, {});
  }

  detachConfig(projectId: number) {
    return this.api.post<any>('projects/detach', { projectId });
  }

  addPhoneNumber(payload: any) {
    return this.api.post<any>('projects/phone-number/add', payload);
  }

  togglePhoneNumberStatus(numberId: number, isActive: boolean) {
    return this.api.put<any>(`projects/phone-number/${numberId}/status`, { isActive });
  }
}
