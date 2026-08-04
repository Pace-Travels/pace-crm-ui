import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignService } from '../../services/campaign.service';

@Component({
  selector: 'app-campaign-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campaign-table.html',
  styleUrl: './campaign-table.scss',
})
export class CampaignTable implements OnInit {
  activeTab = 'All';

  constructor(public campaignService: CampaignService) {}

  ngOnInit() {
    this.campaignService.fetchCampaigns();
  }
}
