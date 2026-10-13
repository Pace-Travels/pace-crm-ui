import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
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
  
  // Total unread count computed across all conversation queues
  totalUnreadCount = computed(() => {
    const sum = (list: Conversation[]) => list.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0);
    return sum(this.activeConversations()) + sum(this.requestingConversations()) + sum(this.intervenedConversations());
  });

  // Global real-time stream of incoming messages & campaign responses
  public inboundNotification$ = new Subject<any>();

  // Currently selected conversation
  selectedConversation = signal<Conversation | null>(null);

  // Buffer input message
  chatInputMessage = signal('');

  // Real-time typing indicators state
  typingMap = signal<{ [conversationId: number]: { isTyping: boolean; authorName?: string } }>({});
  private typingTimeouts: { [conversationId: number]: any } = {};

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

      if (data && data.conversationId) {
        this.clearTyping(Number(data.conversationId));
      }

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

      // Live update contact list & auto-resort immediately
      const isContactSender = data.direction === 'INBOUND' || data.senderType === 'CONTACT' || data.senderType === 'CUSTOMER';
      const shouldIncrementUnread = !isCurrentActive && isContactSender;
      this.recordMessageActivity(data, shouldIncrementUnread);

      if (isContactSender) {
        this.triggerIncomingMessageNotification(data);
        const convId = Number(data.conversationId || data.Conversation?.id);
        const senderName = data.contactName || data.senderName || data.Conversation?.Contact?.name || this.getContactNameForConversation(convId, data.phone);
        this.inboundNotification$.next({
          type: 'INBOUND_MESSAGE',
          title: `💬 ${senderName}`,
          desc: data.textContent || data.content || '[Incoming Message]',
          conversationId: convId,
          phone: data.phone || data.recipientPhone || data.Conversation?.Contact?.phone,
          contactName: senderName,
          status: 'UNREAD',
          time: 'Just now',
          icon: 'fa-brands fa-whatsapp text-green'
        });
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

    // Real-time typing indicators from other users / AI assistant
    this.socket.on('user_typing', (data: any) => {
      this.handleTypingEvent(data);
    });

    this.socket.on('conversation_typing', (data: any) => {
      this.handleTypingEvent(data);
    });

    // Real-time Campaign Response Notification
    this.socket.on('campaign_response_received', (data: any) => {
      const contactName = (data.contactName && data.contactName !== 'Customer') 
        ? data.contactName 
        : (data.phone || 'Contact');
      const responseText = data.responseReceived || '[Campaign Response]';

      this.inboundNotification$.next({
        type: 'CAMPAIGN_REPLY',
        title: `📢 ${contactName} responded`,
        desc: responseText,
        conversationId: data.conversationId,
        phone: data.phone,
        contactName: contactName,
        status: 'UNREAD',
        time: 'Just now',
        icon: 'fa-solid fa-bullhorn text-blue'
      });

      const SwalObj = (window as any).Swal;
      if (SwalObj && SwalObj.fire) {
        SwalObj.fire({
          title: `📢 ${contactName} responded`,
          text: responseText,
          icon: 'success',
          position: 'top-end',
          toast: true,
          timer: 6000,
          showConfirmButton: false
        });
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`📢 ${contactName} responded`, {
          body: responseText,
          icon: '/assets/icon.png'
        });
      }
    });

    // Inbound notification event from server
    this.socket.on('inbound_notification', (data: any) => {
      const contactName = data.contactName || 'Customer';
      this.inboundNotification$.next({
        type: data.type || 'INBOUND_MESSAGE',
        title: data.title || (data.type === 'CAMPAIGN_REPLY' ? `📢 ${contactName} responded` : `💬 ${contactName}`),
        desc: data.message || data.content || '[Incoming Message]',
        conversationId: data.conversationId,
        phone: data.phone,
        contactName: contactName,
        status: 'UNREAD',
        time: 'Just now',
        icon: data.type === 'CAMPAIGN_REPLY' ? 'fa-solid fa-bullhorn text-blue' : 'fa-brands fa-whatsapp text-green'
      });
    });
  }

  handleTypingEvent(data: any) {
    if (!data || !data.conversationId) return;
    const convId = Number(data.conversationId);
    const isTyping = !!data.isTyping;
    const authorName = data.authorName || 'Someone';

    this.typingMap.update(map => ({
      ...map,
      [convId]: { isTyping, authorName }
    }));

    if (this.typingTimeouts[convId]) {
      clearTimeout(this.typingTimeouts[convId]);
    }

    if (isTyping) {
      // Auto-clear indicator after 5 seconds of inactivity
      this.typingTimeouts[convId] = setTimeout(() => {
        this.clearTyping(convId);
      }, 5000);
    }
  }

  clearTyping(convId: number) {
    if (this.typingTimeouts[convId]) {
      clearTimeout(this.typingTimeouts[convId]);
      delete this.typingTimeouts[convId];
    }
    this.typingMap.update(map => {
      if (!map[convId]?.isTyping) return map;
      return {
        ...map,
        [convId]: { isTyping: false, authorName: '' }
      };
    });
  }

  sendTyping(conversationId: number, isTyping: boolean) {
    if (!conversationId) return;
    if (this.socket) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
    this.api.post<any>('messages/typing', { conversationId, isTyping }).subscribe({
      error: () => {}
    });
  }

  /**
   * Immediately records new message activity on the corresponding conversation,
   * updates its lastActivityAt timestamp, and resorts the conversation list
   * ensuring pinned conversations stay firmly on top while active conversations jump to top of list.
   */
  public recordMessageActivity(data: any, shouldIncrementUnread: boolean = false) {
    if (!data || !data.conversationId) return;

    const activityTime = data.createdAt || new Date().toISOString();

    const updateList = (list: Conversation[]) => {
      let found = false;
      const updated = list.map(conv => {
        if (conv.id === data.conversationId || Number(conv.id) === Number(data.conversationId)) {
          found = true;
          return {
            ...conv,
            lastActivityAt: activityTime,
            unreadCount: shouldIncrementUnread ? (conv.unreadCount || 0) + 1 : (conv.unreadCount || 0),
            Messages: [data]
          };
        }
        return conv;
      });

      // If this conversation wasn't found in current list, but is currently selected, add it
      if (!found) {
        const active = this.selectedConversation();
        if (active && (active.id === data.conversationId || Number(active.id) === Number(data.conversationId))) {
          updated.push({
            ...active,
            lastActivityAt: activityTime,
            unreadCount: 0,
            Messages: [data]
          });
        }
      }

      return this.sortConversations(updated);
    };

    this.activeConversations.update(list => updateList(list));
    this.requestingConversations.update(list => updateList(list));
    this.intervenedConversations.update(list => updateList(list));

    const currentSelected = this.selectedConversation();
    if (currentSelected && (currentSelected.id === data.conversationId || Number(currentSelected.id) === Number(data.conversationId))) {
      this.selectedConversation.set({
        ...currentSelected,
        lastActivityAt: activityTime,
        Messages: [data]
      });
    }
  }

  public sortConversations(list: Conversation[]): Conversation[] {
    return [...list].sort((a, b) => {
      // 1. Pinned conversations anchored first (identical to WhatsApp)
      const aPinned = !!a.isPinned;
      const bPinned = !!b.isPinned;

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Both are pinned: sort by pinnedAt DESC (most recently pinned stays on top)
      if (aPinned && bPinned) {
        const timeA = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const timeB = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
      }

      // 2. Unpinned conversations (or fallback for pinned ties) sorted by latest activity DESC
      const getTimestamp = (c: Conversation) => {
        const candidate = c.lastActivityAt || c['updatedAt'] || (c.Messages && c.Messages[0]?.createdAt);
        return candidate ? new Date(candidate).getTime() : 0;
      };

      const dateA = getTimestamp(a);
      const dateB = getTimestamp(b);
      return dateB - dateA;
    });
  }

  getContactNameForConversation(conversationId?: number, fallbackPhone?: string): string {
    if (!conversationId) return fallbackPhone || 'Customer';
    const allConvs = [
      ...this.activeConversations(),
      ...this.requestingConversations(),
      ...this.intervenedConversations()
    ];
    const found = allConvs.find(c => c.id === conversationId || Number(c.id) === Number(conversationId));
    if (found?.Contact?.name && found.Contact.name !== 'Customer') {
      return found.Contact.name;
    }
    if (found?.Contact?.firstName) {
      return `${found.Contact.firstName} ${found.Contact.lastName || ''}`.trim();
    }
    if (this.selectedConversation()?.id === conversationId && this.selectedConversation()?.Contact?.name) {
      return this.selectedConversation()!.Contact!.name!;
    }
    return found?.Contact?.phone || fallbackPhone || 'Customer';
  }

  triggerIncomingMessageNotification(data: any) {
    const convId = Number(data.conversationId || data.Conversation?.id);
    let senderName = data.senderName 
      || data.contactName 
      || data.recipientName 
      || data.Conversation?.Contact?.name;

    if (!senderName || senderName === 'Customer') {
      senderName = this.getContactNameForConversation(convId, data.phone || data.recipientPhone);
    }

    const phone = data.Conversation?.Contact?.phone || data.recipientPhone || data.phone || '';
    const textContent = data.textContent || data.content || '[Incoming Message]';

    // 1. Browser Native Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(`💬 ${senderName}`, {
          body: textContent,
          icon: '/assets/icon.png'
        });
        notification.onclick = () => {
          window.focus();
          if (phone) {
            this.selectConversationByPhone(phone);
          } else if (convId) {
            const all = [...this.activeConversations(), ...this.requestingConversations(), ...this.intervenedConversations()];
            const target = all.find(c => c.id === convId);
            if (target) this.selectConversation(target);
          }
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
          if (phone) {
            this.selectConversationByPhone(phone);
          } else if (convId) {
            const all = [...this.activeConversations(), ...this.requestingConversations(), ...this.intervenedConversations()];
            const target = all.find(c => c.id === convId);
            if (target) this.selectConversation(target);
          }
        }
      });
    }
  }

  fetchConversations(autoSelectFirst: boolean = false) {
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

          if (autoSelectFirst) {
            if (!this.selectedConversation() && active.length > 0) {
              this.selectConversation(active[0]);
            } else if (!this.selectedConversation() && list.length > 0) {
              this.selectConversation(list[0]);
            }
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
    if (!clean) return;
    const all = [
      ...this.activeConversations(),
      ...this.requestingConversations(),
      ...this.intervenedConversations()
    ];
    let match = all.find((c: any) => {
      const p = (c.Contact?.phone || '').replace(/\D/g, '');
      return p && (p.includes(clean) || clean.includes(p));
    });
    if (match) {
      this.selectConversation(match);
    }
  }

  selectConversationById(conversationId: number | string) {
    const targetId = Number(conversationId);
    if (!targetId) return;

    const all = [
      ...this.activeConversations(),
      ...this.requestingConversations(),
      ...this.intervenedConversations()
    ];
    const match = all.find(c => Number(c.id) === targetId);
    if (match) {
      this.selectConversation(match);
    } else {
      this.api.get<any>(`conversations/list/${targetId}`).subscribe({
        next: (res: any) => {
          const conv = res?.data || res;
          if (conv && conv.id) {
            const contact = conv.Contact || { name: conv.phone || 'Customer', phone: conv.phone || '' };
            this.selectConversation({ ...conv, Contact: contact });
          }
        },
        error: () => {}
      });
    }
  }

  // -------------------------------------------------------------
  // CONTEXTUAL MENU API METHODS
  // -------------------------------------------------------------

  togglePin(conv: Conversation, forceState?: boolean) {
    const targetState = forceState !== undefined ? forceState : !conv.isPinned;
    const nowIso = new Date().toISOString();
    this.api.put<any>(`conversations/${conv.id}/pin`, { isPinned: targetState }).subscribe({
      next: (res: any) => {
        const pinnedAt = targetState ? (res?.pinnedAt || nowIso) : null;
        const updateItem = (list: Conversation[]) => {
          const updated = list.map(c => c.id === conv.id ? { ...c, isPinned: targetState, pinnedAt } : c);
          return this.sortConversations(updated);
        };
        this.activeConversations.update(list => updateItem(list));
        this.requestingConversations.update(list => updateItem(list));
        this.intervenedConversations.update(list => updateItem(list));
        if (this.selectedConversation()?.id === conv.id) {
          this.selectedConversation.update(c => c ? { ...c, isPinned: targetState, pinnedAt } : null);
        }
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
