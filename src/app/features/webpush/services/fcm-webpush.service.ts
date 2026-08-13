import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DeviceItem {
  id: number;
  idKey: string;
  fcmToken: string | null;
  displayName: string;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  access: boolean | null;
}

@Injectable({
  providedIn: 'root',
})
export class FcmWebpushService {

  private http = inject(HttpClient);

  private firebaseApp: FirebaseApp = initializeApp(environment.firebase);
  private messaging: Messaging = getMessaging(this.firebaseApp);

  private backendUrl = 'https://messengerapi.quotedesks.com/api/v1';

  fcmToken = signal<string | null>(null);
  registeredDevices = signal<DeviceItem[]>([]);
  latestNotification = signal<{ title?: string; body?: string } | null>(null);

  constructor() {
    this.listenForMessages();
  }

  getRegisteredDevices(): Observable<{ success: boolean; data: DeviceItem[] }> {
    return this.http.get<{ success: boolean; data: DeviceItem[] }>(
      `${this.backendUrl}/deviceregister/getdata`
    );
  }

  /**
   * 🆕 Send notification request using idKey
   * Endpoint: /userToken/sendnotification
   */
  sendNotificationByIdKey(payload: {
    idKey: string;
    title: string;
    body: string;
    icon?: string;
    clickUrl?: string;
  }): Observable<any> {
    const formattedPayload = {
      idKey: payload.idKey,
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/favicon.ico',
      clickUrl: payload.clickUrl || '/'
    };

    return this.http.post(`${this.backendUrl}/usertoken/sendnotification`, formattedPayload);
  }

  loadAndSetDevices(): void {
    this.getRegisteredDevices().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.registeredDevices.set(res.data);
        }
      },
      error: (err) => console.error('Failed to load devices:', err)
    });
  }

  async requestPermissionAndSaveToken(userId: string): Promise<void> {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: environment.vapidKey
        });

        if (token) {
          this.fcmToken.set(token);
          this.saveTokenToBackend(userId, token);
        }
      }
    } catch (error) {
      console.error('Error fetching FCM token:', error);
    }
  }

  private saveTokenToBackend(userId: string, token: string): void {
    this.http.post(`${this.backendUrl}/save-token`, { userId, token }).subscribe({
      next: () => this.loadAndSetDevices(),
      error: (err) => console.error('Failed to send token to backend:', err)
    });
  }

  private listenForMessages(): void {
    onMessage(this.messaging, (payload) => {
      this.latestNotification.set({
        title: payload.notification?.title,
        body: payload.notification?.body
      });
    });
  }
}