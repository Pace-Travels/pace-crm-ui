import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { ChecklistWidgetComponent } from '../../shared/components/checklist-widget/checklist-widget';
import { OnboardingService } from '../../shared/services/onboarding.service';
import { ProjectService } from '../projects/services/project.service';

import { AuthService } from '../../shared/services/auth.service';

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
  authService = inject(AuthService);
  router = inject(Router);
  onboardingService = inject(OnboardingService);
  projectService = inject(ProjectService);

  selectedDateRange = '7_DAYS';
  selectedTimeframe = signal<string>('This Month');

  chartBars = computed(() => {
    const tf = this.selectedTimeframe();
    if (tf === 'Today') {
      return [
        { label: '12 AM', height: '20%' },
        { label: '3 AM', height: '10%' },
        { label: '6 AM', height: '30%' },
        { label: '9 AM', height: '65%' },
        { label: '12 PM', height: '85%' },
        { label: '3 PM', height: '92%', active: true },
        { label: '6 PM', height: '70%' },
        { label: '9 PM', height: '40%' }
      ];
    } else if (tf === 'This Week') {
      return [
        { label: 'Mon', height: '45%' },
        { label: 'Tue', height: '60%' },
        { label: 'Wed', height: '78%' },
        { label: 'Thu', height: '88%', active: true },
        { label: 'Fri', height: '82%' },
        { label: 'Sat', height: '52%' },
        { label: 'Sun', height: '35%' }
      ];
    } else if (tf === 'This Month') {
      return [
        { label: 'Week 1', height: '52%' },
        { label: 'Week 2', height: '74%' },
        { label: 'Week 3', height: '94%', active: true },
        { label: 'Week 4', height: '68%' }
      ];
    } else if (tf === '3 Months') {
      return [
        { label: 'Aug', height: '58%' },
        { label: 'Sep', height: '76%' },
        { label: 'Oct', height: '94%', active: true }
      ];
    } else if (tf === '6 Months') {
      return [
        { label: 'May', height: '42%' },
        { label: 'Jun', height: '56%' },
        { label: 'Jul', height: '64%' },
        { label: 'Aug', height: '74%' },
        { label: 'Sep', height: '84%' },
        { label: 'Oct', height: '96%', active: true }
      ];
    } else { // Full Year
      return [
        { label: 'Jan', height: '32%' },
        { label: 'Feb', height: '38%' },
        { label: 'Mar', height: '48%' },
        { label: 'Apr', height: '54%' },
        { label: 'May', height: '62%' },
        { label: 'Jun', height: '68%' },
        { label: 'Jul', height: '72%' },
        { label: 'Aug', height: '78%' },
        { label: 'Sep', height: '85%' },
        { label: 'Oct', height: '98%', active: true },
        { label: 'Nov', height: '65%' },
        { label: 'Dec', height: '42%' }
      ];
    }
  });

  onTimeframeChange(newTf: string) {
    this.selectedTimeframe.set(newTf);
    this.fetchAnalytics();
  }


  userName = computed(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.name || user.username || user.email?.split('@')[0] || 'Shadab';
      }
    } catch (e) {}
    return 'Shadab';
  });

  greetingPrefix = computed(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening'; // 5 PM (17:00) onwards, no Good Night
    }
  });

  analytics = signal<any>({
    totalEnquiries: 0,
    quotationsSent: 0,
    confirmedBookings: 0,
    cancelledCount: 0,
    totalMessagesSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    conversionRate: '0.0',
    upcomingPackages: []
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
    const tf = this.selectedTimeframe();
    
    this.api.get<any>(`customreports/analytics?range=${this.selectedDateRange}&timeframe=${encodeURIComponent(tf)}&projectId=${projId}`).subscribe({
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

  openCustomerChat(phone: string) {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    this.router.navigate(['/chat'], { queryParams: { phone: cleanPhone } });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
