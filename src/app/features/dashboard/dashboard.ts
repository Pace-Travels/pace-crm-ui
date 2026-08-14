import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { ChecklistWidgetComponent } from '../../shared/components/checklist-widget/checklist-widget';
import { OnboardingService } from '../../shared/services/onboarding.service';
import { ProjectService } from '../projects/services/project.service';

declare var Swal: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChecklistWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  api = inject(ApiService);
  router = inject(Router);
  onboardingService = inject(OnboardingService);
  projectService = inject(ProjectService);

  selectedDateRange = '7_DAYS';
  analytics = signal<any>({
    totalMessagesSent: 12450,
    totalDelivered: 11920,
    totalRead: 8400,
    activeAiSessions: 142,
    deliverySuccessRate: 95.7,
    readRate: 70.4,
    averageResponseTimeSec: 14,
    conversationCostINR: '425.50'
  });

  constructor() {
    effect(() => {
      const activeProj = this.projectService.currentProject();
      if (activeProj) {
        this.fetchAnalytics();
      }
    });
  }

  ngOnInit() {
    this.fetchAnalytics();
  }

  fetchAnalytics() {
    const proj = this.projectService.currentProject();
    const projId = proj ? proj.id : (localStorage.getItem('activeProjectId') || '1');
    
    this.api.get<any>(`customreports/analytics?range=${this.selectedDateRange}&projectId=${projId}`).subscribe({
      next: (res) => {
        if (res.success && res.analytics) {
          this.analytics.set(res.analytics);
        }
      },
      error: (err) => console.warn('Fetch dashboard analytics error', err)
    });
  }

  onRangeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedDateRange = target.value;
    this.fetchAnalytics();
  }

  useAgentTemplate(templateName: string) {
    this.showAlert('Template Activated', `Loading ${templateName} blueprint into Flow Builder...`, 'success');
    setTimeout(() => {
      this.router.navigate(['/flows/builder']);
    }, 1000);
  }

  exportCSV() {
    const proj = this.projectService.currentProject();
    const projId = proj ? proj.id : (localStorage.getItem('activeProjectId') || '1');
    window.open(`${this.api.baseUrl}/customreports/export?format=csv&projectId=${projId}`, '_blank');
    this.showAlert('Report Download', 'Analytics export CSV download initiated.', 'success');
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
