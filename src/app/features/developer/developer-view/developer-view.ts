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
  apiKey: string = 'pace_live_sec_98472948294829';

  // Webhook inspector logs
  webhookLogs = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  showPayloadModal = signal(false);
  selectedLog = signal<any | null>(null);

  ngOnInit() {
    this.fetchWebhookLogs();
  }

  fetchWebhookLogs() {
    this.isLoading.set(true);
    this.api.get<any>('webhookendpoints/logs').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.webhookLogs.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openPayloadModal(log: any) {
    this.selectedLog.set(log);
    this.showPayloadModal.set(true);
  }

  closePayloadModal() {
    this.showPayloadModal.set(false);
  }

  retryWebhook(logId: number) {
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
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
