import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignService, Campaign } from '../../services/campaign.service';
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
  
  activeTab = signal<string>('All');
  searchQuery = signal<string>('');

  ngOnInit() {
    this.campaignService.fetchCampaigns();
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
