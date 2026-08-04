import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManageSidebar } from './components/manage-sidebar/manage-sidebar';
import { TemplatesView } from './components/templates-view/templates-view';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [CommonModule, ManageSidebar, TemplatesView],
  templateUrl: './manage.html',
  styleUrl: './manage.scss',
})
export class Manage {}
