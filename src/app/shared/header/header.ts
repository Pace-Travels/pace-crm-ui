import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, signal, computed, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Menu } from 'primeng/menu';
import { Router } from '@angular/router';
import { EnvironmentModeService, EnvironmentMode } from '../services/environment-mode.service';
import { OnboardingService } from '../services/onboarding.service';
import { ProjectService } from '../../features/projects/services/project.service';
import { ApiService } from '../services/api.service';
import { SearchService } from '../services/search.service';
import { ThemeService } from '../services/theme.service';
import { LiveChatService } from '../../features/live-chat/services/live-chat.service';

import { AuthService } from '../services/auth.service';

declare var Swal: any;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, Menu],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {

  @Output() toggleSidebar = new EventEmitter<void>();

  authService = inject(AuthService);
  envModeService = inject(EnvironmentModeService);
  onboardingService = inject(OnboardingService);
  projectService = inject(ProjectService);
  api = inject(ApiService);
  router = inject(Router);
  searchService = inject(SearchService);
  themeService = inject(ThemeService);
  chatService = inject(LiveChatService);
  private titleService = inject(Title);

  private readonly baseTitle = 'Quote Desks Messenger | Omnichannel WhatsApp Automation';

  userName = '';
  userEmail = '';
  userRole = 'Administrator';
  userInitial = 'U';

  showNotifications = signal(false);
  showProfileDropdown = signal(false);
  showMetaStatusModal = signal(false);

  notificationsList = signal<any[]>([]);

  constructor() {
    // Dynamically update document title in real time like WhatsApp Web: (2) Quote Desks Messenger...
    effect(() => {
      const count = this.unreadCount();
      if (count > 0) {
        this.titleService.setTitle(`(${count}) ${this.baseTitle}`);
      } else {
        this.titleService.setTitle(this.baseTitle);
      }
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.envModeService.fetchCurrentSettings();
    this.fetchNotifications();
    this.chatService.fetchConversations(false);

    // Real-time live incoming messages & campaign response streaming
    this.chatService.inboundNotification$.subscribe((notif: any) => {
      if (!notif) return;
      const current = this.notificationsList();
      const notifPhone = String(notif.phone || notif.recipient || '').replace(/\D/g, '');
      const notifSnippet = String(notif.desc || notif.message || notif.content || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);

      const exists = current.some(n => {
        if (n.id && notif.id && n.id === notif.id) return true;
        const nPhone = String(n.phone || n.recipient || '').replace(/\D/g, '');
        const nSnippet = String(n.desc || n.message || n.content || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        const samePhone = notifPhone && nPhone && (notifPhone === nPhone || notifPhone.endsWith(nPhone) || nPhone.endsWith(notifPhone));
        return samePhone && (notifSnippet === nSnippet || notifSnippet.includes(nSnippet) || nSnippet.includes(notifSnippet));
      });

      if (!exists) {
        this.notificationsList.set([notif, ...current]);
      }
    });

    // Real-time read status synchronization: update notifications when chats are read in Live Chat
    this.chatService.conversationRead$.subscribe((data: any) => {
      if (!data) return;

      if (data.all) {
        this.notificationsList.update(list => list.map(n => ({ ...n, status: 'READ' })));
        return;
      }

      const convId = data.conversationId ? Number(data.conversationId) : null;
      const cleanPhone = String(data.phone || '').replace(/\D/g, '');

      this.notificationsList.update(list => list.map(n => {
        const nConvId = n.conversationId ? Number(n.conversationId) : null;
        const nPhone = String(n.phone || n.recipient || '').replace(/\D/g, '');
        const isMatch = (convId && nConvId && convId === nConvId) ||
                        (cleanPhone && nPhone && (cleanPhone === nPhone || cleanPhone.endsWith(nPhone) || nPhone.endsWith(cleanPhone)));
        if (isMatch) {
          return { ...n, status: data.isUnread ? 'UNREAD' : 'READ' };
        }
        return n;
      }));
    });
  }

  loadUserData() {
    if (!this.authService.checkSessionOrRedirect()) {
      return;
    }
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user) {
          this.userName = user.name || user.displayName || user.username || user.email || 'User';
          this.userEmail = user.email || '';
          this.userRole = user.role || user.roleName || 'Administrator';
          this.userInitial = (this.userName.charAt(0) || 'U').toUpperCase();
        }
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }

  unreadCount = computed(() => {
    return this.notificationsList().filter(n => n.status === 'UNREAD').length;
  });

  displayActivePhoneNumber = computed(() => {
    const raw = this.envModeService.activePhoneNumber() || 
                this.projectService.currentProject()?.phoneNumber || 
                this.projectService.currentProject()?.testPhoneNumber;
    if (!raw) return 'No Phone Connected';
    let digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return `+${digits}`;
  });

  fetchNotifications() {
    this.api.get<any>('notifications/list').subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((item: any) => {
            let iconClass = 'fa-solid fa-bell text-blue';
            let title = 'System Alert';

            if (item.type === 'INBOUND_MESSAGE' || item.type === 'CHAT') {
              iconClass = 'fa-brands fa-whatsapp text-green';
              const name = item.contactName || (item.recipient && item.recipient !== 'Customer' ? item.recipient : 'Customer');
              title = `💬 ${name}`;
            } else if (item.type === 'CAMPAIGN_REPLY') {
              iconClass = 'fa-solid fa-bullhorn text-blue';
              const name = item.contactName || item.recipient || 'Customer';
              title = `📢 ${name} responded`;
            } else if (item.type === 'WABA') {
              iconClass = 'fa-brands fa-whatsapp text-green';
              title = 'WhatsApp Line Alert';
            } else if (item.type === 'RADAR') {
              iconClass = 'fa-solid fa-satellite-dish text-yellow';
              title = 'Radar Alert';
            } else if (item.type === 'TEMPLATES') {
              iconClass = 'fa-solid fa-circle-check text-blue';
              title = 'Templates Alert';
            } else if (item.type === 'INTEGRATIONS') {
              iconClass = 'fa-solid fa-plug text-purple';
              title = 'Integrations Alert';
            } else if (item.type) {
              title = `${item.type} Alert`;
            }

            const formattedTime = item.createdAt 
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently';

            // Clean message desc display: strip duplicate "Name responded: " or "Name: " prefix
            let displayDesc = item.content || item.desc || '';
            const replyMatch = displayDesc.match(/^.+? responded:\s*"?([^"]+)"?$/i);
            if (replyMatch && replyMatch[1]) {
              displayDesc = replyMatch[1];
            } else {
              const prefixMatch = displayDesc.match(/^[^:]+:\s*(.+)$/);
              if (prefixMatch && prefixMatch[1] && prefixMatch[1].length > 3) {
                displayDesc = prefixMatch[1];
              }
            }

            return {
              id: item.id,
              type: item.type,
              status: item.status || 'UNREAD',
              title: title,
              desc: displayDesc,
              time: formattedTime,
              icon: iconClass,
              conversationId: item.conversationId,
              phone: item.phone || item.recipient,
              contactName: item.contactName
            };
          });
          this.notificationsList.set(mapped);
        }
      },
      error: () => {}
    });
  }

  onNotificationClick(n: any) {
    n.status = 'READ';
    if (n.id && typeof n.id === 'number') {
      this.api.put<any>(`notifications/update/${n.id}`, { status: 'READ' }).subscribe({ error: () => {} });
    }

    // Immediately trigger reactive update so unreadCount decrements without delay
    this.notificationsList.update(list => list.map(item => item === n || item.id === n.id ? { ...item, status: 'READ' } : item));

    if (n.conversationId || n.phone || n.type === 'INBOUND_MESSAGE' || n.type === 'CHAT' || n.type === 'CAMPAIGN_REPLY') {
      this.showNotifications.set(false);
      const convId = n.conversationId;
      const phone = n.phone || n.recipient;

      if (convId) {
        this.chatService.selectConversationById(convId);
      } else if (phone) {
        this.chatService.selectConversationByPhone(phone);
      }

      this.router.navigate(['/chat'], {
        queryParams: {
          ...(convId ? { conversationId: convId } : {}),
          ...(phone ? { phone } : {})
        }
      });
    }
  }

  markAllAsRead() {
    this.api.put<any>('notifications/read-all', {}).subscribe({
      next: () => {
        const updated = this.notificationsList().map(n => ({ ...n, status: 'READ' }));
        this.notificationsList.set(updated);
        this.chatService.fetchConversations(false);
      }
    });
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  toggleNotifications() {
    this.showNotifications.set(!this.showNotifications());
    this.showProfileDropdown.set(false);
    if (this.showNotifications()) {
      this.fetchNotifications();
    }
  }

  toggleProfileDropdown() {
    this.showProfileDropdown.set(!this.showProfileDropdown());
    this.showNotifications.set(false);
  }

  toggleMetaStatusModal() {
    this.showMetaStatusModal.set(!this.showMetaStatusModal());
  }

  openTour() {
    this.showMetaStatusModal.set(false);
    this.onboardingService.openTour();
  }

  navigateTo(path: string) {
    this.showProfileDropdown.set(false);
    this.showNotifications.set(false);
    this.router.navigate([path]);
  }

  logout() {
    this.showProfileDropdown.set(false);
    this.authService.logout();
  }

  onModeSwitch(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedMode = target.value as EnvironmentMode;
    this.envModeService.setMode(selectedMode, true);
    
    const modeLabel = selectedMode === 'DEVELOPMENT' ? '🧪 Development Mode (Test Number)' : '🚀 Production Mode (Live Number)';
    if (typeof Swal !== 'undefined' && Swal && Swal.fire) {
      Swal.fire({
        title: 'Meta WhatsApp Mode Switched',
        text: `Active mode is now ${modeLabel}`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  }

  moreItems = [
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: () => this.navigateTo('/manage')
    },
    {
      label: 'Language',
      icon: 'pi pi-language'
    },
    {
      label: 'Help',
      icon: 'pi pi-question-circle',
      command: () => this.navigateTo('/docs')
    },
    {
      label: 'About',
      icon: 'pi pi-info-circle'
    }
  ];

  mobileItems = [
    {
      label: 'Notifications',
      icon: 'pi pi-bell',
      command: () => this.toggleNotifications()
    },
    {
      label: 'Language',
      icon: 'pi pi-language'
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: () => this.navigateTo('/manage')
    }
  ];

  profileItems = [
    {
      label: 'My Profile',
      icon: 'pi pi-user',
      command: () => this.navigateTo('/account')
    },
    {
      label: 'Account Settings',
      icon: 'pi pi-cog',
      command: () => this.navigateTo('/manage')
    },
    {
      separator: true
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];

}
