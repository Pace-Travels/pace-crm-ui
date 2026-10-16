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
  public conversationRead$ = new Subject<{ conversationId: number | string; phone?: string; unreadCount?: number; all?: boolean }>();

  private recentBrowserNotifications = new Set<string>();
  private recentInboundNotificationKeys = new Set<string>();

  public showBrowserNotification(key: string, title: string, body: string, onClick?: () => void) {
    if (this.recentBrowserNotifications.has(key)) {
      return;
    }
    this.recentBrowserNotifications.add(key);
    setTimeout(() => this.recentBrowserNotifications.delete(key), 8000);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body,
            icon: '/assets/icon.png'
          });
          if (onClick) {
            notification.onclick = () => {
              window.focus();
              onClick();
            };
          }
        } catch (e) {
          console.warn('Native notification error', e);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }

  public pushInboundNotification(notif: any, customKey?: string) {
    const cleanPhone = String(notif.phone || notif.recipient || '').replace(/\D/g, '');
    const cleanSnippet = String(notif.desc || notif.message || notif.content || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    const key = customKey || `${cleanPhone}_${cleanSnippet}`;

    if (this.recentInboundNotificationKeys.has(key)) {
      return;
    }
    this.recentInboundNotificationKeys.add(key);
    setTimeout(() => this.recentInboundNotificationKeys.delete(key), 8000);

    this.inboundNotification$.next(notif);
  }

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
  private syncChannel: BroadcastChannel | null = null;
  private lastAutoSyncTime = 0;

  constructor(private api: ApiService) {
    this.initSyncChannel();
    this.initSocket();
    this.initWindowWatchers();
  }

  private initSyncChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.syncChannel = new BroadcastChannel('quotedesks_live_sync');
        this.syncChannel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (!type) return;
          this.handleMultiWindowSyncEvent(type, payload);
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization error', e);
      }
    }
  }

  private postSyncEvent(type: string, payload: any) {
    if (this.syncChannel) {
      try {
        this.syncChannel.postMessage({ type, payload });
      } catch (e) {}
    }
  }

  private handleMultiWindowSyncEvent(type: string, payload: any) {
    switch (type) {
      case 'CONVERSATION_UPDATED':
        if (payload?.conversationId) this.applyConversationUpdate(payload.conversationId, payload);
        break;
      case 'CONVERSATION_DELETED':
        if (payload?.conversationId) this.applyConversationDeleted(payload.conversationId);
        break;
      case 'CONVERSATION_READ':
        this.applyConversationRead(payload);
        break;
      case 'CHAT_CLEARED':
        if (payload?.conversationId) this.applyChatCleared(payload.conversationId);
        break;
      case 'CONTROL_OWNER_CHANGED':
        if (payload?.conversationId) this.applyControlOwnerChange(payload.conversationId, payload.controlOwner);
        break;
      case 'REFRESH_REQUIRED':
        this.fetchConversations(false);
        break;
    }
  }

  private initWindowWatchers() {
    if (typeof window === 'undefined') return;

    const autoSync = () => {
      const now = Date.now();
      // Throttle window focus sync to at most once every 2 seconds
      if (now - this.lastAutoSyncTime < 2000) return;
      this.lastAutoSyncTime = now;

      // Silently sync conversation list without disturbing user selection
      this.fetchConversations(false);

      // Re-fetch latest messages for active conversation if open
      const active = this.selectedConversation();
      if (active && active.id) {
        this.api.get<any>(`messages/list?conversationId=${active.id}`).subscribe({
          next: (res: any) => {
            const all = res.data || [];
            all.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            this.messagesSubject.next(all);
          },
          error: () => {}
        });
      }
    };

    window.addEventListener('focus', autoSync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        autoSync();
      }
    });
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

      if (isContactSender && !isCurrentActive) {
        this.triggerIncomingMessageNotification(data);
        const convId = Number(data.conversationId || data.Conversation?.id);
        const senderName = data.contactName || data.senderName || data.Conversation?.Contact?.name || this.getContactNameForConversation(convId, data.phone);
        const phone = data.phone || data.recipientPhone || data.Conversation?.Contact?.phone;
        const textContent = data.textContent || data.content || '[Incoming Message]';
        const cleanPhone = String(phone || '').replace(/\D/g, '');
        const cleanSnippet = String(textContent).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        const dedupeKey = `${cleanPhone}_${cleanSnippet}`;

        this.pushInboundNotification({
          type: 'INBOUND_MESSAGE',
          title: `💬 ${senderName}`,
          desc: textContent,
          conversationId: convId,
          phone: phone,
          contactName: senderName,
          status: 'UNREAD',
          time: 'Just now',
          icon: 'fa-brands fa-whatsapp text-green'
        }, dedupeKey);
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
      const active = this.selectedConversation();
      const isCurrentActive = active && (data.conversationId === active.id || Number(data.conversationId) === Number(active.id));
      if (isCurrentActive) return;

      const contactName = (data.contactName && data.contactName !== 'Customer') 
        ? data.contactName 
        : (data.phone || 'Contact');
      const responseText = data.responseReceived || '[Campaign Response]';
      const cleanPhone = String(data.phone || '').replace(/\D/g, '');
      const cleanSnippet = String(responseText).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      const dedupeKey = `${cleanPhone}_${cleanSnippet}`;

      this.pushInboundNotification({
        type: 'CAMPAIGN_REPLY',
        title: `📢 ${contactName} responded`,
        desc: responseText,
        conversationId: data.conversationId,
        phone: data.phone,
        contactName: contactName,
        status: 'UNREAD',
        time: 'Just now',
        icon: 'fa-solid fa-bullhorn text-blue'
      }, dedupeKey);

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

      this.showBrowserNotification(dedupeKey, `📢 ${contactName} responded`, responseText, () => {
        if (data.phone) {
          this.selectConversationByPhone(data.phone);
        } else if (data.conversationId) {
          this.selectConversationById(data.conversationId);
        }
      });
    });

    // Inbound notification event from server
    this.socket.on('inbound_notification', (data: any) => {
      const active = this.selectedConversation();
      const isCurrentActive = active && (data.conversationId === active.id || Number(data.conversationId) === Number(active.id));
      if (isCurrentActive) return;

      const contactName = data.contactName || 'Customer';
      const text = data.message || data.content || '[Incoming Message]';
      const cleanPhone = String(data.phone || '').replace(/\D/g, '');
      const cleanSnippet = String(text).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      const dedupeKey = `${cleanPhone}_${cleanSnippet}`;

      this.pushInboundNotification({
        type: data.type || 'INBOUND_MESSAGE',
        title: data.title || (data.type === 'CAMPAIGN_REPLY' ? `📢 ${contactName} responded` : `💬 ${contactName}`),
        desc: text,
        conversationId: data.conversationId,
        phone: data.phone,
        contactName: contactName,
        status: 'UNREAD',
        time: 'Just now',
        icon: data.type === 'CAMPAIGN_REPLY' ? 'fa-solid fa-bullhorn text-blue' : 'fa-brands fa-whatsapp text-green'
      }, dedupeKey);
    });

    // Conversation read broadcast event from server / other clients
    // Conversation read broadcast event from server / other clients
    this.socket.on('conversation_read', (data: any) => {
      if (!data) return;
      this.applyConversationRead(data);
    });

    // Real-time conversation updates across multiple open windows / tabs
    this.socket.on('conversation_updated', (data: any) => {
      if (!data || !data.conversationId) return;
      this.applyConversationUpdate(data.conversationId, data);
    });

    this.socket.on('conversation_deleted', (data: any) => {
      if (!data || !data.conversationId) return;
      this.applyConversationDeleted(data.conversationId);
    });

    this.socket.on('control_owner_changed', (data: any) => {
      if (!data || !data.conversationId) return;
      this.applyControlOwnerChange(data.conversationId, data.controlOwner);
    });

    this.socket.on('chat_cleared', (data: any) => {
      if (!data || !data.conversationId) return;
      this.applyChatCleared(data.conversationId);
    });

    this.socket.on('message_deleted', (data: any) => {
      if (!data) return;
      const targetMsgId = Number(data.messageId);
      const current = this.messagesSubject.value.filter((m: any) => Number(m.id) !== targetMsgId);
      this.messagesSubject.next(current);
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
    if (!data) return;

    const activityTime = data.createdAt || new Date().toISOString();
    const dataConvId = Number(data.conversationId || data.Conversation?.id);
    const dataContactId = Number(data.contactId || data.Conversation?.contactId || 0);
    const cleanDataPhone = String(data.phone || data.recipientPhone || data.Conversation?.Contact?.phone || '').replace(/\D/g, '').slice(-10);

    const isMatch = (conv: Conversation) => {
      const convId = Number(conv.id);
      const convContactId = Number(conv.contactId);
      const cleanConvPhone = String(conv.Contact?.phone || '').replace(/\D/g, '').slice(-10);
      return (dataConvId && convId === dataConvId) ||
             (dataContactId && convContactId && convContactId === dataContactId) ||
             (cleanDataPhone && cleanConvPhone && cleanConvPhone === cleanDataPhone);
    };

    let targetQueue: 'active' | 'requesting' | 'intervened' | null = null;
    if (this.activeConversations().some(isMatch)) targetQueue = 'active';
    else if (this.requestingConversations().some(isMatch)) targetQueue = 'requesting';
    else if (this.intervenedConversations().some(isMatch)) targetQueue = 'intervened';

    const updateItem = (conv: Conversation): Conversation => ({
      ...conv,
      lastActivityAt: activityTime,
      unreadCount: shouldIncrementUnread ? (conv.unreadCount || 0) + 1 : (conv.unreadCount || 0),
      Messages: [data]
    });

    if (targetQueue === 'active') {
      this.activeConversations.update(list => this.sortConversations(list.map(c => isMatch(c) ? updateItem(c) : c)));
    } else if (targetQueue === 'requesting') {
      this.requestingConversations.update(list => this.sortConversations(list.map(c => isMatch(c) ? updateItem(c) : c)));
    } else if (targetQueue === 'intervened') {
      this.intervenedConversations.update(list => this.sortConversations(list.map(c => isMatch(c) ? updateItem(c) : c)));
    } else if (dataConvId || dataContactId || cleanDataPhone) {
      // New conversation not yet in any queue: determine appropriate queue based on data
      const status = data.Conversation?.status || data.status;
      const assignedToType = data.Conversation?.assignedToType || data.assignedToType;

      const active = this.selectedConversation();
      let newConv: Conversation;
      if (active && (Number(active.id) === dataConvId || (cleanDataPhone && String(active.Contact?.phone || '').includes(cleanDataPhone)))) {
        newConv = {
          ...active,
          lastActivityAt: activityTime,
          unreadCount: 0,
          Messages: [data]
        };
      } else {
        newConv = {
          id: dataConvId || Date.now(),
          contactId: dataContactId || 0,
          status: status || 'OPEN',
          lastActivityAt: activityTime,
          unreadCount: shouldIncrementUnread ? 1 : 0,
          Contact: data.Conversation?.Contact || {
            id: dataContactId || 0,
            name: data.contactName || data.senderName || 'Customer',
            phone: data.phone || data.recipientPhone || ''
          },
          Messages: [data]
        };
      }

      if (status === 'PENDING' || status === 'REQUESTING') {
        this.requestingConversations.update(list => this.sortConversations([newConv, ...list]));
      } else if (status === 'CLOSED' || assignedToType === 'HUMAN') {
        this.intervenedConversations.update(list => this.sortConversations([newConv, ...list]));
      } else {
        this.activeConversations.update(list => this.sortConversations([newConv, ...list]));
      }
    }

    const currentSelected = this.selectedConversation();
    if (currentSelected && isMatch(currentSelected)) {
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

      // 2. WhatsApp ordering: newest message/activity strictly at top
      const getTimestamp = (c: Conversation): number => {
        // Priority 1: Newest message in Messages array
        const msgTime = (c.Messages && c.Messages[0]?.createdAt) ? new Date(c.Messages[0].createdAt).getTime() : 0;
        // Priority 2: Conversation lastActivityAt
        const actTime = c.lastActivityAt ? new Date(c.lastActivityAt).getTime() : 0;
        return Math.max(msgTime, actTime);
      };

      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);

      // Active chats with messages or unread count come above idle contacts without messages
      const hasChatA = timeA > 0 || (a.unreadCount && a.unreadCount > 0);
      const hasChatB = timeB > 0 || (b.unreadCount && b.unreadCount > 0);

      if (hasChatA && !hasChatB) return -1;
      if (!hasChatA && hasChatB) return 1;

      // If both have messages: strictly order by latest message timestamp DESC
      if (timeB !== timeA) {
        return timeB - timeA;
      }

      // 3. Fallback for contacts with no messages: alphabetical by name
      const nameA = (a.Contact?.name || `${a.Contact?.firstName || ''} ${a.Contact?.lastName || ''}` || a.Contact?.phone || '').toLowerCase();
      const nameB = (b.Contact?.name || `${b.Contact?.firstName || ''} ${b.Contact?.lastName || ''}` || b.Contact?.phone || '').toLowerCase();
      return nameA.localeCompare(nameB);
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

    // 1. Browser Native Notification (deduplicated within 8 seconds)
    const cleanPhone = String(phone).replace(/\D/g, '');
    const cleanSnippet = String(textContent).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    const dedupeKey = `${cleanPhone}_${cleanSnippet}`;

    this.showBrowserNotification(dedupeKey, `💬 ${senderName}`, textContent, () => {
      if (phone) {
        this.selectConversationByPhone(phone);
      } else if (convId) {
        const all = [...this.activeConversations(), ...this.requestingConversations(), ...this.intervenedConversations()];
        const target = all.find(c => c.id === convId);
        if (target) this.selectConversation(target);
      }
    });

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
  // MULTI-WINDOW AUTO-SYNC & CONTEXTUAL MENU API METHODS
  // -------------------------------------------------------------

  public applyConversationUpdate(conversationId: number, data: any) {
    const convId = Number(conversationId);
    const updateItem = (list: Conversation[]) => {
      let matched = false;
      const updated = list.map(c => {
        if (Number(c.id) === convId) {
          matched = true;
          return {
            ...c,
            ...(data.isPinned !== undefined ? { isPinned: data.isPinned, pinnedAt: data.pinnedAt || (data.isPinned ? new Date().toISOString() : null) } : {}),
            ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
            ...(data.isMuted !== undefined ? { isMuted: data.isMuted, muteUntil: data.muteUntil } : {}),
            ...(data.isFavourite !== undefined ? { isFavourite: data.isFavourite } : {}),
            ...(data.unreadCount !== undefined ? { unreadCount: data.unreadCount } : {}),
            ...(data.controlOwner !== undefined ? { controlOwner: data.controlOwner } : {}),
            ...(data.assignedToType !== undefined ? { assignedToType: data.assignedToType } : {})
          };
        }
        return c;
      });
      return matched ? this.sortConversations(updated.filter(c => !c.isArchived)) : list;
    };

    this.activeConversations.update(list => updateItem(list));
    this.requestingConversations.update(list => updateItem(list));
    this.intervenedConversations.update(list => updateItem(list));

    const selected = this.selectedConversation();
    if (selected && Number(selected.id) === convId) {
      this.selectedConversation.update(c => c ? {
        ...c,
        ...(data.isPinned !== undefined ? { isPinned: data.isPinned, pinnedAt: data.pinnedAt } : {}),
        ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
        ...(data.isMuted !== undefined ? { isMuted: data.isMuted, muteUntil: data.muteUntil } : {}),
        ...(data.isFavourite !== undefined ? { isFavourite: data.isFavourite } : {}),
        ...(data.controlOwner !== undefined ? { controlOwner: data.controlOwner } : {})
      } : null);
    }
  }

  public applyConversationDeleted(conversationId: number) {
    const convId = Number(conversationId);
    const filterOut = (list: Conversation[]) => list.filter(c => Number(c.id) !== convId);
    this.activeConversations.update(list => filterOut(list));
    this.requestingConversations.update(list => filterOut(list));
    this.intervenedConversations.update(list => filterOut(list));

    if (this.selectedConversation()?.id === convId) {
      this.selectedConversation.set(null);
      this.messagesSubject.next([]);
    }
  }

  public applyChatCleared(conversationId: number) {
    const convId = Number(conversationId);
    if (this.selectedConversation()?.id === convId) {
      this.messagesSubject.next([]);
    }
    const updateItem = (list: Conversation[]) => list.map(c => Number(c.id) === convId ? { ...c, Messages: [], unreadCount: 0 } : c);
    this.activeConversations.update(list => updateItem(list));
    this.requestingConversations.update(list => updateItem(list));
    this.intervenedConversations.update(list => updateItem(list));
  }

  public applyControlOwnerChange(conversationId: number, controlOwner: string) {
    const convId = Number(conversationId);
    this.applyConversationUpdate(convId, { controlOwner });
    this.fetchConversations(false);
  }

  public applyConversationRead(data: any) {
    if (data.all) {
      const clearUnread = (list: Conversation[]) => list.map(c => ({ ...c, unreadCount: 0 }));
      this.activeConversations.update(list => clearUnread(list));
      this.requestingConversations.update(list => clearUnread(list));
      this.intervenedConversations.update(list => clearUnread(list));
      this.conversationRead$.next(data);
    } else if (data.conversationId) {
      const convId = Number(data.conversationId);
      const newCount = Number(data.unreadCount || 0);
      const updateItem = (list: Conversation[]) => list.map(c => 
        (c.id === convId || Number(c.id) === convId) ? { ...c, unreadCount: newCount } : c
      );
      this.activeConversations.update(list => updateItem(list));
      this.requestingConversations.update(list => updateItem(list));
      this.intervenedConversations.update(list => updateItem(list));
      this.conversationRead$.next(data);
    }
  }

  togglePin(conv: Conversation, forceState?: boolean) {
    const targetState = forceState !== undefined ? forceState : !conv.isPinned;
    const nowIso = new Date().toISOString();
    this.api.put<any>(`conversations/${conv.id}/pin`, { isPinned: targetState }).subscribe({
      next: (res: any) => {
        const pinnedAt = targetState ? (res?.pinnedAt || nowIso) : null;
        this.applyConversationUpdate(conv.id, { isPinned: targetState, pinnedAt });
        this.postSyncEvent('CONVERSATION_UPDATED', { conversationId: conv.id, isPinned: targetState, pinnedAt });
      }
    });
  }

  toggleArchive(conv: Conversation, forceState?: boolean) {
    const targetState = forceState !== undefined ? forceState : !conv.isArchived;
    this.api.put<any>(`conversations/${conv.id}/archive`, { isArchived: targetState }).subscribe({
      next: () => {
        this.applyConversationUpdate(conv.id, { isArchived: targetState });
        this.postSyncEvent('CONVERSATION_UPDATED', { conversationId: conv.id, isArchived: targetState });
        this.fetchConversations();
      }
    });
  }

  toggleMute(conv: Conversation, forceState?: boolean, muteUntil?: string) {
    const targetState = forceState !== undefined ? forceState : !conv.isMuted;
    this.api.put<any>(`conversations/${conv.id}/mute`, { isMuted: targetState, muteUntil }).subscribe({
      next: () => {
        this.applyConversationUpdate(conv.id, { isMuted: targetState, muteUntil });
        this.postSyncEvent('CONVERSATION_UPDATED', { conversationId: conv.id, isMuted: targetState, muteUntil });
      }
    });
  }

  toggleUnread(conv: Conversation, forceCount?: number) {
    const targetCount = forceCount !== undefined ? forceCount : (conv.unreadCount && conv.unreadCount > 0 ? 0 : 1);
    
    // Immediate local update for zero-latency UI response
    this.applyConversationRead({ conversationId: conv.id, phone: conv.Contact?.phone, unreadCount: targetCount });
    this.postSyncEvent('CONVERSATION_READ', { conversationId: conv.id, phone: conv.Contact?.phone, unreadCount: targetCount });

    this.api.put<any>(`conversations/${conv.id}/unread`, { unreadCount: targetCount }).subscribe({
      next: () => {},
      error: (err) => console.warn('Toggle unread error', err)
    });
  }

  toggleFavourite(conv: Conversation, forceState?: boolean) {
    const targetState = forceState !== undefined ? forceState : !conv.isFavourite;
    this.api.put<any>(`conversations/${conv.id}/favourite`, { isFavourite: targetState }).subscribe({
      next: () => {
        this.applyConversationUpdate(conv.id, { isFavourite: targetState });
        this.postSyncEvent('CONVERSATION_UPDATED', { conversationId: conv.id, isFavourite: targetState });
      }
    });
  }

  clearChat(conv: Conversation) {
    this.api.delete<any>(`conversations/${conv.id}/clear`).subscribe({
      next: () => {
        this.applyChatCleared(conv.id);
        this.postSyncEvent('CHAT_CLEARED', { conversationId: conv.id });
        this.fetchConversations();
      }
    });
  }
}
