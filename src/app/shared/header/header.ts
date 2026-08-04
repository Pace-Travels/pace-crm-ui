import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { Menu } from 'primeng/menu';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, Menu],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

  @Output() toggleSidebar = new EventEmitter<void>();

  onToggleSidebar() {
    this.toggleSidebar.emit();
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
