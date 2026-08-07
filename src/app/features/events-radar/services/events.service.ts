import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

export interface EventItem {
  id: number;
  title: string;
  category: 'CONCERT' | 'SPORTS' | 'EXPO_CONFERENCE' | 'FESTIVAL' | 'PUBLIC_HOLIDAY';
  city: string;
  country: string;
  venue?: string;
  startDate: string;
  endDate?: string;
  attendanceEstimate: number;
  travelerCount: number;
  localCount: number;
  accommodationSpend: number;
  hospitalitySpend: number;
  transportSpend: number;
  totalPredictedSpend: number;
  rankScore: number;
  sourceApi: string;
}

export interface EventSummary {
  totalEvents: number;
  highSurgeCount: number;
  totalTravelers: number;
  totalPredictedSpend: number;
  selectedCity: string;
}

export interface CitySummary {
  city: string;
  country: string;
  activeEvents: number;
  totalPredictedSpend: number;
  surgeStatus: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  events = signal<EventItem[]>([]);
  summary = signal<EventSummary>({
    totalEvents: 0,
    highSurgeCount: 0,
    totalTravelers: 0,
    totalPredictedSpend: 0,
    selectedCity: 'Mumbai'
  });
  cities = signal<CitySummary[]>([]);

  constructor(private api: ApiService) {}

  fetchEventRadar(city = 'Mumbai', category = 'ALL', minSpend?: number): Observable<any> {
    let url = `events/radar?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`;
    if (minSpend) url += `&minSpend=${minSpend}`;

    const obs = this.api.get<any>(url);
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.events.set(res.events || []);
          this.summary.set(res.summary);
        }
      },
      error: (err) => console.warn('Fetch event radar error', err)
    });
    return obs;
  }

  syncEvents(city: string): Observable<any> {
    return this.api.post<any>('events/sync', { city });
  }

  fetchCities(): Observable<any> {
    const obs = this.api.get<any>('events/cities');
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.cities.set(res.cities || []);
        }
      }
    });
    return obs;
  }
}
