import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type EnvironmentMode = 'DEVELOPMENT' | 'PRODUCTION';

export interface ActiveSettingsResponse {
  success: boolean;
  activeMode: EnvironmentMode;
  activePhoneNumber: string | null;
  activePhoneNumberId: string | null;
  wabaId: string | null;
  config: {
    id: number;
    projectId: number;
    mode: EnvironmentMode;
    phoneNumber: string | null;
    phoneNumberId: string | null;
    testPhoneNumber: string | null;
    testPhoneNumberId: string | null;
  } | null;
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentModeService {
  currentMode = signal<EnvironmentMode>('DEVELOPMENT');
  activePhoneNumber = signal<string | null>(null);
  configDetails = signal<any>(null);

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    this.initMode();
  }

  private initMode() {
    const savedMode = localStorage.getItem('whatsapp_environment_mode') as EnvironmentMode;
    if (savedMode === 'DEVELOPMENT' || savedMode === 'PRODUCTION') {
      this.currentMode.set(savedMode);
    } else {
      this.currentMode.set('DEVELOPMENT');
    }
  }

  getMode(): EnvironmentMode {
    return this.currentMode();
  }

  setMode(mode: EnvironmentMode, notifyBackend: boolean = true) {
    this.currentMode.set(mode);
    localStorage.setItem('whatsapp_environment_mode', mode);

    if (notifyBackend) {
      const projectId = localStorage.getItem('activeProjectId');
      const token = localStorage.getItem('token') || '';
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Project-Id': projectId || '',
        'X-Environment-Mode': mode
      });

      const url = `${this.baseUrl.replace(/\/$/, '')}/whatsappsettings/mode`;
      this.http.post(url, { mode, projectId }, { headers }).subscribe({
        next: (res: any) => {
          this.fetchCurrentSettings();
        },
        error: (err) => {
          console.warn('Could not sync mode to backend', err);
        }
      });
    } else {
      this.fetchCurrentSettings();
    }
  }

  fetchCurrentSettings() {
    const projectId = localStorage.getItem('activeProjectId');
    if (!projectId) return;

    const token = localStorage.getItem('token') || '';
    const mode = this.getMode();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Project-Id': projectId,
      'X-Environment-Mode': mode
    });

    const url = `${this.baseUrl.replace(/\/$/, '')}/whatsappsettings/current`;
    this.http.get<ActiveSettingsResponse>(url, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.activePhoneNumber.set(res.activePhoneNumber);
          this.configDetails.set(res.config);
          if (res.activeMode && res.activeMode !== this.getMode()) {
            this.currentMode.set(res.activeMode);
            localStorage.setItem('whatsapp_environment_mode', res.activeMode);
          }
        }
      },
      error: (err) => console.warn('Could not fetch active whatsapp settings', err)
    });
  }
}
