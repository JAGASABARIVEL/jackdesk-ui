import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client'; // Import socket.io-client
import { Subject } from 'rxjs'; // Import Subject to create observables for event listening
import { WEBSOCKET_HOST } from '../../../environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  public socket: Socket | undefined;
  public isSocketConnected: boolean = false;
  private messageSubject = new Subject<any>();
  private messageWebsiteSubject = new Subject<any>();
  private callEventSubject = new Subject<any>();

  constructor(private router: Router) { }

  initSocket(profile: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!profile?.access) {
        console.warn("No access token, cannot init socket");
        return reject('No access token');
      }

      if (this.socket) {
        this.socket.disconnect();
        this.isSocketConnected = false;
      }

      this.socket = io(`${WEBSOCKET_HOST}`, {
        transports: ['websocket'],
        reconnection: true,           // <- Enable reconnection
        reconnectionAttempts: 10,     // <- Number of retries
        reconnectionDelay: 2000,      // <- Delay between retries
        query: {
          token: profile?.access,
        },
      });

      this.registerSocketEvents();

      this.socket.on('connect', () => {
        this.isSocketConnected = true;
        resolve(); // ✅ Connection established
      });

      this.socket.on('connect_error', (err) => {
        console.error('WebSocket connection failed:', err);
        reject(err); // ❌ Handle failure
        this.isSocketConnected = false;
      });
    });
  }


  private registerSocketEvents() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isSocketConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.warn('Disconnected from WebSocket server');
      this.isSocketConnected = false;
    });

    this.socket.on('token_expired', (data) => {
      console.warn('Token expired:', data);
      this.handleExpiredToken();
    });

    this.socket.on('token_invalid', (data) => {
      console.warn('Token invalid:', data);
      this.handleExpiredToken();
    });

    this.socket.on('whatsapp_chat', (data: any) => {
      if (data?.msg_from_type === 'CALL_EVENT') {
        // Route call events to the dedicated subject
        this.callEventSubject.next(data);
      } else {
        // All existing chat messages continue as before
        this.messageSubject.next(data);
      }
    });

    this.socket.on('website_chatwidget_messages_back_to_front', (data: any) => {
      //console.log("received from engineer", data)
      this.messageWebsiteSubject.next(data);
    });
  }

  getCallEvents() {
    return this.callEventSubject.asObservable();
  }

  sendMessage(message: string) {
    this.socket?.emit('website_chatwidget_messages_front_to_back', message);
  }

  getMessages() {
    return this.messageSubject.asObservable();
  }

  getWebsiteChatWidgetMessages() {
    return this.messageWebsiteSubject.asObservable();
  }

  disconnectSocket() {
    this.socket?.disconnect();
    this.socket = undefined;
    this.isSocketConnected = false;
  }

  handleExpiredToken() {
    this.disconnectSocket();
    this.router.navigate(["/login"]);
  }

  setPresence(status: 'available' | 'away'): void {
    this.socket?.emit('set_presence', { status });
  }

  ngOnDestroy() {
    this.disconnectSocket();
  }
}
