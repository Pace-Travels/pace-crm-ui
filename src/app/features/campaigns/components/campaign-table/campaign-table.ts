import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { ContactService } from '../../../contacts/services/contact.service';
import { SocketService } from '../../../../shared/services/socket.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-campaign-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaign-table.html',
  styleUrl: './campaign-table.scss',
})
export class CampaignTable implements OnInit {
  campaignService = inject(CampaignService);
  contactService = inject(ContactService);
  socketService = inject(SocketService);
  router = inject(Router);
  
  activeTab = signal<string>('All');
  searchQuery = signal<string>('');

  // Responses & CRM Sync Data Table Modal state
  showResponsesModal = signal<boolean>(false);
  selectedCampaign = signal<Campaign | null>(null);
  recipientResponses = signal<any[]>([]);
  isLoadingResponses = signal<boolean>(false);
  campaignStats = signal<{ total: number; sent: number; pending: number; delivered: number; read: number; failed: number }>({
    total: 0, sent: 0, pending: 0, delivered: 0, read: 0, failed: 0
  });

  isResendingMap = signal<{ [key: number]: boolean }>({});
  isResendingAll = signal<boolean>(false);

  ngOnInit() {
    this.campaignService.fetchCampaigns();
    this.contactService.fetchContacts();

    // Listen for real-time campaign response events via WebSocket
    this.socketService.getSocket()?.on('campaign_response_received', (data: any) => {
      if (this.showResponsesModal() && this.selectedCampaign()?.id === data.campaignId) {
        const currentList = [...this.recipientResponses()];
        const target = currentList.find(r => r.id === data.recipientId || r.contactId === data.contactId);
        if (target) {
          target.responseReceived = data.responseReceived;
          target.respondedAt = data.respondedAt;
          this.recipientResponses.set(currentList);
        } else {
          this.openResponsesModal(this.selectedCampaign()!);
        }
      }
    });
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

  openResponsesModal(campaign: Campaign) {
    this.selectedCampaign.set(campaign);
    this.showResponsesModal.set(true);
    this.isLoadingResponses.set(true);

    this.campaignService.getCampaignResponses(campaign.id).subscribe({
      next: (res: any) => {
        this.recipientResponses.set(res.data || []);
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
            failed: list.filter((r: any) => r.status === 'FAILED' || r.status === 'BOUNCED' || r.status === 'ERROR').length
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

  closeResponsesModal() {
    this.showResponsesModal.set(false);
    this.selectedCampaign.set(null);
    this.recipientResponses.set([]);
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

    let syncedCount = 0;
    unsynced.forEach(recipient => {
      this.syncResponseToCrm(recipient);
      syncedCount++;
    });
  }

  resendCampaignToRecipient(recipient: any) {
    const currentMap = { ...this.isResendingMap(), [recipient.id]: true };
    this.isResendingMap.set(currentMap);

    this.campaignService.resendRecipient(recipient.id).subscribe({
      next: (res: any) => {
        const resetMap = { ...this.isResendingMap(), [recipient.id]: false };
        this.isResendingMap.set(resetMap);

        recipient.status = 'SENT';
        
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
}
