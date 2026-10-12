import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface SystemLogItem {
  id: number;
  level: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  service: string;
  errorCode?: number;
  guidance?: string;
  metaParsed?: any;
  senderPhone?: string;
  recipientPhone?: string;
  createdAt: string;
}

@Component({
  selector: 'app-system-logs-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-logs-view.html',
  styleUrl: './system-logs-view.scss'
})
export class SystemLogsView implements OnInit {
  api = inject(ApiService);

  logs = signal<SystemLogItem[]>([]);
  isLoading = signal<boolean>(false);
  totalLogs = signal<number>(0);
  page = signal<number>(1);
  totalPages = signal<number>(1);

  // Filters & Modals
  selectedLevel = 'ALL';
  searchQuery = '';
  selectedLogDetail = signal<SystemLogItem | null>(null);
  selectedMetaReport = signal<SystemLogItem | null>(null);

  // Stats
  errorCount24h = signal<number>(0);
  metaErrorCount = signal<number>(0);
  healthScore = signal<number>(99.4);

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.isLoading.set(true);
    let url = `systemlogs/list?page=${this.page()}&limit=25&level=${this.selectedLevel}`;
    if (this.searchQuery.trim()) {
      url += `&query=${encodeURIComponent(this.searchQuery.trim())}`;
    }

    this.api.get<any>(url).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          const list: SystemLogItem[] = res.data;
          this.logs.set(list);
          this.totalLogs.set(res.total || list.length);
          this.totalPages.set(res.totalPages || 1);

          // Calculate summary stats
          const errs = list.filter(l => l.level === 'ERROR').length;
          const metaErrs = list.filter(l => l.service === 'META_WABA_API' || l.errorCode).length;
          this.errorCount24h.set(errs);
          this.metaErrorCount.set(metaErrs);
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.showAlert('Error', err.error?.error || 'Failed to load system logs', 'error');
      }
    });
  }

  onFilterChange() {
    this.page.set(1);
    this.loadLogs();
  }

  changePage(delta: number) {
    const next = this.page() + delta;
    if (next >= 1 && next <= this.totalPages()) {
      this.page.set(next);
      this.loadLogs();
    }
  }

  viewLogDetail(log: SystemLogItem) {
    this.selectedLogDetail.set(log);
  }

  closeDetailModal() {
    this.selectedLogDetail.set(null);
  }

  openMetaReportModal(log: SystemLogItem) {
    this.selectedMetaReport.set(log);
  }

  closeMetaReportModal() {
    this.selectedMetaReport.set(null);
  }

  generateMetaTicketText(log: SystemLogItem | null): string {
    if (!log) return '';
    const dateStr = new Date(log.createdAt).toISOString();
    return `[META WHATSAPP BUSINESS SUPPORT INCIDENT REPORT]
--------------------------------------------------
App / Service: Pace Travels WABA Messaging Portal
Service Channel: ${log.service || 'META_WABA_API'}
Internal Log Reference: #${log.id}
Event Timestamp: ${dateStr}

-- PHONE NUMBER ROUTING DETAILS --
Sender WABA Number: ${log.senderPhone || '+91 80958 44097'}
Receiving Customer Number: ${log.recipientPhone || 'N/A'}

-- ERROR CLASSIFICATION --
Meta Error Code: #${log.errorCode || '190 / OAuth Expired'}
Severity Level: ${log.level}
Error Message: ${log.message}
Meta Guidance: ${log.guidance || 'N/A'}

-- META GRAPH TRACE METADATA --
FB Trace ID: ${log.metaParsed?.traceId || log.metaParsed?.rawPayload?.responseData?.error?.fbtrace_id || 'N/A'}
Request Payload: ${JSON.stringify(log.metaParsed?.rawPayload || {}, null, 2)}
--------------------------------------------------`;
  }

  copyMetaTicketText(log: SystemLogItem | null) {
    if (!log) return;
    const text = this.generateMetaTicketText(log);
    navigator.clipboard.writeText(text).then(() => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Meta Support Ticket Text Copied!',
        timer: 3000,
        showConfirmButton: false
      });
    }).catch(() => {
      Swal.fire('Notice', 'Copied text to clipboard.', 'info');
    });
  }

  openMetaSupportPortal() {
    window.open('https://business.facebook.com/direct-support/', '_blank');
  }

  exportCsv() {
    let url = `${this.api.baseUrl}/systemlogs/export?level=${this.selectedLevel}`;
    if (this.searchQuery.trim()) {
      url += `&query=${encodeURIComponent(this.searchQuery.trim())}`;
    }
    window.open(url, '_blank');
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
