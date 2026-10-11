import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface Conversation {
  id: number;
  contactId: number;
  platform?: string;
  status: string;
  assignedToType?: string;
  assignedToUserId?: number | null;
  Contact?: {
    id?: number;
    name?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  };
  Messages?: any[];
  lastActivityAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LiveChatService {
  
  // State management using Signals
  activeConversations = signal<Conversation[]>([]);
  requestingConversations = signal<Conversation[]>([]);
  intervenedConversations = signal<Conversation[]>([]);
  
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
    const apiUrl = environment.apiUrl || 'http://localhost:3000/api/v1';
    const socketUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
    this.socket = io(socketUrl);

    this.socket.on('connect', () => {
      const active = this.selectedConversation();
      if (active) {
        this.socket.emit('join_conversation', active.id);
      }
    });

    this.socket.on('new_message', (data: any) => {
      const active = this.selectedConversation();
      if (active && (data.conversationId === active.id || Number(data.conversationId) === Number(active.id))) {
        const current = this.messagesSubject.value;
        const existingIndex = current.findIndex((m: any) => m.id === data.id);
        if (existingIndex > -1) {
          const updated = [...current];
          updated[existingIndex] = { ...updated[existingIndex], ...data };
          this.messagesSubject.next(updated);
        } else {
          this.messagesSubject.next([...current, data]);
        }
      }
    });

    this.socket.on('message_status_update', (data: any) => {
      const current = this.messagesSubject.value.map((m: any) => {
        if (m.id === data.messageId || Number(m.id) === Number(data.messageId)) {
          return { ...m, status: data.status, errorMessage: data.errorMessage };
        }
        return m;
      });
      this.messagesSubject.next(current);
    });
  }

  fetchConversations() {
    this.api.get<any>('conversations/list').subscribe({
      next: (res: any) => {
        if (res && res.success && Array.isArray(res.data)) {
          const list = res.data.map((c: any) => {
            const contact = c.Contact || { name: `Contact #${c.contactId || c.id}`, phone: c.phone || '' };
            if (!contact.firstName) {
              const parts = (contact.name || '').split(' ');
              contact.firstName = parts[0] || 'Contact';
              contact.lastName = parts.slice(1).join(' ') || `#${c.contactId || c.id}`;
            }
            return {
              ...c,
              Contact: contact
            };
          });

          const active = list.filter((c: any) => !c.status || c.status === 'OPEN' || c.status === 'ACTIVE');
          const requesting = list.filter((c: any) => c.status === 'PENDING' || c.status === 'REQUESTING');
          const intervened = list.filter((c: any) => c.status === 'CLOSED' || c.assignedToType === 'HUMAN');

          this.activeConversations.set(active);
          this.requestingConversations.set(requesting);
          this.intervenedConversations.set(intervened);

          if (!this.selectedConversation() && list.length > 0) {
            this.selectConversation(list[0]);
          }
        }
      },
      error: (err) => {
        console.warn('Fetch conversations error, utilizing local active fallback', err);
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
    
    // Fetch live messages chronologically (ASC)
    this.api.get<any>(`messages/list?conversationId=${conv.id}`).subscribe({
      next: (res: any) => {
        const all = res.data || [];
        const filtered = all.filter((m: any) => m.conversationId === conv.id || Number(m.conversationId) === Number(conv.id));
        filtered.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.messagesSubject.next(filtered);
      },
      error: () => {
        const fallback = (conv.Messages || []).slice().sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.messagesSubject.next(fallback);
      }
    });
  }

  selectConversationByPhone(phone: string) {
    const clean = (phone || '').replace(/\D/g, '');
    const list = this.activeConversations();
    let match = list.find((c: any) => {
      const p = (c.Contact?.phone || '').replace(/\D/g, '');
      return p && clean && (p.includes(clean) || clean.includes(p));
    });
    if (!match && list.length > 0) {
      match = list[0];
    }
    if (match) {
      this.selectConversation(match);
    }
  }
}
