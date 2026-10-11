import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActionCards } from './components/action-cards/action-cards';
import { CampaignTable } from './components/campaign-table/campaign-table';
import { ApiService } from '../../shared/services/api.service';
import { ProjectService } from '../projects/services/project.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, ActionCards, CampaignTable],
  templateUrl: './campaigns.html',
  styleUrl: './campaigns.scss',
})
export class Campaigns implements OnInit {
  router = inject(Router);
  api = inject(ApiService);
  projectService = inject(ProjectService);

  showCampaignTypeModal = false;

  wabaStats = signal<{
    qualityRating: string;
    tierDisplay: string;
    remainingQuota: number;
    outbound24hCount: number;
  }>({
    qualityRating: 'High',
    tierDisplay: 'Tier 1 (1k/day)',
    remainingQuota: 1000,
    outbound24hCount: 0
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
            tierDisplay: res.tierDisplay || 'Tier 1 (1k/day)',
            remainingQuota: res.remainingQuota !== undefined ? res.remainingQuota : 1000,
            outbound24hCount: res.outbound24hCount || 0
          });
        }
      },
      error: (err) => console.warn('Fetch WABA stats error:', err)
    });
  }

  openModal() {
    this.showCampaignTypeModal = true;
  }

  closeModal() {
    this.showCampaignTypeModal = false;
  }

  startBroadcastCampaign() {
    this.showCampaignTypeModal = false;
    this.router.navigate(['/campaigns/create']);
  }

  handleLaunchCard(type: string) {
    switch (type) {
      case 'BROADCAST':
        this.openModal();
        break;
      case 'AI_AGENT':
        Swal.fire({
          title: 'Launching AI Agent Builder',
          text: 'Opening Flow Builder with WhatsApp AI Conversational Agent template...',
          icon: 'info',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => this.router.navigate(['/flows/builder']), 1500);
        break;
      case 'STATUS_AD':
        Swal.fire({
          title: 'WhatsApp Status Ads',
          text: 'Navigating to Meta Ads Manager for Click-to-WhatsApp Status campaign setup...',
          icon: 'info',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => this.router.navigate(['/ads-manager']), 1500);
        break;
      case 'LEAD_FORM':
        Swal.fire({
          title: 'WhatsApp Lead Form Ads',
          text: 'Navigating to Ads Manager for Lead Generation campaign setup...',
          icon: 'info',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => this.router.navigate(['/ads-manager']), 1500);
        break;
      default:
        this.openModal();
    }
  }
}
