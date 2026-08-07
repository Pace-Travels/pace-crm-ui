import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../shared/services/api.service';

declare var Swal: any;

@Component({
  selector: 'app-developer-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './developer-view.html',
  styleUrl: './developer-view.scss',
})
export class DeveloperView implements OnInit {
  api = inject(ApiService);

  activeTab = 'api-campaign-key';
  apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MmIwNWIxZGVmNDZmMGJmNjVhMDhjZSIsIm5hbWUiOiJQYWNlIFRyYXZlbHMiLCJhcHBJZCI6IjQWlTZW5zSIsInNsaWdCI6InjcYjA1YjBkZWY0NmYwYmY2NWcwGM3IiwiYWN0aXZlUGxhbiI6IkJBU0lDX01PTlRITHkiLCJpYXQiOjE3MzI4NDYyMzh9.xZJTS61DbI0f6F_IQUETPwLPMaPjt7BpKFKJwv_VQ';

  // Webhook inspector logs
  webhookLogs = signal<any[]>([]);
  showPayloadModal = signal(false);
  selectedLog = signal<any | null>(null);

  ngOnInit() {
    this.fetchWebhookLogs();
  }

  fetchWebhookLogs() {
    this.api.get<any>('webhookendpoints/logs').subscribe({
      next: (res) => {
        if (res.success) {
          this.webhookLogs.set(res.logs || []);
        }
      },
      error: (err) => console.warn('Fetch webhook logs error', err)
    });
  }

  openPayloadModal(log: any) {
    this.selectedLog.set(log);
    this.showPayloadModal.set(true);
  }

  closePayloadModal() {
    this.showPayloadModal.set(false);
  }

  retryWebhook(logId: string) {
    this.api.post<any>('webhookendpoints/retry', { logId }).subscribe({
      next: (res) => {
        if (res.success) {
          this.showAlert('Webhook Retried!', res.message || 'Payload re-sent successfully.', 'success');
          this.fetchWebhookLogs();
        }
      },
      error: (err) => this.showAlert('Error', err.error?.error || 'Webhook retry failed', 'error')
    });
  }

  copyApiKey() {
    navigator.clipboard.writeText(this.apiKey);
    this.showAlert('Copied!', 'API Key copied to clipboard.', 'success');
  }

  private showAlert(title: string, text: string, icon: string) {
    if (typeof Swal !== 'undefined' && Swal && Swal.fire) {
      Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    } else {
      alert(`${title}: ${text}`);
    }
  }
}
