import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { ContactService } from '../../../contacts/services/contact.service';
import { SocketService } from '../../../../shared/services/socket.service';
import { AdvisoryBadge } from '../../../../shared/components/advisory-badge/advisory-badge';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-campaign-table',
  standalone: true,
  imports: [CommonModule, FormsModule, AdvisoryBadge],
  templateUrl: './campaign-table.html',
  styleUrl: './campaign-table.scss',
})
export class CampaignTable implements OnInit, OnDestroy {
  campaignService = inject(CampaignService);
  contactService = inject(ContactService);
  socketService = inject(SocketService);
  router = inject(Router);

  private autoRefreshTimer: any = null;
  
  activeTab = signal<string>('All');
  searchQuery = signal<string>('');

  // Responses & CRM Sync Data Table Modal state
  showResponsesModal = signal<boolean>(false);
  selectedCampaign = signal<Campaign | null>(null);
  campaignTemplate = signal<any>(null);
  showPreviewCard = signal<boolean>(true);
  recipientResponses = signal<any[]>([]);
  isLoadingResponses = signal<boolean>(false);
  campaignStats = signal<{ total: number; sent: number; pending: number; delivered: number; read: number; failed: number; newlyAdded?: number }>({
    total: 0, sent: 0, pending: 0, delivered: 0, read: 0, failed: 0, newlyAdded: 0
  });

  // DataTables Controls State
  tableSearchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);
  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Copy Phone Number state
  copiedPhoneMap = signal<{ [key: number]: boolean }>({});

  // Resend state
  isResendingMap = signal<{ [key: number]: boolean }>({});
  isResendingAll = signal<boolean>(false);
  isResendingNewlyAdded = signal<boolean>(false);

  // Modal Recipient Selection & Batch Dispatch State
  selectedRecipientIds = signal<number[]>([]);
  customBatchQuantity = signal<number | null>(null);
  isSendingSelected = signal<boolean>(false);
  isReleasingMemory = signal<boolean>(false);

  // Add Recipient Modal State
  showAddRecipientModal = signal<boolean>(false);
  newRecipientPhone = signal<string>('');
  newRecipientName = signal<string>('');
  sendImmediately = signal<boolean>(true);
  isAddingRecipient = signal<boolean>(false);

  // Edit Recipient Modal State
  showEditRecipientModal = signal<boolean>(false);
  editingRecipient = signal<any>(null);
  editRecipientPhone = signal<string>('');
  editRecipientName = signal<string>('');
  isUpdatingRecipient = signal<boolean>(false);

  ngOnInit() {
    this.campaignService.fetchCampaigns();
    this.contactService.fetchContacts();

    const socket = this.socketService.getSocket();

    // 1. Real-time recipient status updates (SENT, DELIVERED, READ, FAILED)
    socket?.on('campaign_recipient_status', (data: any) => {
      if (!data || !data.campaignId) return;

      // Update Main Table row metrics immediately
      const campaignsList = this.campaignService.campaigns();
      const cIndex = campaignsList.findIndex(c => c.id === data.campaignId);
      if (cIndex !== -1) {
        const targetC = { ...campaignsList[cIndex] };
        if (data.status === 'SENT') {
          targetC.sentCount = (targetC.sentCount || 0) + 1;
          targetC.pendingCount = Math.max(0, (targetC.pendingCount || 0) - 1);
        } else if (data.status === 'FAILED') {
          targetC.failedCount = (targetC.failedCount || 0) + 1;
          targetC.pendingCount = Math.max(0, (targetC.pendingCount || 0) - 1);
        }
        const updated = [...campaignsList];
        updated[cIndex] = targetC;
        this.campaignService.campaigns.set(updated);
      }

      // Update Analytics & Receipts Modal if currently viewing this campaign
      if (this.showResponsesModal() && this.selectedCampaign()?.id === data.campaignId) {
        const responses = [...this.recipientResponses()];
        const rIndex = responses.findIndex(r => 
          (data.recipientId && r.id === data.recipientId) || 
          (data.contactId && r.contactId === data.contactId) || 
          (data.phone && (r.phone === data.phone || r.Contact?.phone === data.phone))
        );

        if (rIndex !== -1) {
          const prev = responses[rIndex];
          responses[rIndex] = {
            ...prev,
            status: data.status,
            sentAt: data.sentAt || prev.sentAt,
            deliveredAt: data.deliveredAt || prev.deliveredAt,
            readAt: data.readAt || prev.readAt,
            errorMessage: data.errorMessage !== undefined ? data.errorMessage : prev.errorMessage,
            externalMessageId: data.externalMessageId || prev.externalMessageId
          };
          this.recipientResponses.set(responses);

          // Update metric cards live
          const stats = {
            total: responses.length,
            sent: responses.filter(r => r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'READ').length,
            delivered: responses.filter(r => r.status === 'DELIVERED' || r.status === 'READ').length,
            read: responses.filter(r => r.status === 'READ').length,
            pending: responses.filter(r => !r.status || ['PENDING', 'QUEUED', 'SCHEDULED', 'PROCESSING'].includes(r.status)).length,
            failed: responses.filter(r => r.status === 'FAILED' || r.status === 'BOUNCED' || r.status === 'ERROR').length,
            skipped: responses.filter(r => r.status === 'SKIPPED').length,
            newlyAdded: responses.filter(r => r.isNewlyAdded).length
          };
          this.campaignStats.set(stats);
        }
      }
    });

    // 2. Real-time campaign lifecycle progress updates (RUNNING, COMPLETED, PAUSED)
    socket?.on('campaign_progress', (data: any) => {
      if (!data || !data.campaignId) return;

      const campaignsList = this.campaignService.campaigns();
      const cIndex = campaignsList.findIndex(c => c.id === data.campaignId);
      if (cIndex !== -1) {
        const updated = [...campaignsList];
        updated[cIndex] = {
          ...updated[cIndex],
          status: data.status || updated[cIndex].status
        };
        this.campaignService.campaigns.set(updated);
      }

      if (this.showResponsesModal() && this.selectedCampaign()?.id === data.campaignId) {
        const sel = this.selectedCampaign();
        if (sel && data.status) {
          this.selectedCampaign.set({ ...sel, status: data.status });
        }
        this.refreshResponsesSilently(data.campaignId);
      }
    });

    // 3. Real-time customer response received
    socket?.on('campaign_response_received', (data: any) => {
      if (this.showResponsesModal() && this.selectedCampaign()?.id === data.campaignId) {
        const currentList = [...this.recipientResponses()];
        const target = currentList.find(r => r.id === data.recipientId || r.contactId === data.contactId);
        if (target) {
          target.responseReceived = data.responseReceived;
          target.respondedAt = data.respondedAt;
          this.recipientResponses.set(currentList);
        } else {
          this.refreshResponsesSilently(this.selectedCampaign()!.id);
        }
      }
    });

    // 4. Intelligent Auto-Sync Background Timer (Every 3 seconds while campaigns are running)
    this.autoRefreshTimer = setInterval(() => {
      const hasRunning = this.campaignService.campaigns().some(c => c.status === 'RUNNING');
      if (hasRunning) {
        this.campaignService.fetchCampaigns(true);
      }

      if (this.showResponsesModal() && this.selectedCampaign()) {
        const sel = this.selectedCampaign()!;
        if (sel.status === 'RUNNING') {
          this.refreshResponsesSilently(sel.id);
        }
      }
    }, 3000);
  }

  ngOnDestroy() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
    const socket = this.socketService.getSocket();
    socket?.off('campaign_recipient_status');
    socket?.off('campaign_progress');
    socket?.off('campaign_response_received');
  }

  get filteredCampaigns(): Campaign[] {
    let list = this.campaignService.campaigns();
    const query = this.searchQuery().trim().toLowerCase();
    const tab = this.activeTab();

    if (query) {
      list = list.filter(c => 
        c.campaignName.toLowerCase().includes(query) || 
        c.audience.toLowerCase().includes(query)
      );
    }

    if (tab === 'Broadcast') {
      list = list.filter(c => c.type === 'BROADCAST' || c.type === 'ALL');
    } else if (tab === 'B2B/B2C') {
      list = list.filter(c => c.type === 'B2B' || c.type === 'B2C');
    } else if (tab === 'Scheduled') {
      list = list.filter(c => c.status === 'SCHEDULED');
    }

    return list;
  }

  // Computed: Filtered recipients (Search & Status)
  filteredRecipients = computed(() => {
    let list = this.recipientResponses();
    const query = this.tableSearchQuery().trim().toLowerCase();
    const filter = this.statusFilter();

    // Status filter
    if (filter === 'READ') {
      list = list.filter(r => r.status === 'READ');
    } else if (filter === 'DELIVERED') {
      list = list.filter(r => r.status === 'DELIVERED');
    } else if (filter === 'SENT') {
      list = list.filter(r => r.status === 'SENT');
    } else if (filter === 'FAILED') {
      list = list.filter(r => r.status === 'FAILED');
    } else if (filter === 'PENDING') {
      list = list.filter(r => !r.status || ['PENDING', 'QUEUED', 'SCHEDULED', 'PROCESSING'].includes(r.status));
    } else if (filter === 'NEW') {
      list = list.filter(r => r.isNewlyAdded);
    }

    // Search query filter
    if (query) {
      list = list.filter(r => {
        const name = (r.Contact?.name || '').toLowerCase();
        const phone = (r.Contact?.phone || r.phone || '').toLowerCase();
        const status = (r.status || '').toLowerCase();
        const response = (r.responseReceived || '').toLowerCase();
        const owners = (r.Contact ? this.contactService.getContactOwners(r.Contact).join(' ') : '').toLowerCase();
        return name.includes(query) || phone.includes(query) || status.includes(query) || response.includes(query) || owners.includes(query);
      });
    }

    return list;
  });

  // Computed: Sorted recipients
  sortedRecipients = computed(() => {
    const list = [...this.filteredRecipients()];
    const col = this.sortColumn();
    const dir = this.sortDirection();

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (col === 'id') {
        valA = a.id || 0;
        valB = b.id || 0;
      } else if (col === 'name') {
        valA = (a.Contact?.name || '').toLowerCase();
        valB = (b.Contact?.name || '').toLowerCase();
      } else if (col === 'phone') {
        valA = (a.Contact?.phone || a.phone || '').toLowerCase();
        valB = (b.Contact?.phone || b.phone || '').toLowerCase();
      } else if (col === 'status') {
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
      } else if (col === 'sentAt') {
        valA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        valB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      } else if (col === 'deliveredAt') {
        valA = a.deliveredAt ? new Date(a.deliveredAt).getTime() : 0;
        valB = b.deliveredAt ? new Date(b.deliveredAt).getTime() : 0;
      } else if (col === 'readAt') {
        valA = a.readAt ? new Date(a.readAt).getTime() : 0;
        valB = b.readAt ? new Date(b.readAt).getTime() : 0;
      } else if (col === 'response') {
        valA = (a.responseReceived || '').toLowerCase();
        valB = (b.responseReceived || '').toLowerCase();
      }

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  });

  // Computed: Paginated list
  paginatedRecipients = computed(() => {
    const sorted = this.sortedRecipients();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return sorted.slice(start, start + size);
  });

  // Modal Recipient Selection Computeds
  selectedRecipientIdsSet = computed(() => new Set(this.selectedRecipientIds()));

  eligiblePageRecipients = computed(() => {
    return this.paginatedRecipients().filter(r => this.isRecipientEligible(r));
  });

  isAllPageSelected = computed(() => {
    const list = this.eligiblePageRecipients();
    const set = this.selectedRecipientIdsSet();
    return list.length > 0 && list.every(r => set.has(r.id));
  });

  // Computed: Total pages
  totalPages = computed(() => {
    const total = this.sortedRecipients().length;
    return Math.ceil(total / this.pageSize()) || 1;
  });

  // Computed: Pagination information label
  paginationInfo = computed(() => {
    const totalFiltered = this.sortedRecipients().length;
    const totalOverall = this.recipientResponses().length;
    if (totalFiltered === 0) return 'Showing 0 to 0 of 0 entries';

    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, totalFiltered);

    if (totalFiltered < totalOverall) {
      return `Showing ${start} to ${end} of ${totalFiltered} entries (filtered from ${totalOverall} total)`;
    }
    return `Showing ${start} to ${end} of ${totalFiltered} entries`;
  });

  // Computed: Count of newly added
  newlyAddedCount = computed(() => {
    return this.recipientResponses().filter(r => r.isNewlyAdded).length;
  });

  // Pagination navigation
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  setPageSize(size: number) {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  setSort(col: string) {
    if (this.sortColumn() === col) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('asc');
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Copy Phone Number to clipboard with instant feedback
  copyPhoneNumber(phone: string, id: number) {
    if (!phone) return;
    const cleanDigits = phone.trim();
    navigator.clipboard.writeText(cleanDigits).then(() => {
      this.copiedPhoneMap.set({ ...this.copiedPhoneMap(), [id]: true });
      setTimeout(() => {
        const current = { ...this.copiedPhoneMap() };
        delete current[id];
        this.copiedPhoneMap.set(current);
      }, 2000);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = cleanDigits;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.copiedPhoneMap.set({ ...this.copiedPhoneMap(), [id]: true });
      setTimeout(() => {
        const current = { ...this.copiedPhoneMap() };
        delete current[id];
        this.copiedPhoneMap.set(current);
      }, 2000);
    });
  }

  togglePreviewCard() {
    this.showPreviewCard.set(!this.showPreviewCard());
  }

  // WhatsApp Message Preview Helpers
  getHeaderImageUrl(tpl: any): string | null {
    if (!tpl) return null;
    if (tpl.headerMediaUrl) return tpl.headerMediaUrl;
    if (tpl.headerUrl) return tpl.headerUrl;
    if (Array.isArray(tpl.components)) {
      const headerComp = tpl.components.find((c: any) => (c.type === 'HEADER' || c.type === 'header'));
      if (headerComp && (headerComp.format === 'IMAGE' || headerComp.headerType === 'IMAGE')) {
        if (headerComp.example?.header_handle?.[0]) return headerComp.example.header_handle[0];
        if (headerComp.headerUrl || headerComp.url) return headerComp.headerUrl || headerComp.url;
      }
    }
    if (tpl.headerType === 'IMAGE' || tpl.headerFormat === 'IMAGE') {
      return 'https://pace-messenger-assets.s3.ap-south-1.amazonaws.com/templates/banners/asia_tours.png';
    }
    return null;
  }

  getHeaderVideoUrl(tpl: any): string | null {
    if (!tpl) return null;
    if (tpl.headerType === 'VIDEO' || tpl.headerFormat === 'VIDEO') {
      if (tpl.headerMediaUrl) return tpl.headerMediaUrl;
      if (Array.isArray(tpl.components)) {
        const headerComp = tpl.components.find((c: any) => (c.type === 'HEADER' || c.type === 'header'));
        if (headerComp && (headerComp.format === 'VIDEO' || headerComp.headerType === 'VIDEO')) {
          if (headerComp.example?.header_handle?.[0]) return headerComp.example.header_handle[0];
          if (headerComp.headerUrl || headerComp.url) return headerComp.headerUrl || headerComp.url;
        }
      }
    }
    return null;
  }

  getHeaderDocUrl(tpl: any): string | null {
    if (!tpl) return null;
    if (tpl.headerType === 'DOCUMENT' || tpl.headerFormat === 'DOCUMENT') {
      return tpl.headerMediaUrl || tpl.headerUrl || 'Document.pdf';
    }
    return null;
  }

  getParsedPreviewBody(templateBody: string, parameters?: any): string {
    if (!templateBody) return '';
    let parsed = templateBody;
    // Replace {{1}}, {{2}} with parameters or nice pills
    parsed = parsed.replace(/\{\{(\d+)\}\}/g, (match, p1) => {
      const idx = parseInt(p1, 10);
      if (parameters && parameters[`var${idx}`]) {
        return `<span style="background: #e0f2fe; color: #0284c7; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${parameters[`var${idx}`]}</span>`;
      }
      return `<span style="background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px; font-weight: 700;">[Variable ${p1}]</span>`;
    });
    // Format bold *text*
    parsed = parsed.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');
    // Format italic _text_
    parsed = parsed.replace(/_([^_]+)_/g, '<em>$1</em>');
    return parsed;
  }

  getTemplateButtons(tpl: any): any[] {
    if (!tpl) return [];
    if (tpl.buttons) {
      if (typeof tpl.buttons === 'string') {
        try { return JSON.parse(tpl.buttons); } catch {}
      } else if (Array.isArray(tpl.buttons)) {
        return tpl.buttons;
      }
    }
    if (Array.isArray(tpl.components)) {
      const btnComp = tpl.components.find((c: any) => (c.type === 'BUTTONS' || c.type === 'buttons'));
      if (btnComp && Array.isArray(btnComp.buttons)) return btnComp.buttons;
    }
    return [];
  }

  openResponsesModal(campaign: Campaign) {
    this.selectedCampaign.set(campaign);
    this.showResponsesModal.set(true);
    this.isLoadingResponses.set(true);
    this.currentPage.set(1);
    this.tableSearchQuery.set('');
    this.statusFilter.set('ALL');
    this.selectedRecipientIds.set([]);
    this.customBatchQuantity.set(null);

    this.campaignService.getCampaignResponses(campaign.id).subscribe({
      next: (res: any) => {
        this.recipientResponses.set(res.data || []);
        if (res.campaign?.Template) {
          this.campaignTemplate.set(res.campaign.Template);
        } else {
          this.campaignTemplate.set(null);
        }

        if (res.stats) {
          this.campaignStats.set(res.stats);
        } else {
          const list = res.data || [];
          this.campaignStats.set({
            total: list.length,
            sent: list.filter((r: any) => r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'READ').length,
            pending: list.filter((r: any) => r.status === 'QUEUED' || r.status === 'PENDING' || r.status === 'SCHEDULED' || r.status === 'PROCESSING').length,
            delivered: list.filter((r: any) => r.status === 'DELIVERED' || r.status === 'READ').length,
            read: list.filter((r: any) => r.status === 'READ').length,
            failed: list.filter((r: any) => r.status === 'FAILED' || r.status === 'BOUNCED' || r.status === 'ERROR').length,
            newlyAdded: list.filter((r: any) => r.isNewlyAdded).length
          });
        }
        this.isLoadingResponses.set(false);
      },
      error: (err: any) => {
        this.isLoadingResponses.set(false);
        Swal.fire('Error', 'Failed to fetch responses: ' + err.message, 'error');
      }
    });
  }

  refreshResponsesSilently(campaignId: number) {
    this.campaignService.getCampaignResponses(campaignId).subscribe({
      next: (res: any) => {
        if (res.data) {
          this.recipientResponses.set(res.data);
        }
        if (res.stats) {
          this.campaignStats.set(res.stats);
        }
        if (res.campaign) {
          const sel = this.selectedCampaign();
          if (sel) {
            this.selectedCampaign.set({
              ...sel,
              status: res.campaign.status || sel.status,
              autoRetryEnabled: res.campaign.autoRetryEnabled !== undefined ? res.campaign.autoRetryEnabled : sel.autoRetryEnabled
            });
          }
        }
      },
      error: () => {}
    });
  }

  closeResponsesModal() {
    this.showResponsesModal.set(false);
    this.selectedCampaign.set(null);
    this.campaignTemplate.set(null);
    this.recipientResponses.set([]);
    this.showAddRecipientModal.set(false);
    this.showEditRecipientModal.set(false);
    this.selectedRecipientIds.set([]);
    this.customBatchQuantity.set(null);
  }

  // Add Recipient Actions
  openAddRecipientModal() {
    this.newRecipientPhone.set('');
    this.newRecipientName.set('');
    this.sendImmediately.set(true);
    this.showAddRecipientModal.set(true);
  }

  closeAddRecipientModal() {
    this.showAddRecipientModal.set(false);
  }

  submitAddRecipient() {
    const campaign = this.selectedCampaign();
    if (!campaign) return;

    const phone = this.newRecipientPhone().trim();
    if (!phone) {
      Swal.fire('Invalid Phone', 'Please enter a valid recipient phone number.', 'warning');
      return;
    }

    this.isAddingRecipient.set(true);
    this.campaignService.addRecipientToCampaign(campaign.id, {
      phone,
      name: this.newRecipientName().trim() || undefined,
      sendNow: this.sendImmediately()
    }).subscribe({
      next: (res: any) => {
        this.isAddingRecipient.set(false);
        this.closeAddRecipientModal();

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: res.message || 'Recipient added successfully',
          timer: 3000,
          showConfirmButton: false
        });

        // Refresh responses and stats
        this.openResponsesModal(campaign);
      },
      error: (err: any) => {
        this.isAddingRecipient.set(false);
        Swal.fire('Add Failed', err.error?.message || err.message || 'Could not add recipient to campaign', 'error');
      }
    });
  }

  // Edit Recipient Actions
  openEditRecipientModal(recipient: any) {
    this.editingRecipient.set(recipient);
    this.editRecipientPhone.set(recipient.Contact?.phone || recipient.phone || '');
    this.editRecipientName.set(recipient.Contact?.name || '');
    this.showEditRecipientModal.set(true);
  }

  closeEditRecipientModal() {
    this.showEditRecipientModal.set(false);
    this.editingRecipient.set(null);
  }

  submitUpdateRecipient() {
    const recipient = this.editingRecipient();
    if (!recipient) return;

    const phone = this.editRecipientPhone().trim();
    if (!phone) {
      Swal.fire('Invalid Phone', 'Please enter a valid recipient phone number.', 'warning');
      return;
    }

    this.isUpdatingRecipient.set(true);
    this.campaignService.updateCampaignRecipient(recipient.id, {
      phone,
      name: this.editRecipientName().trim() || undefined
    }).subscribe({
      next: (res: any) => {
        this.isUpdatingRecipient.set(false);
        this.closeEditRecipientModal();

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Recipient updated successfully',
          timer: 2500,
          showConfirmButton: false
        });

        // Update locally
        if (res.recipient) {
          const list = this.recipientResponses().map(r => r.id === recipient.id ? res.recipient : r);
          this.recipientResponses.set(list);
        } else if (this.selectedCampaign()) {
          this.openResponsesModal(this.selectedCampaign()!);
        }
      },
      error: (err: any) => {
        this.isUpdatingRecipient.set(false);
        Swal.fire('Update Failed', err.error?.message || err.message || 'Could not update recipient', 'error');
      }
    });
  }

  // Resend to all newly added recipients
  resendNewlyAdded() {
    const campaign = this.selectedCampaign();
    if (!campaign) return;

    const newlyCount = this.newlyAddedCount();
    if (newlyCount === 0) {
      Swal.fire('No Newly Added', 'There are no newly added recipients to resend for this campaign.', 'info');
      return;
    }

    this.isResendingNewlyAdded.set(true);
    this.campaignService.resendNewlyAdded(campaign.id).subscribe({
      next: (res: any) => {
        this.isResendingNewlyAdded.set(false);
        Swal.fire('Resend Complete', res.message || `Dispatched to ${res.count || 0} newly added recipients`, 'success');
        this.openResponsesModal(campaign);
      },
      error: (err: any) => {
        this.isResendingNewlyAdded.set(false);
        Swal.fire('Resend Failed', err.error?.message || err.message || 'Failed to dispatch to newly added recipients', 'error');
      }
    });
  }

  openLiveChatForRecipient(item: any) {
    const phone = item.Contact?.phone || item.phone;
    if (!phone) {
      Swal.fire('No Phone Number', 'No phone number registered for this contact.', 'warning');
      return;
    }
    this.closeResponsesModal();
    this.router.navigate(['/live-chat'], { queryParams: { phone: phone } });
  }

  syncResponseToCrm(recipient: any) {
    const payload = {
      recipientId: recipient.id,
      leadStage: recipient.responseReceived?.toLowerCase().includes('b2b') ? 'Qualified' : 'Interested',
      appendTag: 'Campaign-Replied'
    };

    this.campaignService.syncResponseToCrm(payload).subscribe({
      next: () => {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Synced response for ${recipient.Contact?.name || 'Contact'} to CRM`,
          timer: 2500,
          showConfirmButton: false
        });
        recipient.crmSyncStatus = 'SYNCED';
        this.contactService.fetchContacts();
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to sync to CRM: ' + err.message, 'error');
      }
    });
  }

  syncAllResponsesToCrm() {
    const unsynced = this.recipientResponses().filter(r => r.crmSyncStatus !== 'SYNCED');
    if (unsynced.length === 0) {
      Swal.fire('All Synced', 'All campaign recipient responses are already synced to CRM.', 'info');
      return;
    }

    unsynced.forEach(recipient => {
      this.syncResponseToCrm(recipient);
    });
  }

  isRecipientInCooldown(recipient: any): boolean {
    if (!recipient) return false;
    const now = new Date();

    const cooldownUntil = recipient.advisory?.primary?.until || recipient.Contact?.marketingCooldownUntil;
    if (cooldownUntil && new Date(cooldownUntil) > now) {
      return true;
    }

    if (recipient.advisory?.level === 'HARD') return true;
    if (recipient.advisory?.reasons?.some((r: any) => (r.type === 'COOLDOWN' && r.until && new Date(r.until) > now) || r.level === 'HARD')) {
      return true;
    }

    return false;
  }

  getRecipientCooldownReason(recipient: any): string {
    if (!recipient) return '';
    const now = new Date();
    const cooldownUntil = recipient.advisory?.primary?.until || recipient.Contact?.marketingCooldownUntil;
    if (cooldownUntil && new Date(cooldownUntil) > now) {
      const formattedDate = new Date(cooldownUntil).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      return `Disabled: In Marketing Cooldown until ${formattedDate}. Resend disabled to prevent bounce and protect number reputation.`;
    }
    if (recipient.advisory?.primary?.detail) {
      return `Disabled: ${recipient.advisory.primary.label || 'Deliverability block'} - ${recipient.advisory.primary.detail}`;
    }
    return 'Disabled: Recipient currently blocked by deliverability advisory.';
  }

  resendCampaignToRecipient(recipient: any) {
    if (this.isRecipientInCooldown(recipient)) {
      Swal.fire({
        icon: 'warning',
        title: 'Recipient in Cooldown',
        text: this.getRecipientCooldownReason(recipient),
        confirmButtonColor: '#7c3aed'
      });
      return;
    }

    const currentMap = { ...this.isResendingMap(), [recipient.id]: true };
    this.isResendingMap.set(currentMap);

    this.campaignService.resendRecipient(recipient.id).subscribe({
      next: (res: any) => {
        const resetMap = { ...this.isResendingMap(), [recipient.id]: false };
        this.isResendingMap.set(resetMap);

        recipient.status = 'SENT';
        recipient.sentAt = new Date();
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: res.message || `Resent message to ${recipient.Contact?.name || 'Contact'}`,
          timer: 3000,
          showConfirmButton: false
        });

        if (this.selectedCampaign()) {
          this.openResponsesModal(this.selectedCampaign()!);
        }
      },
      error: (err: any) => {
        const resetMap = { ...this.isResendingMap(), [recipient.id]: false };
        this.isResendingMap.set(resetMap);
        Swal.fire('Resend Failed', err.error?.message || err.message || 'Failed to resend template message', 'error');
      }
    });
  }

  resendAllFailedOrPending() {
    const campaign = this.selectedCampaign();
    if (!campaign) return;

    this.isResendingAll.set(true);
    this.campaignService.resendFailedRecipients(campaign.id).subscribe({
      next: (res: any) => {
        this.isResendingAll.set(false);
        Swal.fire('Resend Complete', res.message || `Resent campaign to ${res.count || 0} recipients`, 'success');
        this.openResponsesModal(campaign);
      },
      error: (err: any) => {
        this.isResendingAll.set(false);
        Swal.fire('Error', 'Failed to resend campaign messages: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  // =========================================================================
  // GRANULAR SELECTION & BATCH DISPATCH ACTIONS (1, 100, 500, CUSTOM)
  // =========================================================================

  isRecipientEligible(recipient: any): boolean {
    if (!recipient) return false;
    // Sent, delivered, or read recipients or ones with external message ID cannot be re-targeted in a fresh send
    if (['SENT', 'DELIVERED', 'READ'].includes(recipient.status) || recipient.externalMessageId) {
      return false;
    }
    return true;
  }

  isRecipientSelected(id: number): boolean {
    return this.selectedRecipientIdsSet().has(id);
  }

  toggleSelectRecipient(recipient: any) {
    if (!this.isRecipientEligible(recipient)) return;
    const current = this.selectedRecipientIds();
    const id = recipient.id;
    if (current.includes(id)) {
      this.selectedRecipientIds.set(current.filter(i => i !== id));
    } else {
      this.selectedRecipientIds.set([...current, id]);
    }
  }

  toggleSelectAllPage() {
    const current = this.selectedRecipientIds();
    const pageList = this.eligiblePageRecipients();
    if (this.isAllPageSelected()) {
      const pageIds = pageList.map(r => r.id);
      this.selectedRecipientIds.set(current.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = pageList.map(r => r.id);
      this.selectedRecipientIds.set(Array.from(new Set([...current, ...pageIds])));
    }
  }

  selectBatch(count: number) {
    if (!count || count <= 0) return;
    // Prefer selecting from filtered sorted recipients first, or from all recipient responses
    const filteredEligible = this.sortedRecipients().filter(r => this.isRecipientEligible(r));
    let targets: any[] = [];
    if (filteredEligible.length >= count) {
      targets = filteredEligible.slice(0, count);
    } else {
      const allEligible = this.recipientResponses().filter(r => this.isRecipientEligible(r));
      targets = allEligible.slice(0, count);
    }

    if (targets.length === 0) {
      Swal.fire('No Pending Recipients', 'There are no pending or unsent recipients available to select.', 'info');
      return;
    }

    const ids = targets.map(r => r.id);
    this.selectedRecipientIds.set(ids);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Selected ${ids.length} recipient${ids.length === 1 ? '' : 's'}`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  selectAllPending() {
    const allEligible = this.recipientResponses().filter(r => this.isRecipientEligible(r));
    if (allEligible.length === 0) {
      Swal.fire('No Pending Recipients', 'All recipients in this campaign have already been sent.', 'info');
      return;
    }
    const ids = allEligible.map(r => r.id);
    this.selectedRecipientIds.set(ids);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Selected all ${ids.length} pending recipient${ids.length === 1 ? '' : 's'}`,
      timer: 2500,
      showConfirmButton: false
    });
  }

  clearSelection() {
    this.selectedRecipientIds.set([]);
  }

  applyCustomBatch() {
    const qty = this.customBatchQuantity();
    if (!qty || qty <= 0) {
      Swal.fire('Invalid Quantity', 'Please enter a valid number of recipients to select (e.g. 50, 100, 250).', 'warning');
      return;
    }
    this.selectBatch(qty);
  }

  sendToSelectedRecipients() {
    const campaign = this.selectedCampaign();
    if (!campaign) return;

    const ids = this.selectedRecipientIds();
    if (ids.length === 0) {
      Swal.fire('No Recipients Selected', 'Please select at least 1 recipient to dispatch.', 'warning');
      return;
    }

    const count = ids.length;
    Swal.fire({
      title: `Send to ${count} Recipient${count > 1 ? 's' : ''}?`,
      html: `You have chosen to dispatch this campaign to <b>${count}</b> specific recipient${count > 1 ? 's' : ''}.<br><br><small style="color: #64748b;">Messages will be throttled via the campaign queue at ~10 msgs/sec with real-time delivery receipts.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: `<i class="fa-solid fa-paper-plane"></i> Yes, Dispatch to ${count}`
    }).then((result) => {
      if (result.isConfirmed) {
        this.isSendingSelected.set(true);
        this.campaignService.sendSelectedRecipients(campaign.id, ids).subscribe({
          next: (res: any) => {
            this.isSendingSelected.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Dispatched Successfully',
              text: res.message || `Dispatched to ${res.count || count} recipients. Watch delivery receipts update in real time below.`,
              timer: 3500,
              showConfirmButton: false
            });
            this.selectedRecipientIds.set([]);
            this.refreshResponsesSilently(campaign.id);
          },
          error: (err: any) => {
            this.isSendingSelected.set(false);
            Swal.fire('Dispatch Failed', err.error?.message || err.message || 'Could not send to selected recipients', 'error');
          }
        });
      }
    });
  }

  triggerManualMemoryRelease() {
    this.isReleasingMemory.set(true);
    const cId = this.selectedCampaign()?.id;
    this.campaignService.releaseMemory(cId).subscribe({
      next: (res: any) => {
        this.isReleasingMemory.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Memory Released',
          text: res.message || 'Server heap, Redis queue cache, and Linux system buffers have been released cleanly.',
          timer: 3000,
          showConfirmButton: false
        });
      },
      error: (err: any) => {
        this.isReleasingMemory.set(false);
        Swal.fire('Memory Release Notice', err.error?.message || err.message, 'info');
      }
    });
  }

  pauseCampaign(c: Campaign) {
    Swal.fire({
      title: 'Pause Campaign?',
      text: `Do you want to pause "${c.campaignName}"? Pending messages will be held immediately.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Yes, Pause'
    }).then((res) => {
      if (res.isConfirmed) {
        this.campaignService.pauseCampaign(c.id).subscribe({
          next: (response: any) => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: response.message || 'Campaign paused',
              timer: 3000,
              showConfirmButton: false
            });
            c.status = 'PAUSED';
            if (this.selectedCampaign()?.id === c.id) {
              const sel = this.selectedCampaign();
              if (sel) {
                sel.status = 'PAUSED';
                this.selectedCampaign.set({ ...sel });
              }
            }
            this.campaignService.fetchCampaigns();
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Failed to pause campaign', 'error')
        });
      }
    });
  }

  resumeCampaign(c: Campaign) {
    const isPaused = c.status === 'PAUSED';
    const isCancelled = c.status === 'CANCELLED' || c.status === 'Cancelled';
    const actionLabel = isCancelled ? 'Restart' : (isPaused ? 'Resume' : 'Start');
    Swal.fire({
      title: `${actionLabel} Campaign?`,
      text: isCancelled
        ? `Restart sending remaining messages for "${c.campaignName}"? All unsent and stopped messages will be dispatched safely at a rate-limited pace. Any already delivered messages will NOT be duplicated.`
        : (isPaused 
            ? `Resume sending pending messages for "${c.campaignName}"?` 
            : `Start dispatching messages for "${c.campaignName}" now?`),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: `Yes, ${actionLabel}`
    }).then((res) => {
      if (res.isConfirmed) {
        const obs = isCancelled 
          ? this.campaignService.restartCampaign(c.id) 
          : this.campaignService.resumeCampaign(c.id);
        obs.subscribe({
          next: (response: any) => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: response.message || `Campaign ${actionLabel.toLowerCase()}ed`,
              timer: 3000,
              showConfirmButton: false
            });
            c.status = 'RUNNING';
            if (this.selectedCampaign()?.id === c.id) {
              const sel = this.selectedCampaign();
              if (sel) {
                sel.status = 'RUNNING';
                this.selectedCampaign.set({ ...sel });
              }
            }
            this.campaignService.fetchCampaigns();
          },
          error: (err) => Swal.fire('Error', err.error?.message || `Failed to ${actionLabel.toLowerCase()} campaign`, 'error')
        });
      }
    });
  }

  restartCampaign(c: Campaign) {
    this.resumeCampaign(c);
  }

  stopCampaign(c: Campaign) {
    Swal.fire({
      title: 'Stop Campaign Permanently?',
      text: `Are you sure you want to stop "${c.campaignName}"? All remaining pending and queued messages will be aborted immediately and will NOT be sent.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Yes, Stop Campaign'
    }).then((res) => {
      if (res.isConfirmed) {
        this.campaignService.stopCampaign(c.id).subscribe({
          next: (response: any) => {
            Swal.fire('Stopped', response.message || 'Campaign stopped permanently.', 'success');
            c.status = 'CANCELLED';
            if (this.selectedCampaign()?.id === c.id) {
              const sel = this.selectedCampaign();
              if (sel) {
                sel.status = 'CANCELLED';
                this.selectedCampaign.set({ ...sel });
              }
            }
            this.campaignService.fetchCampaigns();
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Failed to stop campaign', 'error')
        });
      }
    });
  }

  deleteCampaign(c: Campaign) {
    Swal.fire({
      title: 'Delete Campaign?',
      text: `Are you sure you want to delete "${c.campaignName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    }).then((res) => {
      if (res.isConfirmed) {
        this.campaignService.deleteCampaign(c.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Campaign removed successfully.', 'success');
            this.campaignService.fetchCampaigns();
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Failed to delete campaign', 'error')
        });
      }
    });
  }

  toggleCampaignAutoRetry() {
    const campaign = this.selectedCampaign();
    if (!campaign) return;

    const newTargetState = !campaign.autoRetryEnabled;
    this.campaignService.toggleAutoRetry(campaign.id, newTargetState).subscribe({
      next: (res: any) => {
        campaign.autoRetryEnabled = res.autoRetryEnabled;
        this.selectedCampaign.set({ ...campaign });

        // Update campaign in the main list
        const updatedList = this.campaignService.campaigns().map(c => 
          c.id === campaign.id ? { ...c, autoRetryEnabled: res.autoRetryEnabled } : c
        );
        this.campaignService.campaigns.set(updatedList);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: res.autoRetryEnabled ? 'success' : 'info',
          title: res.message || `Auto-retry cron ${res.autoRetryEnabled ? 'ENABLED' : 'DISABLED'}`,
          timer: 3000,
          showConfirmButton: false
        });
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to toggle auto-retry: ' + (err.error?.message || err.message), 'error');
      }
    });
  }
}
