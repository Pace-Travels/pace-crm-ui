import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/agentic';

  autopilotStatus = signal<AutopilotStatus | null>(null);
  rfmSegments = signal<RFMCohort[]>([]);
  loading = signal(false);

  fetchAutopilotStatus(): Observable<AutopilotStatus> {
    return this.http.get<AutopilotStatus>(`${this.apiUrl}/autopilot/status`).pipe(
      tap(res => this.autopilotStatus.set(res))
    );
  }

  toggleAutopilot(enabled: boolean, mode?: string): Observable<AutopilotStatus> {
    return this.http.post<AutopilotStatus>(`${this.apiUrl}/autopilot/toggle`, { enabled, mode }).pipe(
      tap(res => this.autopilotStatus.set(res))
    );
  }

  runAutonomousScan(city: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/autopilot/scan`, { city, projectId: 1 }).pipe(
      tap(() => this.fetchAutopilotStatus().subscribe())
    );
  }

  fetchRFMSegments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rfm-segments`).pipe(
      tap(res => this.rfmSegments.set(res.cohorts || []))
    );
  }
}
