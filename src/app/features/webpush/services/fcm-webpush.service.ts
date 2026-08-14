import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

// fcm-webpush.service.ts

export interface DeviceItem {
  idKey: string;
  displayName?: string;
  operatingSystem?: string;
  browser?: string;
  ipAddress?: string;
  deviceType?: string;
  access?: boolean;
}

export interface PushNotificationPayload {
  idKey: string;
  title: string;
  body: string;
  icon?: string;
  clickUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FcmWebpushService {
  private http = inject(HttpClient);
  
  // Base URL from environment (e.g. http://localhost:3000/api/v1)
  private baseUrl = environment.apiUrl; 

  // Signal to store devices for dropdown
  public registeredDevices = signal<DeviceItem[]>([]);

  // 1. Database se registered users/devices ki list lana
  getRegisteredDevices(): Observable<{ data: DeviceItem[] }> {
    return this.http.get<{ data: DeviceItem[] }>(`${this.baseUrl}/deviceregister/getdata`);
  }

  // Devices fetch karke signal update karna
  loadAndSetDevices(): void {
    this.getRegisteredDevices().subscribe({
      next: (response) => {
        if (response && response.data) {
          this.registeredDevices.set(response.data);
        }
      },
      error: (err) => console.error('Error fetching devices:', err)
    });
  }

  // 2. Admin Form se Notification bhejna (Backend handles database lookup & FCM)
  sendNotificationByIdKey(payload: PushNotificationPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/usertoken/sendnotification`, payload);
  }
}