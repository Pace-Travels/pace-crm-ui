import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { BehaviorSubject, Observable } from 'rxjs';

// Note: Ensure socket.io-client is installed in package.json if real-time is needed.
// import { io, Socket } from 'socket.io-client';

export interface Conversation {
  id: number;
  contactId: number;
  platform: string;
  status: string;
  Contact?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  Messages?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class LiveChatService {
  
  // State management using Signals
  activeConversations = signal<Conversation[]>([]);
  requestingConversations = signal<Conversation[]>([]);
  
  // Currently selected conversation
  selectedConversation = signal<Conversation | null>(null);

  // BehaviorSubject for messages so chat window can subscribe
  private messagesSubject = new BehaviorSubject<any[]>([]);
  messages$ = this.messagesSubject.asObservable();

  // private socket: Socket;

  constructor(private api: ApiService) {
    this.initSocket();
  }

  initSocket() {
    // this.socket = io('https://messengerapi.quotedesks.com');
    // this.socket.on('new_message', (msg) => {
    //   if (this.selectedConversation()?.id === msg.conversationId) {
    //     this.messagesSubject.next([...this.messagesSubject.value, msg]);
    //   }
    // });
  }

  fetchConversations() {
    // Mock data based on screenshots
    const mockData: Conversation[] = [
      { id: 1, contactId: 101, platform: 'WHATSAPP', status: 'OPEN', Contact: { firstName: 'UNKNOWN', lastName: '', phone: '917428262731' }, Messages: [{ textContent: 'Unsupported message received' }] },
      { id: 2, contactId: 102, platform: 'WHATSAPP', status: 'OPEN', Contact: { firstName: 'PANDU', lastName: '', phone: '919876543210' }, Messages: [{ textContent: 'SYSTEM: Authentication Message Sent' }] },
      { id: 3, contactId: 103, platform: 'WHATSAPP', status: 'OPEN', Contact: { firstName: 'MAHADEV', lastName: 'KHOT', phone: '918765432109' }, Messages: [{ textContent: 'SYSTEM: Authentication Message Sent' }] }
    ];
    this.activeConversations.set(mockData);

    // If using real API:
    // this.api.get<any>('conversations/fetchAll').subscribe(res => {
    //   if (res.success) {
    //     this.activeConversations.set(res.data);
    //   }
    // });
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation.set(conv);
    
    // Mock fetch messages
    this.messagesSubject.next(conv.Messages || []);
  }
}
