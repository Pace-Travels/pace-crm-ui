import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { Header } from '../../shared/header/header';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {

  @ViewChild(Sidebar)
  sidebar!: Sidebar;

  sidebarCollapsed = false;


  toggleSidebar() {

    // sidebar component toggle
    this.sidebar.toggleSidebar();

    // layout class update
    this.sidebarCollapsed = !this.sidebarCollapsed;

  }
}
