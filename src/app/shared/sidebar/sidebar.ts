import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {

  collapsed = signal(false);

  mobileOpen = signal(false);

  isMobile = window.innerWidth < 992;

  menu = [
    { icon: 'fa-solid fa-house', title: 'Dashboard', route: '/' },
    { icon: 'fa-solid fa-comments', title: 'Live Chat', route: '/chat' },
    { icon: 'fa-solid fa-address-book', title: 'Contacts', route: '/contacts' },
    { icon: 'fa-solid fa-bullhorn', title: 'Campaigns', route: '/campaigns' },
    { icon: 'fa-solid fa-robot', title: 'AI Manager', route: '/ai' },
    { icon: 'fa-solid fa-chart-column', title: 'Analytics', route: '/analytics' },
    { icon: 'fa-solid fa-gear', title: 'Settings', route: '/settings' }
  ];

  ngOnInit(): void {

    const state = localStorage.getItem('sidebar-collapsed');

    if (state) {
      this.collapsed.set(JSON.parse(state));
    }

    this.onResize();

  }

  @HostListener('window:resize')
  onResize() {

    this.isMobile = window.innerWidth < 992;

    if (this.isMobile) {

      this.collapsed.set(true);

    } else {

      const state = localStorage.getItem('sidebar-collapsed');

      this.collapsed.set(state ? JSON.parse(state) : false);

      this.mobileOpen.set(false);

    }

  }

  toggleSidebar() {

    if (this.isMobile) {

      this.mobileOpen.update(v => !v);

      return;

    }

    this.collapsed.update(v => {

      localStorage.setItem(
        'sidebar-collapsed',
        JSON.stringify(!v)
      );

      return !v;

    });

  }

}