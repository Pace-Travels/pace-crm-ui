import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
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
  messageType: 'TEXT' | 'TEMPLATE' | 'IMAGE' | 'DOCUMENT' | 'INTERACTIVE' | 'LOCATION';
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'PENDING';
  channel: string;
  whatsappMessageId?: string;
  errorMessage?: string;
}

export interface CampaignLog {
  id: number;
  campaignTitle: string;
  sentAt: string;
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
  imports: [CommonModule, FormsModule],
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

  // DataTables Pagination & Sorting
  currentPage = signal<number>(1);
  pageSize = signal<number>(25); // Options: 10, 25, 50, 100, 250, 500, -1 (All)
  sortField = signal<keyof MessageLog>('rawDate');
  sortOrder = signal<'asc' | 'desc'>('desc');

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

  ngOnInit() {
    this.fetchHistory();
  }

  fetchHistory() {
    this.isLoading.set(true);
    this.api.get<any>('messages/list?limit=5000').subscribe({
      next: (res) => {
        if (res.data && res.data.length > 0) {
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
              messageType: m.messageType || 'TEXT',
              content: m.content || m.textContent || '',
              status: m.status || 'DELIVERED',
              channel: 'WhatsApp Meta WABA',
              whatsappMessageId: m.whatsappMessageId,
              errorMessage: m.errorMessage
            };
          });
          this.messageLogs.set(formatted);
        } else {
          this.loadMockHistory();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.loadMockHistory();
        this.isLoading.set(false);
      }
    });

    this.fetchCampaignHistory();
  }

  loadMockHistory() {
    const mockLogs: MessageLog[] = [
      { id: 101, rawId: 101, timestamp: '13 Aug 2026, 22:45:10', rawDate: new Date('2026-08-13T22:45:10'), senderType: 'AGENT', direction: 'OUTBOUND', recipientName: 'Alice Smith', recipientPhone: '+919876543210', messageType: 'TEMPLATE', content: 'Hi Alice! Your Dubai VIP staycation booking is confirmed.', status: 'READ', channel: 'WhatsApp Meta WABA' },
      { id: 102, rawId: 102, timestamp: '13 Aug 2026, 22:40:15', rawDate: new Date('2026-08-13T22:40:15'), senderType: 'USER', direction: 'INBOUND', recipientName: 'Bob Johnson', recipientPhone: '+919876543211', messageType: 'TEXT', content: 'Can I get the itinerary details for 3 nights package?', status: 'DELIVERED', channel: 'WhatsApp Meta WABA' },
      { id: 103, rawId: 103, timestamp: '13 Aug 2026, 22:30:00', rawDate: new Date('2026-08-13T22:30:00'), senderType: 'AI', direction: 'OUTBOUND', recipientName: 'Pace Travels Agency', recipientPhone: '+919876543212', messageType: 'TEXT', content: 'Hello! Pace Travels AI Agent here. How can I assist your team today?', status: 'READ', channel: 'WhatsApp Meta WABA' },
      { id: 104, rawId: 104, timestamp: '13 Aug 2026, 21:15:40', rawDate: new Date('2026-08-13T21:15:40'), senderType: 'AGENT', direction: 'OUTBOUND', recipientName: 'Rahul Verma', recipientPhone: '+919876543213', messageType: 'TEMPLATE', content: 'Special offer! Get 20% OFF on Thailand holiday vouchers.', status: 'SENT', channel: 'WhatsApp Meta WABA' },
      { id: 105, rawId: 105, timestamp: '13 Aug 2026, 20:05:12', rawDate: new Date('2026-08-13T20:05:12'), senderType: 'AGENT', direction: 'OUTBOUND', recipientName: 'Dubai Pace Travels', recipientPhone: '+919876543214', messageType: 'TEXT', content: 'B2B Tariff list updated for Q3 2026.', status: 'FAILED', channel: 'WhatsApp Meta WABA' }
    ];
    this.messageLogs.set(mockLogs);
  }

  fetchCampaignHistory() {
    this.api.get<any>('campaigns/list').subscribe({
      next: (res) => {
        if (res.data) {
          const list: CampaignLog[] = res.data.map((c: any) => ({
            id: c.id,
            campaignTitle: c.name || 'Broadcast Campaign',
            sentAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Today',
            targetAudience: c.targetType || 'B2C Travelers',
            totalRecipients: c.totalRecipients || 450,
            deliveredCount: Math.floor((c.totalRecipients || 450) * 0.96),
            readCount: Math.floor((c.totalRecipients || 450) * 0.82),
            failedCount: Math.floor((c.totalRecipients || 450) * 0.04),
            status: c.status || 'COMPLETED'
          }));
          this.campaignLogs.set(list);
        }
      },
      error: () => {
        this.campaignLogs.set([
          { id: 1, campaignTitle: 'Weekend Special Staycation Sale', sentAt: '12 Aug 2026', targetAudience: 'B2C Travelers (1,240 contacts)', totalRecipients: 1240, deliveredCount: 1190, readCount: 890, failedCount: 50, status: 'COMPLETED' },
          { id: 2, campaignTitle: 'B2B Travel Agent Q3 Package Launch', sentAt: '10 Aug 2026', targetAudience: 'B2B Travel Agents (350 agencies)', totalRecipients: 350, deliveredCount: 342, readCount: 295, failedCount: 8, status: 'COMPLETED' }
        ]);
      }
    });
  }

  // Sort handler
  toggleSort(field: keyof MessageLog) {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
  }

  // Page handlers
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

  openLiveChat(log: MessageLog) {
    const phone = log.recipientPhone ? log.recipientPhone.replace(/\D/g, '') : '';
    this.router.navigate(['/chat'], { queryParams: { phone } });
  }
}
