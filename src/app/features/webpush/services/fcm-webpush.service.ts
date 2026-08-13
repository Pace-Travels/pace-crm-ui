import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { environment } from '../../../../environments/environment'; 

@Injectable({
  providedIn: 'root',
})
export class FcmWebpushService {

  private http = inject(HttpClient);

  private firebaseApp: FirebaseApp = initializeApp(environment.firebase);
  private messaging: Messaging = getMessaging(this.firebaseApp);

  // Node.js Express endpoint to receive tokens
  private backendUrl = 'https://messengerapi.quotedesks.com/api/v1';

  // Reactive signals to expose token & latest notification state
  fcmToken = signal<string | null>(null);
  latestNotification = signal<{ title?: string; body?: string } | null>(null);

  constructor() {
    this.listenForMessages();
  }

  /**
   * Prompt browser for permission and fetch FCM device token
   */
  async requestPermissionAndSaveToken(userId: string): Promise<void> {
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: environment.vapidKey
        });

        if (token) {
          console.log('FCM Token:', token);
          this.fcmToken.set(token);
          this.saveTokenToBackend(userId, token);
        } else {
          console.warn('No registration token available.');
        }
      } else {
        console.warn('Notification permission was denied.');
      }
    } catch (error) {
      console.error('Error fetching FCM token:', error);
    }
  }

  /**
   * Send the FCM token to your Node.js backend
   */
  private saveTokenToBackend(userId: string, token: string): void {
    const payload = { userId, token };

    this.http.post(this.backendUrl, payload).subscribe({
      next: (res) => console.log('Token saved on backend:', res),
      error: (err) => console.error('Failed to send token to backend:', err)
    });
  }

  /**
   * Listen for foreground push messages while using the app
   */
  private listenForMessages(): void {
    onMessage(this.messaging, (payload) => {
      console.log('Foreground notification received:', payload);

      this.latestNotification.set({
        title: payload.notification?.title,
        body: payload.notification?.body
      });
    });
  }

}
