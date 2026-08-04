import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActionCards } from './components/action-cards/action-cards';
import { CampaignTable } from './components/campaign-table/campaign-table';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, ActionCards, CampaignTable],
  templateUrl: './campaigns.html',
  styleUrl: './campaigns.scss',
})
export class Campaigns {
  showCampaignTypeModal = false;

  constructor(private router: Router) {}

  openModal() {
    this.showCampaignTypeModal = true;
  }

  closeModal() {
    this.showCampaignTypeModal = false;
  }

  startBroadcastCampaign() {
    this.showCampaignTypeModal = false;
    this.router.navigate(['/campaigns/create']);
  }
}
