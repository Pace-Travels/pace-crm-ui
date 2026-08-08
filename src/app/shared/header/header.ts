import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Menu } from 'primeng/menu';
import { Router } from '@angular/router';
import { EnvironmentModeService, EnvironmentMode } from '../services/environment-mode.service';

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
  router = inject(Router);

  userName = 'Shadab';
  userRole = 'Administrator';
  userInitial = 'S';

  showNotifications = signal(false);
  showProfileDropdown = signal(false);

  notificationsList = signal<any[]>([
    { id: 1, title: 'Meta WABA Connected', desc: 'WhatsApp Business API in Live Production mode.', time: '2m ago', icon: 'fa-brands fa-whatsapp text-green' },
    { id: 2, title: 'AI Event Radar Active', desc: 'Scanned 12 high-surge events in Dubai & Mumbai.', time: '15m ago', icon: 'fa-solid fa-bolt text-yellow' },
    { id: 3, title: 'Templates Synced', desc: '4 pre-approved WhatsApp templates synchronized.', time: '1h ago', icon: 'fa-solid fa-circle-check text-blue' }
  ]);

  ngOnInit() {
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
    this.envModeService.fetchCurrentSettings();
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  toggleNotifications() {
    this.showNotifications.set(!this.showNotifications());
    this.showProfileDropdown.set(false);
  }

  toggleProfileDropdown() {
    this.showProfileDropdown.set(!this.showProfileDropdown());
    this.showNotifications.set(false);
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
