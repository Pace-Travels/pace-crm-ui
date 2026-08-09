import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdsService, FBPage } from '../../services/ads.service';

declare var FB: any;
declare var Swal: any;

@Component({
  selector: 'app-ads-setup-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ads-setup-view.html',
  styleUrl: './ads-setup-view.scss',
})
export class AdsSetupView implements OnInit {
  adsService = inject(AdsService);
  fb = inject(FormBuilder);

  selectedPageId = '';
  termsChecked = false;
  whatsappNumberInput = '';

  // Create Ad Modal state
  showCreateAdModal = signal(false);
  adForm: FormGroup;

  constructor() {
    this.adForm = this.fb.group({
      name: ['', Validators.required],
      budget: [500, [Validators.required, Validators.min(100)]],
      headline: ['Chat with us on WhatsApp for Instant Offers!'],
      primaryText: ['Click to start a conversation with our sales team on WhatsApp.']
    });
  }

  ngOnInit() {
    this.adsService.fetchSetupState();
    this.adsService.fetchAnalytics();
  }

  // Step 1: Connect Facebook Account
  connectWithFacebook() {
    if (typeof FB !== 'undefined') {
      FB.login((response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;
          this.submitFBToken(accessToken);
        } else {
          this.showAlert('Notice', 'Facebook login was cancelled.', 'info');
        }
      }, { scope: 'pages_show_list,ads_management,leads_retrieval,pages_read_engagement' });
    } else {
      // Demo fallback when FB SDK isn't loaded
      const mockToken = 'EAAB_MOCK_FB_TOKEN_' + Date.now();
      this.submitFBToken(mockToken);
    }
  }

  private submitFBToken(token: string) {
    this.adsService.connectFacebook(token).subscribe({
      next: (res) => {
        this.showAlert('Success!', 'Facebook account connected successfully.', 'success');
        this.adsService.fetchSetupState();
      },
      error: (err) => {
        this.showAlert('Error', err.error?.error || 'Failed to connect Facebook account', 'error');
      }
    });
  }

  // Step 2: Choose Facebook Page
  onPageSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedPageId = target.value;
    if (!this.selectedPageId) return;

    const pageObj = (this.adsService.setupState()?.pages || []).find(p => p.pageId === this.selectedPageId);
    const pageName = pageObj ? pageObj.name : 'Selected FB Page';

    this.adsService.selectPage(this.selectedPageId, pageName).subscribe({
      next: () => {
        this.showAlert('Success', `Page "${pageName}" selected.`, 'success');
        this.adsService.fetchSetupState();
      },
      error: (err) => this.showAlert('Error', err.error?.error || 'Failed to select page', 'error')
    });
  }

  // Step 3: Accept Terms of Service
  onAcceptTerms() {
    if (!this.termsChecked) {
      this.showAlert('Terms Required', 'Please check the Terms of Service checkbox first.', 'warning');
      return;
    }
    this.adsService.acceptTerms().subscribe({
      next: () => {
        this.showAlert('Terms Accepted', 'Lead Form Terms of Service accepted.', 'success');
        this.adsService.fetchSetupState();
      },
      error: (err) => this.showAlert('Error', err.error?.error || 'Failed to accept terms', 'error')
    });
  }

  // Step 4: Link WhatsApp Number
  onVerifyWhatsappNumber() {
    if (!this.whatsappNumberInput.trim()) {
      this.showAlert('Required', 'Please enter your WhatsApp business number.', 'warning');
      return;
    }
    this.adsService.linkWhatsappNumber(this.whatsappNumberInput.trim()).subscribe({
      next: () => {
        this.showAlert('Linked!', 'WhatsApp number linked to Facebook Page.', 'success');
        this.adsService.fetchSetupState();
      },
      error: (err) => this.showAlert('Error', err.error?.error || 'Failed to link number', 'error')
    });
  }

  // Step 5: Create Click-to-WhatsApp Ad Campaign
  openCreateAdModal() {
    this.showCreateAdModal.set(true);
  }

  closeCreateAdModal() {
    this.showCreateAdModal.set(false);
  }

  submitCreateAd() {
    if (this.adForm.invalid) {
      this.showAlert('Form Error', 'Please complete all required campaign fields.', 'warning');
      return;
    }

    this.adsService.createAd(this.adForm.value).subscribe({
      next: () => {
        this.closeCreateAdModal();
        this.adForm.reset({ budget: 500 });
        this.showAlert('Ad Created!', 'Click-to-WhatsApp Campaign published successfully.', 'success');
        this.adsService.fetchAnalytics();
        this.adsService.fetchSetupState();
      },
      error: (err) => this.showAlert('Error', err.error?.error || 'Failed to create ad campaign', 'error')
    });
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
