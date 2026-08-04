import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IntegrationsSidebar } from './components/integrations-sidebar/integrations-sidebar';
import { IntegrationsView as IntegrationsViewComponent } from './components/integrations-view/integrations-view';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, IntegrationsSidebar, IntegrationsViewComponent],
  templateUrl: './integrations.html',
  styleUrl: './integrations.scss',
})
export class Integrations {}
