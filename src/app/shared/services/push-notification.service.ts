// src/app/shared/services/push-notification.service.ts
import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment, HOST } from '../../../environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private messaging: Messaging;

  constructor(private http: HttpClient) {
    const app = initializeApp(environment.firebase);
    this.messaging = getMessaging(app);
  }

  async requestPermissionAndRegister(): Promise<void> {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return;
      }

      // Get the FCM token (use your VAPID key from Firebase Console > Cloud Messaging)
      const token = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      });

      //console.log('FCM Token:', token);

      // Send token to your backend
      this.registerTokenWithBackend(token);
    } catch (err) {
      console.error('Failed to get FCM token:', err);
    }
  }

  private registerTokenWithBackend(fcmToken: string): void {
    const profile = JSON.parse(localStorage.getItem('profile') || 'null');
    if (!profile?.access) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${profile.access}`);
    this.http.post(`${HOST}/users/fcm-token`, 
      { token: fcmToken, device_type: 'web' },
      { headers }
    ).subscribe({
      next: () => {},//console.log('FCM token registered with backend'),
      error: (err) => console.error('Failed to register FCM token:', err)
    });
  }

  listenForForegroundMessages(callback: (payload: any) => void): void {
    onMessage(this.messaging, (payload) => {
      //console.log('Foreground message received:', payload);
      callback(payload);
    });
  }
}