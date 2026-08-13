import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  
  // Global maintenance signal
  maintenanceActive = signal<boolean>(false);

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    this.socket = io('https://messengerapi.quotedesks.com');

    // Listen for global maintenance mode broadcasts
    this.socket.on('maintenance_mode', (data: { status: boolean }) => {
      this.maintenanceActive.set(data.status);
    });
  }

  getSocket(): Socket {
    return this.socket;
  }
}
