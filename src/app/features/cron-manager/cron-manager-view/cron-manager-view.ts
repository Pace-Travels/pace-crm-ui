import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface CronJobConfig {
  id: number;
  jobKey: string;
  title: string;
  description: string;
  frequency: string;
  intervalMs: number;
  status: 'ACTIVE' | 'PAUSED' | 'RUNNING';
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  lastDurationMs: number;
  isSystemJob: boolean;
}

export interface CronLogItem {
  id: number;
  jobKey: string;
  jobTitle: string;
  triggerType: 'AUTOMATIC_CRON' | 'MANUAL_ADMIN' | 'MANUAL_AGENCY';
  triggeredByUserId: number | null;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  itemsProcessed: number;
  summaryLog: string | null;
  errorDetails: string | null;
}

@Component({
  selector: 'app-cron-manager-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cron-manager-view.html',
  styleUrl: './cron-manager-view.scss'
})
export class CronManagerView implements OnInit {
  private api = inject(ApiService);

  isLoading = signal<boolean>(true);
  overview = signal<any>({
    totalJobs: 0,
    activeJobs: 0,
    runningJobs: 0,
    pausedJobs: 0,
    totalExecutions: 0,
    successExecutions: 0,
    failedExecutions: 0,
    successRate: 100,
    nextUpcomingJob: null
  });

  jobs = signal<CronJobConfig[]>([]);
  logs = signal<CronLogItem[]>([]);

  // Filtering & Pagination for Audit Logs
  searchQuery = signal<string>('');
  selectedJobFilter = signal<string>('ALL');
  selectedStatusFilter = signal<string>('ALL');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  totalLogsCount = signal<number>(0);

  // Selected Log Modal State
  selectedLog = signal<CronLogItem | null>(null);

  ngOnInit(): void {
    this.refreshAllData();
  }

  refreshAllData(): void {
    this.isLoading.set(true);
    this.fetchOverview();
    this.fetchJobs();
    this.fetchLogs();
  }

  fetchOverview(): void {
    this.api.get<any>('cron-manager/overview').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.overview.set(res.data);
        }
      },
      error: (err: any) => console.error('Failed to fetch cron overview:', err)
    });
  }

  fetchJobs(): void {
    this.api.get<any>('cron-manager/jobs').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.jobs.set(res.data);
        }
      },
      error: (err: any) => console.error('Failed to fetch cron jobs:', err)
    });
  }

  fetchLogs(): void {
    let url = `cron-manager/logs?page=${this.currentPage()}&limit=${this.pageSize()}`;
    if (this.selectedJobFilter() !== 'ALL') url += `&jobKey=${this.selectedJobFilter()}`;
    if (this.selectedStatusFilter() !== 'ALL') url += `&status=${this.selectedStatusFilter()}`;

    this.api.get<any>(url).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.logs.set(res.data);
          if (res.pagination) {
            this.totalPages.set(res.pagination.totalPages || 1);
            this.totalLogsCount.set(res.pagination.totalItems || 0);
          }
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        console.error('Failed to fetch cron logs:', err);
      }
    });
  }

  triggerNow(job: CronJobConfig): void {
    Swal.fire({
      title: `Trigger ${job.title}?`,
      text: 'This will manually execute the background task immediately.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '⚡ Trigger Now',
      confirmButtonColor: '#2563eb'
    }).then((res) => {
      if (res.isConfirmed) {
        Swal.fire({
          title: 'Executing Cron Task...',
          text: 'Please wait while the task runs in the background.',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.api.post<any>(`cron-manager/trigger-now/${job.jobKey}`, {}).subscribe({
          next: (res: any) => {
            Swal.fire({
              title: 'Execution Complete!',
              text: res.message || `Job ${job.jobKey} finished successfully.`,
              icon: 'success'
            });
            this.refreshAllData();
          },
          error: (err: any) => {
            Swal.fire('Execution Error', err.error?.error || err.message || 'Task execution failed', 'error');
            this.refreshAllData();
          }
        });
      }
    });
  }

  toggleStatus(job: CronJobConfig): void {
    const newStatus = job.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const actionText = newStatus === 'PAUSED' ? 'Pause' : 'Activate';

    Swal.fire({
      title: `${actionText} Cron Scheduler?`,
      text: `Are you sure you want to change state of '${job.title}' to ${newStatus}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionText}`
    }).then((res) => {
      if (res.isConfirmed) {
        this.api.patch<any>(`cron-manager/toggle/${job.jobKey}`, { status: newStatus }).subscribe({
          next: () => {
            Swal.fire('Updated!', `Cron scheduler ${actionText.toLowerCase()}d successfully.`, 'success');
            this.refreshAllData();
          },
          error: (err: any) => Swal.fire('Error', err.error?.error || 'Failed to update status', 'error')
        });
      }
    });
  }

  openLogModal(log: CronLogItem): void {
    this.selectedLog.set(log);
  }

  closeLogModal(): void {
    this.selectedLog.set(null);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.fetchLogs();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.fetchLogs();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.fetchLogs();
    }
  }
}
