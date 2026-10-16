import { Component, signal, inject, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactsSidebar } from './components/contacts-sidebar/contacts-sidebar';
import { ContactsTable } from './components/contacts-table/contacts-table';
import { WhatsappCostCalculator } from './components/whatsapp-cost-calculator/whatsapp-cost-calculator';
import { ApiService } from '../../shared/services/api.service';
import { ProjectService } from '../projects/services/project.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, ContactsSidebar, ContactsTable, WhatsappCostCalculator],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts implements OnInit {
  api = inject(ApiService);
  projectService = inject(ProjectService);

  showCalculator = signal<boolean>(true);

  wabaStats = signal<{
    qualityRating: string;
    tierDisplay: string;
  }>({
    qualityRating: 'High',
    tierDisplay: 'Tier 1 (1k/day)'
  });

  constructor() {
    effect(() => {
      const activeProj = this.projectService.currentProject();
      if (activeProj && activeProj.id) {
        this.fetchWabaStats(activeProj.id);
      }
    });
  }

  ngOnInit() {
    const proj = this.projectService.currentProject();
    const projId = proj ? proj.id : (localStorage.getItem('activeProjectId') || '1');
    this.fetchWabaStats(projId);
  }

  fetchWabaStats(projectId: number | string) {
    this.api.get<any>(`projects/${projectId}/waba-stats`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.wabaStats.set({
            qualityRating: res.qualityRating || 'High',
            tierDisplay: res.tierDisplay || 'Tier 1 (1k/day)'
          });
        }
      },
      error: () => {}
    });
  }

  toggleCalculator() {
    this.showCalculator.set(!this.showCalculator());
  }
}
