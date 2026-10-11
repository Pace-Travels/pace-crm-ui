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

  // Filters
  selectedLevel = 'ALL';
  searchQuery = '';
  selectedLogDetail = signal<SystemLogItem | null>(null);

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
