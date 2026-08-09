import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../contacts/services/contact.service';
import { ApiService } from '../../../shared/services/api.service';
import { ContactProfilePanel } from '../../../shared/components/contact-profile-panel/contact-profile-panel';
import Swal from 'sweetalert2';

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

  // Templates list & active selection
  templates = signal<any[]>([]);
  selectedTemplate = signal<any>(null);
  templateParams = signal<any>({}); // e.g. {"1": "fallback", "2": "fallback"}
  
  // Test target
  testPhoneNumber = signal('');

  // Targeting Audience Type
  audienceType = signal<'ALL' | 'B2B' | 'B2C' | 'GROUP'>('ALL');
  selectedGroupId = signal<number | null>(null);

  // Profile Panel State
  isProfilePanelOpen = false;
  selectedProfileContact: any = null;

  constructor(
    private router: Router,
    private api: ApiService,
    public contactService: ContactService
  ) {}

  ngOnInit() {
    this.contactService.fetchContacts();
    this.contactService.fetchGroups();
    this.fetchTemplates();
  }

  fetchTemplates() {
    this.api.get('/messagetemplates/list').subscribe((res: any) => {
      this.templates.set(res.data || []);
      if (res.data && res.data.length > 0) {
        this.selectTemplate(res.data[0]);
      }
    });
  }

  syncTemplates() {
    this.api.get('/messagetemplates/sync').subscribe({
      next: (res: any) => {
        this.templates.set(res.data || []);
        if (res.data && res.data.length > 0) {
          this.selectTemplate(res.data[0]);
        }
        alert("Templates synced successfully from WhatsApp API!");
      },
      error: (err: any) => {
        alert("Failed to sync templates: " + err.message);
      }
    });
  }

  selectTemplate(tpl: any) {
    this.selectedTemplate.set(tpl);
    const matches = tpl.templateBody.match(/\{\{\d+\}\}/g) || [];
    const paramsMap: any = {};
    matches.forEach((match: string) => {
      const num = match.replace(/[\{\}]/g, '');
      paramsMap[num] = '';
    });
    this.templateParams.set(paramsMap);
  }

  getTemplateParamKeys() {
    return Object.keys(this.templateParams());
  }

  onParamChange(key: string, event: any) {
    const current = { ...this.templateParams() };
    current[key] = event.target.value;
    this.templateParams.set(current);
  }

  getPreviewText() {
    let body = this.selectedTemplate()?.templateBody || '';
    const params = this.templateParams();
    Object.keys(params).forEach((key) => {
      const val = params[key] || `[Variable ${key}]`;
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    });
    return body;
  }

  // Filter contacts displayed in Step 1 based on active target selection
  getAudienceContacts() {
    const contacts = this.contactService.contacts();
    const type = this.audienceType();
    
    if (type === 'B2B') {
      return contacts.filter(c => c.type === 'B2B');
    } else if (type === 'B2C') {
      return contacts.filter(c => c.type === 'B2C');
    } else if (type === 'GROUP' && this.selectedGroupId()) {
      // Find matching group member ids
      // Mock / dynamic grouping filters
      // Simply check if contact matches activeType B2B/B2C or filter it
      const group = this.contactService.groups().find(g => g.id === this.selectedGroupId());
      return contacts.filter(c => c.type === group?.contactType);
    }
    return contacts;
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

  launchCampaign() {
    if (!this.campaignName) {
      Swal.fire('Error', 'Campaign Name is required', 'error');
      return;
    }
    if (!this.selectedTemplate()) {
      Swal.fire('Error', 'Please select a template', 'error');
      return;
    }

    const payload = {
      name: this.campaignName,
      description: `WhatsApp Campaign: ${this.selectedTemplate().templateName}`,
      templateId: this.selectedTemplate().id,
      parameters: this.templateParams(),
      targetType: this.audienceType(),
      targetGroupId: this.audienceType() === 'GROUP' ? this.selectedGroupId() : null,
      status: 'RUNNING',
      createdBy: 1
    };

    this.api.post('campaigns/add', payload).subscribe({
      next: () => {
        Swal.fire('Campaign Launched', 'Your WhatsApp broadcast campaign is now running!', 'success').then(() => {
          this.router.navigate(['/campaigns']);
        });
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to launch campaign: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  sendTestMessage() {
    if (!this.testPhoneNumber()) {
      Swal.fire('Error', 'Test phone number is required', 'error');
      return;
    }
    if (!this.selectedTemplate()) {
      Swal.fire('Error', 'Please select a template first', 'error');
      return;
    }

    const payload = {
      templateId: this.selectedTemplate().id,
      phone: this.testPhoneNumber(),
      parameters: this.templateParams()
    };

    this.api.post('campaigns/send-test', payload).subscribe({
      next: () => {
        Swal.fire('Test Sent', 'Test marketing message sent successfully via WhatsApp!', 'success');
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to send test: ' + (err.error?.error || err.message), 'error');
      }
    });
  }
}
