import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../features/projects/services/project.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {

  collapsed = signal(false);

  mobileOpen = signal(false);

  isMobile = window.innerWidth < 992;

  constructor(public projectService: ProjectService) {}

  onProjectSelectChange(id: any) {
    const match = this.projectService.projects().find(p => p.id === Number(id));
    if (match) {
      this.projectService.setCurrentProject(match);
    }
  }

  menu = [
    { icon: 'fa-solid fa-table-cells-large', title: 'Dashboard', route: '/' },
    { icon: 'fa-regular fa-comment-dots', title: 'Live Chat', route: '/chat' },
    { icon: 'fa-solid fa-clock-rotate-left', title: 'History', route: '/history' },
    { icon: 'fa-regular fa-address-book', title: 'Contacts', route: '/contacts' },
    { icon: 'fa-solid fa-bullhorn', title: 'Campaigns', route: '/campaigns' },
    { icon: 'fa-solid fa-rectangle-ad', title: 'Ads Manager', route: '/ads' },
    { icon: 'fa-solid fa-share-nodes', title: 'Flows', route: '/flows' },
    { icon: 'fa-solid fa-indian-rupee-sign', title: 'WA Payments', route: '/payments' },
    { icon: 'fa-solid fa-gear', title: 'Manage', route: '/manage' },
    { icon: 'fa-solid fa-plug', title: 'Integrations', route: '/integrations' },
    { icon: 'fa-solid fa-users', title: 'Agents', route: '/agents' },
    { icon: 'fa-solid fa-code', title: 'Developer', route: '/developer' },
    { icon: 'fa-solid fa-folder-open', title: 'All Projects', route: '/projects' }
  ];

  ngOnInit(): void {
    this.projectService.fetchProjects();

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