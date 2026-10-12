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
  controlOwner?: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
  isArchived?: boolean;
  isMuted?: boolean;
  muteUntil?: string | null;
  isFavourite?: boolean;
  unreadCount?: number;
  Contact?: {
    id?: number;
    name?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    isBlocked?: boolean;
    profilePicUrl?: string;
    aboutStatus?: string;
    leadStage?: string;
    readinessStatus?: string;
    [key: string]: any;
  };
  Messages?: any[];
  lastActivityAt?: string;
  [key: string]: any;
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
      const isCurrentActive = active && (data.conversationId === active.id || Number(data.conversationId) === Number(active.id));

      if (isCurrentActive) {
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

      // Live update contact list & auto-resort
      this.handleIncomingMessageContactListUpdate(data, !isCurrentActive);

      if (data.direction === 'INBOUND' || data.senderType === 'CONTACT' || data.senderType === 'CUSTOMER') {
        this.triggerIncomingMessageNotification(data);
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

    this.socket.on('message_reaction_update', (data: any) => {
      const current = this.messagesSubject.value.map((m: any) => {
        if (m.id === data.messageId || Number(m.id) === Number(data.messageId)) {
          return { ...m, reactionEmoji: data.emoji, reactionSender: data.senderName };
        }
        return m;
      });
      this.messagesSubject.next(current);
    });
  }

  private handleIncomingMessageContactListUpdate(data: any, shouldIncrementUnread: boolean) {
    const updateList = (list: Conversation[]) => {
      const updated = list.map(conv => {
        if (conv.id === data.conversationId || Number(conv.id) === Number(data.conversationId)) {
          return {
            ...conv,
            lastActivityAt: data.createdAt || new Date().toISOString(),
            unreadCount: shouldIncrementUnread ? (conv.unreadCount || 0) + 1 : conv.unreadCount || 0,
            Messages: [data]
          };
        }
        return conv;
      });
      return this.sortConversations(updated);
    };

    this.activeConversations.update(list => updateList(list));
    this.requestingConversations.update(list => updateList(list));
    this.intervenedConversations.update(list => updateList(list));
  }

  public sortConversations(list: Conversation[]): Conversation[] {
    return [...list].sort((a, b) => {
      // 1. Pinned conversations anchored first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) {
        const timeA = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const timeB = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return timeB - timeA;
      }

      // 2. Unpinned conversations sorted by lastActivityAt DESC
      const dateA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const dateB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  triggerIncomingMessageNotification(data: any) {
    const senderName = data.Conversation?.Contact?.name || data.recipientName || 'Customer';
    const phone = data.Conversation?.Contact?.phone || data.recipientPhone || '';
    const textContent = data.textContent || data.content || '[Incoming Message]';

    // 1. Browser Native Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(`💬 New Message from ${senderName}`, {
          body: textContent,
          icon: '/assets/icon.png'
        });
        notification.onclick = () => {
          window.focus();
          this.selectConversationByPhone(phone);
        };
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    // 2. Interactive Toast Popup
    const SwalObj = (window as any).Swal;
    if (SwalObj && SwalObj.fire) {
      SwalObj.fire({
        title: `💬 ${senderName}`,
        text: textContent,
        icon: 'info',
        position: 'top-end',
        showConfirmButton: true,
        confirmButtonText: 'Open Live Chat',
        timer: 6000,
        toast: true
      }).then((result: any) => {
        if (result.isConfirmed) {
          this.selectConversationByPhone(phone);
        }
      });
    }
  }

  fetchConversations() {
    this.api.get<any>('conversations/list').subscribe({
      next: (res: any) => {
        if (res && res.success && Array.isArray(res.data)) {
          const list = res.data.map((c: any) => {
            const contact = c.Contact || { name: c.phone || 'Customer', phone: c.phone || '' };
            if (!contact.firstName) {
              const parts = (contact.name || 'Customer').split(' ');
              contact.firstName = parts[0] || 'Customer';
              contact.lastName = parts.slice(1).join(' ') || '';
            }
            return {
              ...c,
              Contact: contact
            };
          });

          const active = this.sortConversations(list.filter((c: any) => (!c.status || c.status === 'OPEN' || c.status === 'ACTIVE') && !c.isArchived));
          const requesting = this.sortConversations(list.filter((c: any) => (c.status === 'PENDING' || c.status === 'REQUESTING') && !c.isArchived));
          const intervened = this.sortConversations(list.filter((c: any) => (c.status === 'CLOSED' || c.assignedToType === 'HUMAN') && !c.isArchived));

          this.activeConversations.set(active);
          this.requestingConversations.set(requesting);
          this.intervenedConversations.set(intervened);

          if (!this.selectedConversation() && list.length > 0) {
            this.selectConversation(list[0]);
          }
        }
      },
      error: (err) => {
        console.warn('Fetch conversations error', err);
      }
    });
  }

  selectConversation(conv: Conversation) {
    const prev = this.selectedConversation();
    if (prev) {
      this.socket.emit('leave_conversation', prev.id);
    }

    // Automatically mark as read when selecting conversation
    if (conv.unreadCount && conv.unreadCount > 0) {
      this.toggleUnread(conv, 0);
    }

    this.selectedConversation.set(conv);
    this.socket.emit('join_conversation', conv.id);
    
    // Fetch live messages chronologically (ASC)
    this.api.get<any>(`messages/list?conversationId=${conv.id}`).subscribe({
      next: (res: any) => {
        const all = res.data || [];
        all.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.messagesSubject.next(all);
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

  // -------------------------------------------------------------
  // CONTEXTUAL MENU API METHODS
  // -------------------------------------------------------------

  togglePin(conv: Conversation, forceState?: boolean) {
    const targetState = forceState !== undefined ? forceState : !conv.isPinned;
    this.api.put<any>(`conversations/${conv.id}/pin`, { isPinned: targetState }).subscribe({
      next: () => {
        const updateItem = (list: Conversation[]) => {
          const updated = list.map(c => c.id === conv.id ? { ...c, isPinned: targetState, pinnedAt: targetState ? new Date().toISOString() : null } : c);
          return this.sortConversations(updated);
        };
        this.activeConversations.update(list => updateItem(list));
        this.requestingConversations.update(list => updateItem(list));
        this.intervenedConversations.update(list => updateItem(list));
      }
    });
  }

  toggleArchive(conv: Conversation, forceState?: boolean) {
    const targetState = forceState !== undefined ? forceState : !conv.isArchived;
    this.api.put<any>(`conversations/${conv.id}/archive`, { isArchived: targetState }).subscribe({
      next: () => {
        this.fetchConversations();
      }
    });
  }

  toggleMute(conv: Conversation, forceState?: boolean, muteUntil?: string) {
    const targetState = forceState !== undefined ? forceState : !conv.isMuted;
    this.api.put<any>(`conversations/${conv.id}/mute`, { isMuted: targetState, muteUntil }).subscribe({
      next: () => {
        const updateItem = (list: Conversation[]) => list.map(c => c.id === conv.id ? { ...c, isMuted: targetState, muteUntil } : c);
        this.activeConversations.update(list => updateItem(list));
        this.requestingConversations.update(list => updateItem(list));
        this.intervenedConversations.update(list => updateItem(list));
      }
    });
  }

  toggleUnread(conv: Conversation, forceCount?: number) {
    const targetCount = forceCount !== undefined ? forceCount : (conv.unreadCount && conv.unreadCount > 0 ? 0 : 1);
    this.api.put<any>(`conversations/${conv.id}/unread`, { unreadCount: targetCount }).subscribe({
      next: () => {
        const updateItem = (list: Conversation[]) => list.map(c => c.id === conv.id ? { ...c, unreadCount: targetCount } : c);
        this.activeConversations.update(list => updateItem(list));
        this.requestingConversations.update(list => updateItem(list));
        this.intervenedConversations.update(list => updateItem(list));
      }
    });
  }

  toggleFavourite(conv: Conversation, forceState?: boolean) {
    const targetState = forceState !== undefined ? forceState : !conv.isFavourite;
    this.api.put<any>(`conversations/${conv.id}/favourite`, { isFavourite: targetState }).subscribe({
      next: () => {
        const updateItem = (list: Conversation[]) => list.map(c => c.id === conv.id ? { ...c, isFavourite: targetState } : c);
        this.activeConversations.update(list => updateItem(list));
        this.requestingConversations.update(list => updateItem(list));
        this.intervenedConversations.update(list => updateItem(list));
      }
    });
  }

  clearChat(conv: Conversation) {
    this.api.delete<any>(`conversations/${conv.id}/clear`).subscribe({
      next: () => {
        if (this.selectedConversation()?.id === conv.id) {
          this.messagesSubject.next([]);
        }
        this.fetchConversations();
      }
    });
  }
}
