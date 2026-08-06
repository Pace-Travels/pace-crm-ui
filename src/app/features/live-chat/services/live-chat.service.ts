import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface Conversation {
  id: number;
  contactId: number;
  platform: string;
  status: string;
  assignedToType?: string;
  Contact?: {
    name?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
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

  // Buffer input message
  chatInputMessage = signal('');

  // BehaviorSubject for messages so chat window can subscribe
  messagesSubject = new BehaviorSubject<any[]>([]);
  messages$ = this.messagesSubject.asObservable();

  private socket!: Socket;

  constructor(private api: ApiService) {
    this.initSocket();
  }

  private initSocket() {
    // Establish connection to backend WebSocket server
    this.socket = io('https://messengerapi.quotedesks.com');

    this.socket.on('new_message', (data: any) => {
      const active = this.selectedConversation();
      if (active && data.conversationId === active.id) {
        const current = this.messagesSubject.value;
        if (!current.find((m: any) => m.id === data.id)) {
          this.messagesSubject.next([...current, data]);
        }
      }
    });

    this.socket.on('message_status_update', (data: any) => {
      // data format: { messageId, status }
      const current = this.messagesSubject.value.map((m: any) => {
        if (m.id === data.messageId) {
          return { ...m, status: data.status };
        }
        return m;
      });
      this.messagesSubject.next(current);
    });
  }

  fetchConversations() {
    this.api.get<any>('conversations/list').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          // Resolve contact associations mapping mock
          const list = res.data.map((c: any) => {
            const contact = c.Contact || { name: `Contact ${c.contactId || c.id}`, phone: c.phone || '917204262473' };
            if (!contact.firstName) {
              const parts = (contact.name || '').split(' ');
              contact.firstName = parts[0] || 'Customer';
              contact.lastName = parts.slice(1).join(' ') || '';
            }
            return {
              ...c,
              Contact: contact
            };
          });
          this.activeConversations.set(list);
        }
      },
      error: () => {
        // Fallback mockup if empty
        const mockData: Conversation[] = [
          { id: 1, contactId: 101, platform: 'WHATSAPP', status: 'OPEN', assignedToType: 'AI', Contact: { name: 'VIP Guest', firstName: 'VIP', lastName: 'Guest', phone: '917428262731' }, Messages: [] },
          { id: 2, contactId: 102, platform: 'WHATSAPP', status: 'OPEN', assignedToType: 'HUMAN', Contact: { name: 'John travels', firstName: 'John', lastName: 'travels', phone: '919876543210' }, Messages: [] }
        ];
        this.activeConversations.set(mockData);
      }
    });
  }

  selectConversation(conv: Conversation) {
    const prev = this.selectedConversation();
    if (prev) {
      this.socket.emit('leave_conversation', prev.id);
    }

    this.selectedConversation.set(conv);
    this.socket.emit('join_conversation', conv.id);
    
    // Fetch live messages
    this.api.get<any>('messages/list').subscribe({
      next: (res: any) => {
        const all = res.data || [];
        const filtered = all.filter((m: any) => m.conversationId === conv.id);
        this.messagesSubject.next(filtered);
      },
      error: () => {
        this.messagesSubject.next(conv.Messages || []);
      }
    });
  }
}
