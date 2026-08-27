import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal, Output, EventEmitter } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../features/projects/services/project.service';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {

  @Output() collapsedChange = new EventEmitter<boolean>();

  collapsed = signal(false);

  mobileOpen = signal(false);

  isMobile = window.innerWidth < 992;

  constructor(
    public projectService: ProjectService,
    private authService: AuthService,
    private router: Router
  ) {}

  onProjectSelectChange(id: any) {
    const match = this.projectService.projects().find(p => p.id === Number(id));
    if (match) {
      this.projectService.setCurrentProject(match);
    }
  }

  menu = [
    { icon: 'fa-solid fa-table-cells-large', title: 'Dashboard', route: '/dashboard' },
    { icon: 'fa-solid fa-brain', title: 'AI Marketing Intelligence', route: '/ai-marketing-intelligence' },
    { icon: 'fa-solid fa-radar', title: 'Event Radar', route: '/events-radar' },
    { icon: 'fa-solid fa-chart-line', title: 'Market Intelligence', route: '/market-intelligence' },
    { icon: 'fa-regular fa-comment-dots', title: 'Live Chat', route: '/chat' },
    { icon: 'fa-solid fa-clock-rotate-left', title: 'History', route: '/history' },
    { icon: 'fa-regular fa-address-book', title: 'Contacts', route: '/contacts' },
    { icon: 'fa-solid fa-bullhorn', title: 'Campaigns', route: '/campaigns' },
    { icon: 'fa-solid fa-layer-group', title: 'Templates', route: '/templates' },
    { icon: 'fa-solid fa-rectangle-ad', title: 'Ads Manager', route: '/ads' },
    { icon: 'fa-solid fa-share-nodes', title: 'Flows', route: '/flows' },
    { icon: 'fa-solid fa-indian-rupee-sign', title: 'WA Payments', route: '/payments' },
    { icon: 'fa-brands fa-chrome', title: 'Web Push', route: '/webpush' },
    { icon: 'fa-solid fa-square-envelope', title: 'E-mail', route: '/email' },
    { icon: 'fa-solid fa-gear', title: 'Manage', route: '/manage' },
    { icon: 'fa-solid fa-plug', title: 'Integrations', route: '/integrations' },
    { icon: 'fa-solid fa-users', title: 'Agents', route: '/agents' },
    { icon: 'fa-solid fa-file', title: 'CSV Data', route: '/csvdata' },
    { icon: 'fa-solid fa-code', title: 'Developer', route: '/developer' },
    { icon: 'fa-solid fa-folder-open', title: 'All Projects', route: '/projects' }
  ];

  ngOnInit(): void {
    this.projectService.fetchProjects();

    const state = localStorage.getItem('sidebar-collapsed');

    if (state) {
      const isCollapsed = JSON.parse(state);
      this.collapsed.set(isCollapsed);
      this.collapsedChange.emit(isCollapsed);
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

      const isCollapsed = state ? JSON.parse(state) : false;
      this.collapsed.set(isCollapsed);
      this.collapsedChange.emit(isCollapsed);

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
      
      this.collapsedChange.emit(!v);

      return !v;

    });

  }

  logout() {
    this.authService.logout();
  }

}