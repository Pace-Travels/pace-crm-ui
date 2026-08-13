import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Menu } from 'primeng/menu';
import { Router } from '@angular/router';
import { EnvironmentModeService, EnvironmentMode } from '../services/environment-mode.service';
import { OnboardingService } from '../services/onboarding.service';
import { ProjectService } from '../../features/projects/services/project.service';
import { ApiService } from '../services/api.service';

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

  envModeService = inject(EnvironmentModeService);
  onboardingService = inject(OnboardingService);
  projectService = inject(ProjectService);
  api = inject(ApiService);
  router = inject(Router);

  userName = 'Shadab';
  userRole = 'Administrator';
  userInitial = 'S';

  showNotifications = signal(false);
  showProfileDropdown = signal(false);
  showMetaStatusModal = signal(false);

  notificationsList = signal<any[]>([]);

  ngOnInit() {
    this.loadUserData();
    this.envModeService.fetchCurrentSettings();
    this.fetchNotifications();
  }

  loadUserData() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.name) {
          this.userName = user.name;
          this.userInitial = user.name.charAt(0).toUpperCase();
        }
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }

  fetchNotifications() {
    this.api.get<any>('notifications/list').subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((item: any) => {
            let iconClass = 'fa-solid fa-bell text-blue';
            if (item.type === 'WABA') iconClass = 'fa-brands fa-whatsapp text-green';
            else if (item.type === 'RADAR') iconClass = 'fa-solid fa-bolt text-yellow';
            else if (item.type === 'TEMPLATES') iconClass = 'fa-solid fa-circle-check text-blue';
            else if (item.type === 'INTEGRATIONS') iconClass = 'fa-solid fa-plug text-purple';

            const formattedTime = item.createdAt 
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently';

            return {
              id: item.id,
              title: item.type ? `${item.type} Notification` : 'System Alert',
              desc: item.content,
              time: formattedTime,
              icon: iconClass
            };
          });
          this.notificationsList.set(mapped);
        }
      },
      error: () => {}
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
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
      icon: 'pi pi-cog'
    },
    {
      label: 'Language',
      icon: 'pi pi-language'
    },
    {
      label: 'Help',
      icon: 'pi pi-question-circle'
    },
    {
      label: 'About',
      icon: 'pi pi-info-circle'
    }
  ];

  mobileItems = [
    {
      label: 'Notifications',
      icon: 'pi pi-bell'
    },
    {
      label: 'Language',
      icon: 'pi pi-language'
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog'
    }
  ];

  profileItems = [
    {
      label: 'My Profile',
      icon: 'pi pi-user'
    },
    {
      label: 'Account Settings',
      icon: 'pi pi-cog'
    },
    {
      separator: true
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out'
    }
  ];

}
