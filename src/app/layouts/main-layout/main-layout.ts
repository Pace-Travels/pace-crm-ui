import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { Header } from '../../shared/header/header';
import { ProductTourModalComponent } from '../../shared/components/product-tour/product-tour';
import { GlobalSearchComponent } from '../../shared/components/global-search/global-search.component';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Header, ProductTourModalComponent, GlobalSearchComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout implements OnInit {

  @ViewChild(Sidebar)
  sidebar!: Sidebar;

  sidebarCollapsed = false;
  authService = inject(AuthService);

  ngOnInit() {
    this.authService.checkSessionOrRedirect();
  }

  toggleSidebar() {
    // sidebar component toggle
    this.sidebar.toggleSidebar();
    // layout class update is handled by the (collapsedChange) emitter automatically!
  }
}
