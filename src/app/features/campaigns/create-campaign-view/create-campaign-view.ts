import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../contacts/services/contact.service';
import { ContactProfilePanel } from '../../../shared/components/contact-profile-panel/contact-profile-panel';

@Component({
  selector: 'app-create-campaign-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ContactProfilePanel],
  templateUrl: './create-campaign-view.html',
  styleUrl: './create-campaign-view.scss',
})
export class CreateCampaignView implements OnInit {
  currentStep = 1; // 1: Campaign Details, 2: Create Message, 3: Test & Preview

  campaignName = '';
  showQuickFilters = false;

  // Profile Panel State
  isProfilePanelOpen = false;
  selectedProfileContact: any = null;

  constructor(
    private router: Router,
    public contactService: ContactService
  ) {}

  ngOnInit() {
    this.contactService.fetchContacts();
  }

  toggleFilters() {
    this.showQuickFilters = !this.showQuickFilters;
  }

  openProfilePanel(contact: any) {
    this.selectedProfileContact = contact;
    this.isProfilePanelOpen = true;
  }

  closeProfilePanel() {
    this.isProfilePanelOpen = false;
    this.selectedProfileContact = null;
  }

  goBack() {
    this.router.navigate(['/campaigns']);
  }

  nextStep() {
    if (this.currentStep < 3) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }
}
