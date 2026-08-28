import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContactService, Contact } from '../../contacts/services/contact.service';
import { ApiService } from '../../../shared/services/api.service';
import { ContactProfilePanel } from '../../../shared/components/contact-profile-panel/contact-profile-panel';
import Swal from 'sweetalert2';

export interface QuickReplyOption {
  text: string;
  autoReplyText: string;
  crmField?: 'leadStage' | 'readinessStatus' | 'type' | 'tags';
  crmValue?: string;
}

export interface BaseBlueprint {
  key: string;
  name: string;
  description: string;
  icon: string;
  defaultTemplateName: string;
  defaultOptions: QuickReplyOption[];
}

@Component({
  selector: 'app-create-campaign-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ContactProfilePanel],
  templateUrl: './create-campaign-view.html',
  styleUrl: './create-campaign-view.scss',
})
export class CreateCampaignView implements OnInit {
  Math = Math;
  getMathMin(a: number, b: number): number { return Math.min(a, b); }
  currentStep = 1; // 1: Campaign Details, 2: Create Message, 3: Test & Preview

  campaignName = '';
  showQuickFilters = false;

  // Mode & Blueprint Signals
  campaignMode = signal<'STANDARD' | 'CONVERSATIONAL'>('STANDARD');
  selectedBlueprintKey = signal<string>('CUSTOM');

  // Pre-defined Base Platform Blueprints
  blueprints: BaseBlueprint[] = [
    {
      key: 'LEAD_QUAL',
      name: 'Lead Qualification Flow',
      description: 'Auto-qualifies incoming prospects & maps response to Lead Stage (Qualified/Cold).',
      icon: 'fa-user-check',
      defaultTemplateName: 'lead_qualification',
      defaultOptions: [
        { text: 'Looking for B2B Wholesale', autoReplyText: 'Thanks! Our B2B representative will get in touch.', crmField: 'type', crmValue: 'B2B' },
        { text: 'Looking for Individual Tour', autoReplyText: 'Great! Check out our latest holiday packages.', crmField: 'type', crmValue: 'B2C' },
        { text: 'Just Browsing', autoReplyText: 'No problem! Let us know when you need assistance.', crmField: 'leadStage', crmValue: 'Cold' }
      ]
    },
    {
      key: 'RSVP_EVENT',
      name: 'RSVP & Booking Confirmation Flow',
      description: 'Confirms travel booking readiness & maps response to Readiness Status.',
      icon: 'fa-calendar-check',
      defaultTemplateName: 'booking_confirmation',
      defaultOptions: [
        { text: 'Confirm Booking (Yes)', autoReplyText: 'Awesome! Your slot is confirmed.', crmField: 'readinessStatus', crmValue: 'READY' },
        { text: 'Reschedule Date', autoReplyText: 'Please select your preferred new date.', crmField: 'readinessStatus', crmValue: 'NOT_READY' },
        { text: 'Cancel Inquiry', autoReplyText: 'Inquiry cancelled as requested.', crmField: 'leadStage', crmValue: 'Closed Lost' }
      ]
    },
    {
      key: 'NPS_FEEDBACK',
      name: 'NPS & Customer Feedback Flow',
      description: 'Collects rating & tags sentiment badge on customer contact profile.',
      icon: 'fa-star',
      defaultTemplateName: 'nps_feedback',
      defaultOptions: [
        { text: '⭐⭐⭐⭐⭐ Excellent (5)', autoReplyText: 'Thank you for your 5-star rating!', crmField: 'tags', crmValue: 'VIP-Promoter' },
        { text: '⭐⭐⭐ Average (3)', autoReplyText: 'Thanks for your feedback! We will improve.', crmField: 'tags', crmValue: 'Neutral-Feedback' },
        { text: '⭐ Poor (1)', autoReplyText: 'We sincerely apologize. An agent will contact you.', crmField: 'tags', crmValue: 'Urgent-Attention' }
      ]
    },
    {
      key: 'CUSTOM',
      name: 'Custom Conversational Flow',
      description: 'Define your own custom interactive buttons, bot responses, and CRM input mapping.',
      icon: 'fa-sliders',
      defaultTemplateName: '',
      defaultOptions: [
        { text: 'Interested', autoReplyText: 'Thank you for your interest!', crmField: 'leadStage', crmValue: 'Interested' },
        { text: 'Not Now', autoReplyText: 'Understood. We will keep you updated.', crmField: 'leadStage', crmValue: 'Nurture' }
      ]
    }
  ];

  // Quick Reply Options for Conversational Mode
  quickReplyOptions = signal<QuickReplyOption[]>(this.blueprints[3].defaultOptions);

  // Templates list & active selection
  templates = signal<any[]>([]);
  selectedTemplate = signal<any>(null);
  templateParams = signal<any>({});

  // Test target
  testPhoneNumber = signal('');

  // Targeting Audience Type & Group
  audienceType = signal<'ALL' | 'B2B' | 'B2C' | 'GROUP'>('ALL');
  selectedGroupId = signal<number | null>(null);

  // Data Table Search, Filter, Sort & Pagination Signals
  searchQuery = signal('');
  selectedAgentOwner = signal<string>('');
  sortColumn = signal<string>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');
  currentPage = signal(1);
  pageSize = signal(10);

  // Checkbox Row Selection
  selectedContactIds = signal<number[]>([]);

  // Profile Panel State
  isProfilePanelOpen = false;
  selectedProfileContact: any = null;

  // New Group Modal State
  showCreateGroupModal = signal(false);
  newGroupName = signal('');
  newGroupDescription = signal('');

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
        Swal.fire('Synced', 'Templates synced successfully from WhatsApp API!', 'success');
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to sync templates: ' + err.message, 'error');
      }
    });
  }

  selectTemplate(tpl: any) {
    this.selectedTemplate.set(tpl);
    const matches = tpl.templateBody?.match(/\{\{\d+\}\}/g) || [];
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

  selectBlueprint(bp: BaseBlueprint) {
    this.selectedBlueprintKey.set(bp.key);
    this.campaignMode.set(bp.key === 'CUSTOM' ? 'STANDARD' : 'CONVERSATIONAL');
    this.quickReplyOptions.set([...bp.defaultOptions]);

    const matchingTpl = this.templates().find(t => t.templateName?.toLowerCase().includes(bp.defaultTemplateName));
    if (matchingTpl) {
      this.selectTemplate(matchingTpl);
    }
  }

  addQuickReplyOption() {
    const current = this.quickReplyOptions();
    if (current.length >= 3) {
      Swal.fire('Limit Reached', 'WhatsApp allows maximum 3 quick reply buttons per message.', 'warning');
      return;
    }
    this.quickReplyOptions.set([
      ...current,
      { text: `Option ${current.length + 1}`, autoReplyText: 'Thank you!', crmField: 'leadStage', crmValue: 'Contacted' }
    ]);
  }

  removeQuickReplyOption(index: number) {
    const current = [...this.quickReplyOptions()];
    current.splice(index, 1);
    this.quickReplyOptions.set(current);
  }

  updateQuickReplyOption(index: number, field: keyof QuickReplyOption, value: any) {
    const current = [...this.quickReplyOptions()];
    current[index] = { ...current[index], [field]: value };
    this.quickReplyOptions.set(current);
  }

  getPreviewText() {
    let body = this.selectedTemplate()?.templateBody || 'Hello! Thank you for contacting Pace Travels.';
    const params = this.templateParams();
    Object.keys(params).forEach((key) => {
      const val = params[key] || `[Variable ${key}]`;
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    });
    return body;
  }

  // --- Data Table Filtering, Sorting & Pagination Computations ---

  availableAgentOwners = computed(() => {
    const set = new Set<string>();
    this.contactService.contacts().forEach(c => {
      const owners = this.contactService.getContactOwners(c);
      owners.forEach(o => set.add(o));
    });
    return Array.from(set);
  });

  filteredAudienceContacts = computed(() => {
    let list = this.contactService.contacts();
    const type = this.audienceType();
    const query = this.searchQuery().trim().toLowerCase();
    const agent = this.selectedAgentOwner().trim().toLowerCase();

    // 1. Audience Type Filter
    if (type === 'B2B') {
      list = list.filter(c => c.type === 'B2B');
    } else if (type === 'B2C') {
      list = list.filter(c => c.type === 'B2C');
    } else if (type === 'GROUP' && this.selectedGroupId()) {
      const group = this.contactService.groups().find(g => g.id === this.selectedGroupId());
      list = list.filter(c => c.type === group?.contactType);
    }

    // 2. Search Query Filter
    if (query) {
      list = list.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.agencyName && c.agencyName.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.location && c.location.toLowerCase().includes(query))
      );
    }

    // 3. Agent Owner Filter
    if (agent) {
      list = list.filter(c => {
        const owners = this.contactService.getContactOwners(c);
        return owners.some(o => o.toLowerCase().includes(agent));
      });
    }

    // 4. Sorting
    const col = this.sortColumn();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    list = [...list].sort((a: any, b: any) => {
      const valA = (a[col] || '').toString().toLowerCase();
      const valB = (b[col] || '').toString().toLowerCase();
      return valA.localeCompare(valB) * dir;
    });

    return list;
  });

  paginatedAudienceContacts = computed(() => {
    const list = this.filteredAudienceContacts();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredAudienceContacts().length / this.pageSize()) || 1;
  });

  isAllSelected = computed(() => {
    const list = this.paginatedAudienceContacts();
    return list.length > 0 && list.every(c => c.id !== undefined && this.selectedContactIds().includes(c.id));
  });

  toggleSelectAll() {
    const current = this.selectedContactIds();
    const pageList = this.paginatedAudienceContacts();
    if (this.isAllSelected()) {
      const pageIds = pageList.map(c => c.id!).filter(Boolean);
      this.selectedContactIds.set(current.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = pageList.map(c => c.id!).filter(Boolean);
      this.selectedContactIds.set(Array.from(new Set([...current, ...pageIds])));
    }
  }

  toggleSelectContact(id: number) {
    const current = this.selectedContactIds();
    if (current.includes(id)) {
      this.selectedContactIds.set(current.filter(i => i !== id));
    } else {
      this.selectedContactIds.set([...current, id]);
    }
  }

  setSortColumn(col: string) {
    if (this.sortColumn() === col) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('asc');
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(event: any) {
    this.pageSize.set(Number(event.target.value));
    this.currentPage.set(1);
  }

  // --- Data Table Group Actions ---

  createGroupFromSelected() {
    if (this.selectedContactIds().length === 0) {
      Swal.fire('No Selection', 'Please select contacts from the data table first.', 'info');
      return;
    }
    this.newGroupName.set(`Group-${Date.now().toString().slice(-4)}`);
    this.showCreateGroupModal.set(true);
  }

  confirmCreateGroup() {
    if (!this.newGroupName()) {
      Swal.fire('Error', 'Group Name is required', 'error');
      return;
    }
    this.contactService.createGroup(
      this.newGroupName(),
      this.newGroupDescription() || 'Group created from Create Campaign data table',
      this.audienceType() === 'B2B' ? 'B2B' : 'B2C',
      this.selectedContactIds()
    ).subscribe({
      next: (res: any) => {
        Swal.fire('Group Created', `Created group "${this.newGroupName()}" with ${this.selectedContactIds().length} contacts.`, 'success');
        this.contactService.fetchGroups();
        this.showCreateGroupModal.set(false);
        if (res.group?.id) {
          this.audienceType.set('GROUP');
          this.selectedGroupId.set(res.group.id);
        }
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to create group: ' + err.message, 'error');
      }
    });
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
      description: `${this.campaignMode()} Campaign (${this.selectedBlueprintKey()}): ${this.selectedTemplate().templateName}`,
      templateId: this.selectedTemplate().id,
      parameters: this.templateParams(),
      blueprintKey: this.selectedBlueprintKey(),
      type: this.campaignMode(),
      conversationalConfig: {
        mode: this.campaignMode(),
        blueprintKey: this.selectedBlueprintKey(),
        quickReplies: this.quickReplyOptions(),
        selectedContactIds: this.selectedContactIds()
      },
      targetType: this.audienceType(),
      targetGroupId: this.audienceType() === 'GROUP' ? this.selectedGroupId() : null,
      status: 'RUNNING',
      createdBy: 1
    };

    this.api.post('/campaigns/add', payload).subscribe({
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

    this.api.post('/campaigns/send-test', payload).subscribe({
      next: () => {
        Swal.fire('Test Sent', 'Test marketing message sent successfully via WhatsApp!', 'success');
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to send test: ' + (err.error?.error || err.message), 'error');
      }
    });
  }
}
