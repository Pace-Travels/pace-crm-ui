import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AutopilotStatus {
  enabled: boolean;
  mode: string;
  minSpendThreshold: number;
  autoCities: string[];
  lastScanTime: string;
  totalLogsCount: number;
  recentLogs: any[];
}

export interface RFMCohort {
  id: string;
  name: string;
  description: string;
  color: string;
  count: number;
  contacts: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AgenticApiService {
  private api = inject(ApiService);
  private basePath = 'agentic';

  autopilotStatus = signal<AutopilotStatus | null>(null);
  rfmSegments = signal<RFMCohort[]>([]);
  loading = signal(false);

  fetchAutopilotStatus(): Observable<AutopilotStatus> {
    return this.api.get<AutopilotStatus>(`${this.basePath}/autopilot/status`).pipe(
      tap(res => this.autopilotStatus.set(res))
    );
  }

  toggleAutopilot(enabled: boolean, mode?: string): Observable<AutopilotStatus> {
    return this.api.post<AutopilotStatus>(`${this.basePath}/autopilot/toggle`, { enabled, mode }).pipe(
      tap(res => this.autopilotStatus.set(res))
    );
  }

  runAutonomousScan(city: string): Observable<any> {
    return this.api.post<any>(`${this.basePath}/autopilot/scan`, { city, projectId: 1 }).pipe(
      tap(() => this.fetchAutopilotStatus().subscribe())
    );
  }

  fetchRFMSegments(): Observable<any> {
    return this.api.get<any>(`${this.basePath}/rfm-segments`).pipe(
      tap(res => this.rfmSegments.set(res.cohorts || []))
    );
  }
}
