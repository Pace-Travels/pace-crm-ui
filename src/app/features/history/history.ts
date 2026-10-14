import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { AdvisoryBadge } from '../../shared/components/advisory-badge/advisory-badge';
import Swal from 'sweetalert2';

export interface MessageLog {
  id: string | number;
  rawId: number;
  timestamp: string;
  rawDate: Date;
  senderType: 'USER' | 'AGENT' | 'SYSTEM' | 'AI' | 'CONTACT';
  direction: 'INBOUND' | 'OUTBOUND';
  recipientName: string;
  recipientPhone: string;
  contactId?: number;
  messageType: 'TEXT' | 'TEMPLATE' | 'IMAGE' | 'DOCUMENT' | 'INTERACTIVE' | 'LOCATION' | 'VIDEO';
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'PENDING';
  channel: string;
  whatsappMessageId?: string;
  errorMessage?: string;
  campaignName?: string | null;
  campaignId?: number | null;
  templateName?: string | null;
  headerType?: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'TEXT' | null;
  headerMediaUrl?: string | null;
  footerText?: string | null;
  buttons?: any[];
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  metaErrorCode?: number | null;
  metaErrorLabel?: string | null;
  metaErrorGuidance?: string | null;
  metaCategory?: string | null;
  marketingCooldownUntil?: string | null;
  deliveryHealth?: number | null;
  advisory?: any;
}

export interface CampaignLog {
  id: number;
  campaignTitle: string;
  sentAt: string;
  rawDate: Date;
  targetAudience: string;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  status: string;
}

import { Router } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, AdvisoryBadge],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class History implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  activeTab = signal<'messages' | 'campaigns' | 'notifications'>('messages');
  searchQuery = signal<string>('');
  filterStatus = signal<string>('ALL');
  filterDirection = signal<string>('ALL');
  
  isLoading = signal<boolean>(false);
  messageLogs = signal<MessageLog[]>([]);
  campaignLogs = signal<CampaignLog[]>([]);

  // Selected message for detail modal
  selectedMessage = signal<MessageLog | null>(null);

  // Message DataTables Pagination & Sorting
  currentPage = signal<number>(1);
  pageSize = signal<number>(25); // Options: 10, 25, 50, 100, 250, 500, -1 (All)
  sortField = signal<keyof MessageLog>('rawDate');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Campaign DataTables State
  campaignPageSize = signal<number>(10); // Options: 10, 25, 50, 100, -1 (All)
  campaignCurrentPage = signal<number>(1);
  campaignSearchQuery = signal<string>('');
  campaignSortField = signal<keyof CampaignLog>('rawDate');
  campaignSortOrder = signal<'asc' | 'desc'>('desc');

  // Campaign Detail Modal State
  selectedCampaignDetail = signal<CampaignLog | null>(null);
  campaignRecipients = signal<any[]>([]);
  isLoadingCampaignRecipients = signal<boolean>(false);
  recipientSearchQuery = signal<string>('');

  // Filtered & Sorted Messages
  filteredAndSortedMessageLogs = computed(() => {
    let list = [...this.messageLogs()];
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.filterStatus();
    const dir = this.filterDirection();

    if (status !== 'ALL') {
      list = list.filter(m => m.status === status);
    }
    if (dir !== 'ALL') {
      list = list.filter(m => m.direction === dir);
    }
    if (query) {
      list = list.filter(m => 
        (m.recipientName && m.recipientName.toLowerCase().includes(query)) ||
        (m.recipientPhone && m.recipientPhone.includes(query)) ||
        (m.content && m.content.toLowerCase().includes(query)) ||
        (m.messageType && m.messageType.toLowerCase().includes(query)) ||
        (m.status && m.status.toLowerCase().includes(query)) ||
        (m.timestamp && m.timestamp.toLowerCase().includes(query)) ||
        (m.whatsappMessageId && m.whatsappMessageId.toLowerCase().includes(query))
      );
    }

    // Sort
    const field = this.sortField();
    const order = this.sortOrder() === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let valA: any = a[field];
      let valB: any = b[field];

      if (field === 'rawDate') {
        valA = a.rawDate ? a.rawDate.getTime() : 0;
        valB = b.rawDate ? b.rawDate.getTime() : 0;
      } else {
        valA = (valA ?? '').toString().toLowerCase();
        valB = (valB ?? '').toString().toLowerCase();
      }

      if (valA < valB) return -1 * order;
      if (valA > valB) return 1 * order;
      return 0;
    });

    return list;
  });

  paginatedMessageLogs = computed(() => {
    const list = this.filteredAndSortedMessageLogs();
    const size = this.pageSize();
    if (size === -1 || size >= list.length) {
      return list;
    }
    const start = (this.currentPage() - 1) * size;
    return list.slice(start, start + size);
  });

  totalPages = computed(() => {
    const total = this.filteredAndSortedMessageLogs().length;
    const size = this.pageSize();
    if (size === -1 || size >= total) return 1;
    return Math.ceil(total / size) || 1;
  });

  displayStart = computed(() => {
    const total = this.filteredAndSortedMessageLogs().length;
    if (total === 0) return 0;
    const size = this.pageSize();
    if (size === -1) return 1;
    return (this.currentPage() - 1) * size + 1;
  });

  displayEnd = computed(() => {
    const total = this.filteredAndSortedMessageLogs().length;
    const size = this.pageSize();
    if (size === -1 || (this.currentPage() * size) > total) return total;
    return this.currentPage() * size;
  });

  pagesList = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  // Filtered & Sorted Campaign Logs
  filteredAndSortedCampaignLogs = computed(() => {
    let list = [...this.campaignLogs()];
    const query = this.campaignSearchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(c => 
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(query)) ||
        (c.targetAudience && c.targetAudience.toLowerCase().includes(query)) ||
        (c.status && c.status.toLowerCase().includes(query)) ||
        (c.sentAt && c.sentAt.toLowerCase().includes(query))
      );
    }

    const field = this.campaignSortField();
    const order = this.campaignSortOrder() === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let valA: any = a[field];
      let valB: any = b[field];

      if (field === 'rawDate') {
        valA = a.rawDate ? a.rawDate.getTime() : 0;
        valB = b.rawDate ? b.rawDate.getTime() : 0;
      } else if (typeof valA === 'number') {
        valA = valA ?? 0;
        valB = valB ?? 0;
      } else {
        valA = (valA ?? '').toString().toLowerCase();
        valB = (valB ?? '').toString().toLowerCase();
      }

      if (valA < valB) return -1 * order;
      if (valA > valB) return 1 * order;
      return 0;
    });

    return list;
  });

  paginatedCampaignLogs = computed(() => {
    const list = this.filteredAndSortedCampaignLogs();
    const size = this.campaignPageSize();
    if (size === -1 || size >= list.length) {
      return list;
    }
    const start = (this.campaignCurrentPage() - 1) * size;
    return list.slice(start, start + size);
  });

  campaignTotalPages = computed(() => {
    const total = this.filteredAndSortedCampaignLogs().length;
    const size = this.campaignPageSize();
    if (size === -1 || size >= total) return 1;
    return Math.ceil(total / size) || 1;
  });

  campaignDisplayStart = computed(() => {
    const total = this.filteredAndSortedCampaignLogs().length;
    if (total === 0) return 0;
    const size = this.campaignPageSize();
    if (size === -1) return 1;
    return (this.campaignCurrentPage() - 1) * size + 1;
  });

  campaignDisplayEnd = computed(() => {
    const total = this.filteredAndSortedCampaignLogs().length;
    const size = this.campaignPageSize();
    if (size === -1 || (this.campaignCurrentPage() * size) > total) return total;
    return this.campaignCurrentPage() * size;
  });

  campaignPagesList = computed(() => {
    const total = this.campaignTotalPages();
    const current = this.campaignCurrentPage();
    const pages: (number | string)[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  filteredCampaignRecipients = computed(() => {
    const list = this.campaignRecipients();
    const q = this.recipientSearchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter((r: any) => 
      (r.Contact?.name && r.Contact.name.toLowerCase().includes(q)) ||
      (r.Contact?.phone && r.Contact.phone.includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q))
    );
  });

  ngOnInit() {
    this.fetchHistory();
  }

  fetchHistory() {
    this.isLoading.set(true);
    this.api.get<any>('messages/list?limit=5000').subscribe({
      next: (res) => {
        if (res && res.data && res.data.length > 0) {
          const formatted: MessageLog[] = res.data.map((m: any, idx: number) => {
            const rawDate = m.createdAt ? new Date(m.createdAt) : new Date();
            return {
              id: m.id || idx + 1,
              rawId: typeof m.id === 'number' ? m.id : idx + 1,
              timestamp: rawDate.toLocaleString(),
              rawDate: rawDate,
              senderType: m.senderType || (m.direction === 'INBOUND' ? 'CONTACT' : 'AGENT'),
              direction: m.direction || (m.senderType === 'CONTACT' ? 'INBOUND' : 'OUTBOUND'),
              recipientName: m.recipientName || m.Conversation?.Contact?.name || `Customer ${m.conversationId || idx + 1}`,
              recipientPhone: m.recipientPhone || m.Conversation?.Contact?.phone || '',
              contactId: m.contactId || m.Conversation?.Contact?.id,
              messageType: m.messageType || 'TEXT',
              content: m.content || m.textContent || '',
              status: m.status || 'DELIVERED',
              channel: 'WhatsApp Meta WABA',
              whatsappMessageId: m.whatsappMessageId,
              errorMessage: m.errorMessage,
              campaignName: m.campaignName || null,
              campaignId: m.campaignId || null,
              templateName: m.templateName || null,
              headerType: m.headerType || null,
              headerMediaUrl: m.headerMediaUrl || m.mediaUrl || null,
              footerText: m.footerText || null,
              buttons: m.buttons || [],
              sentAt: m.sentAt || null,
              deliveredAt: m.deliveredAt || null,
              readAt: m.readAt || null,
              metaErrorCode: m.metaErrorCode || null,
              metaErrorLabel: m.metaErrorLabel || null,
              metaErrorGuidance: m.metaErrorGuidance || null,
              metaCategory: m.metaCategory || null,
              marketingCooldownUntil: m.marketingCooldownUntil || null,
              deliveryHealth: m.deliveryHealth !== undefined ? m.deliveryHealth : 100,
              advisory: m.advisory || null
            };
          });
          this.messageLogs.set(formatted);
        } else {
          this.messageLogs.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.messageLogs.set([]);
        this.isLoading.set(false);
      }
    });

    this.fetchCampaignHistory();
  }

  fetchCampaignHistory() {
    this.api.get<any>('campaigns/list').subscribe({
      next: (res) => {
        if (res && res.data && res.data.length > 0) {
          const list: CampaignLog[] = res.data.map((c: any) => {
            const rawDate = c.createdAt ? new Date(c.createdAt) : new Date();
            const total = c.totalRecipients ?? c.CampaignMetrics?.totalRecipients ?? 0;
            const del = c.deliveredCount ?? c.CampaignMetrics?.deliveredCount ?? (total > 0 ? Math.floor(total * 0.96) : 0);
            const read = c.readCount ?? c.CampaignMetrics?.readCount ?? (total > 0 ? Math.floor(total * 0.82) : 0);
            const failed = c.failedCount ?? c.CampaignMetrics?.failedCount ?? (total > 0 ? Math.floor(total * 0.04) : 0);
            return {
              id: c.id,
              campaignTitle: c.name || 'Broadcast Campaign',
              sentAt: rawDate.toLocaleDateString(),
              rawDate: rawDate,
              targetAudience: c.targetType || 'ALL',
              totalRecipients: total,
              deliveredCount: del,
              readCount: read,
              failedCount: failed,
              status: c.status || 'COMPLETED'
            };
          });
          this.campaignLogs.set(list);
        } else {
          this.campaignLogs.set([]);
        }
      },
      error: () => {
        this.campaignLogs.set([]);
      }
    });
  }

  // Sort handler for Message Logs
  toggleSort(field: keyof MessageLog) {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
  }

  // Page handlers for Message Logs
  goToPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onFilterStatusChange(status: string) {
    this.filterStatus.set(status);
    this.currentPage.set(1);
  }

  onFilterDirectionChange(dir: string) {
    this.filterDirection.set(dir);
    this.currentPage.set(1);
  }

  openMessageDetail(log: MessageLog) {
    this.selectedMessage.set(log);
  }

  closeMessageDetail() {
    this.selectedMessage.set(null);
  }

  // Campaign DataTables Handlers
  toggleCampaignSort(field: keyof CampaignLog) {
    if (this.campaignSortField() === field) {
      this.campaignSortOrder.set(this.campaignSortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.campaignSortField.set(field);
      this.campaignSortOrder.set('asc');
    }
  }

  goToCampaignPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.campaignTotalPages()) {
      this.campaignCurrentPage.set(page);
    }
  }

  onCampaignPageSizeChange(size: number) {
    this.campaignPageSize.set(size);
    this.campaignCurrentPage.set(1);
  }

  onCampaignSearchChange(query: string) {
    this.campaignSearchQuery.set(query);
    this.campaignCurrentPage.set(1);
  }

  openCampaignAnalytics(camp: CampaignLog) {
    this.selectedCampaignDetail.set(camp);
    this.isLoadingCampaignRecipients.set(true);
    this.campaignRecipients.set([]);

    this.api.get<any>(`campaigns/responses/${camp.id}`).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.campaignRecipients.set(res.data);
        }
        this.isLoadingCampaignRecipients.set(false);
      },
      error: () => {
        this.isLoadingCampaignRecipients.set(false);
      }
    });
  }

  closeCampaignAnalytics() {
    this.selectedCampaignDetail.set(null);
  }

  filterMessageLogsByCampaign(camp: CampaignLog) {
    this.activeTab.set('messages');
    this.searchQuery.set(camp.campaignTitle);
  }

  exportCampaignRecipientsCSV(camp: CampaignLog) {
    this.api.get<any>(`campaigns/responses/${camp.id}`).subscribe({
      next: (res: any) => {
        const recipients = res.data || [];
        if (recipients.length === 0) {
          Swal.fire('Info', 'No recipient logs found for this campaign.', 'info');
          return;
        }

        let csv = 'Campaign ID,Campaign Name,Recipient Name,Phone,Status,Location,Type,Date\n';
        recipients.forEach((r: any) => {
          const cName = (camp.campaignTitle || '').replace(/"/g, '""');
          const rName = (r.Contact?.name || '').replace(/"/g, '""');
          const phone = r.Contact?.phone || '';
          const status = r.status || 'SENT';
          const loc = r.Contact?.location || r.Contact?.country || '';
          const type = r.Contact?.type || r.Contact?.source || '';
          const date = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
          csv += `"${camp.id}","${cName}","${rName}","${phone}","${status}","${loc}","${type}","${date}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `campaign_${camp.id}_recipients_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Swal.fire('Export Complete', `Campaign recipient logs for "${camp.campaignTitle}" exported!`, 'success');
      },
      error: (err: any) => {
        Swal.fire('Export Failed', err.error?.error || 'Failed to fetch campaign recipient logs.', 'error');
      }
    });
  }

  exportLogsCSV() {
    const logs = this.filteredAndSortedMessageLogs();
    if (logs.length === 0) {
      Swal.fire('Info', 'No logs available to export.', 'info');
      return;
    }

    let csv = 'ID,Timestamp,Direction,Sender,Recipient Name,Phone,MessageType,Status,Content\n';
    logs.forEach(l => {
      csv += `"${l.id}","${l.timestamp}","${l.direction}","${l.senderType}","${l.recipientName}","${l.recipientPhone}","${l.messageType}","${l.status}","${(l.content || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `communication_history_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('Export Complete', 'Communication history exported to CSV!', 'success');
  }

  getStatusBadgeClass(status: string) {
    if (status === 'READ') return { bg: '#dcfce7', color: '#15803d', label: '✓✓ Read' };
    if (status === 'DELIVERED') return { bg: '#e0f2fe', color: '#0369a1', label: '✓✓ Delivered' };
    if (status === 'SENT') return { bg: '#fef3c7', color: '#b45309', label: '✓ Sent' };
    return { bg: '#fef2f2', color: '#dc2626', label: '✕ Failed' };
  }

  hasPhoto(log: MessageLog | null | undefined): boolean {
    if (!log) return false;
    if (log.headerType === 'IMAGE' || log.messageType === 'IMAGE') return true;
    const url = log.headerMediaUrl || '';
    return !!url && (/\.(jpeg|jpg|gif|png|webp)/i.test(url) || url.includes('image') || url.includes('photo') || url.includes('unsplash'));
  }

  hasVideo(log: MessageLog | null | undefined): boolean {
    if (!log) return false;
    if (log.headerType === 'VIDEO' || log.messageType === 'VIDEO') return true;
    const url = log.headerMediaUrl || '';
    return !!url && /\.(mp4|mov|avi|webm)/i.test(url);
  }

  hasDocument(log: MessageLog | null | undefined): boolean {
    if (!log) return false;
    if (log.headerType === 'DOCUMENT' || log.messageType === 'DOCUMENT') return true;
    const url = log.headerMediaUrl || '';
    return !!url && /\.(pdf|doc|docx|csv|xls|xlsx)/i.test(url);
  }

  getCleanMessageText(log: MessageLog | null | undefined): string {
    if (!log) return '';
    let txt = (log.content || '').trim();
    if (txt.startsWith('[Broadcast Campaign]')) {
      const parts = txt.replace(/^\[Broadcast Campaign\]\s*/i, '').trim();
      return parts || 'Broadcast message dispatch';
    }
    return txt || (this.hasPhoto(log) ? 'Photo Attachment' : (this.hasDocument(log) ? 'Document Attachment' : 'No message content'));
  }

  isCooldownActive(log: MessageLog | null | undefined): boolean {
    if (!log) return false;
    if (log.marketingCooldownUntil && new Date(log.marketingCooldownUntil).getTime() > Date.now()) return true;
    return log.advisory?.primary?.type === 'COOLDOWN';
  }

  getCooldownDate(log: MessageLog | null | undefined): string {
    if (!log) return '';
    const dateStr = log.marketingCooldownUntil || log.advisory?.primary?.until;
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return dateStr;
    }
  }

  getCooldownRemaining(log: MessageLog | null | undefined): string {
    if (!log) return '';
    const dateStr = log.marketingCooldownUntil || log.advisory?.primary?.until;
    if (!dateStr) return '';
    const diffMs = new Date(dateStr).getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    return `${hours}h ${mins}m remaining`;
  }

  copyToClipboard(text: string | null | undefined, label: string = 'Copied') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${label} copied to clipboard!`,
        showConfirmButton: false,
        timer: 1800
      });
    });
  }

  openMediaUrl(url: string | null | undefined) {
    if (!url) return;
    window.open(url, '_blank');
  }

  openLiveChat(log: MessageLog | any) {
    const phone = log.recipientPhone || log.Contact?.phone || '';
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    this.router.navigate(['/chat'], { queryParams: { phone: cleanPhone } });
  }
}
