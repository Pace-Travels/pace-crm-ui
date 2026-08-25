import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignService, Campaign } from '../../services/campaign.service';
import { ContactService } from '../../../contacts/services/contact.service';
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
  
  activeTab = signal<string>('All');
  searchQuery = signal<string>('');

  // Responses & CRM Sync Data Table Modal state
  showResponsesModal = signal<boolean>(false);
  selectedCampaign = signal<Campaign | null>(null);
  recipientResponses = signal<any[]>([]);
  isLoadingResponses = signal<boolean>(false);

  ngOnInit() {
    this.campaignService.fetchCampaigns();
    this.contactService.fetchContacts();
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
