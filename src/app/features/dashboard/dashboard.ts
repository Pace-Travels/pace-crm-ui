import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';

declare var Swal: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  api = inject(ApiService);

  selectedDateRange = '7_DAYS';
  analytics = signal<any>({
    totalMessagesSent: 12450,
    totalDelivered: 11920,
    totalRead: 8400,
    deliverySuccessRate: 95.7,
    readRate: 70.4,
    averageResponseTimeSec: 14,
    conversationCostINR: '425.50'
  });

  ngOnInit() {
    this.fetchAnalytics();
  }

  fetchAnalytics() {
    this.api.get<any>(`customreports/analytics?range=${this.selectedDateRange}`).subscribe({
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

  exportCSV() {
    window.open(`${this.api.baseUrl}/customreports/export?format=csv`, '_blank');
    this.showAlert('Report Download', 'Analytics export CSV download initiated.', 'success');
  }

  private showAlert(title: string, text: string, icon: string) {
    if (typeof Swal !== 'undefined' && Swal && Swal.fire) {
      Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    } else {
      alert(`${title}: ${text}`);
    }
  }
}
