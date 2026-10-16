import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContactService, Contact } from '../../contacts/services/contact.service';
import { ApiService } from '../../../shared/services/api.service';
import { ContactProfilePanel } from '../../../shared/components/contact-profile-panel/contact-profile-panel';
import { AssetGalleryPicker } from '../components/asset-gallery-picker/asset-gallery-picker';
import { AdvisoryBadge } from '../../../shared/components/advisory-badge/advisory-badge';
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
  imports: [CommonModule, FormsModule, ContactProfilePanel, AssetGalleryPicker, AdvisoryBadge],
  templateUrl: './create-campaign-view.html',
  styleUrl: './create-campaign-view.scss',
})
export class CreateCampaignView implements OnInit {
  Math = Math;
  getMathMin(a: number, b: number): number { return Math.min(a, b); }
  currentStep = 1; // 1: Campaign Details, 2: Create Message, 3: Test & Preview

  campaignName = '';
  showQuickFilters = false;
  autoRetryEnabled = signal<boolean>(false);

  // Asset Gallery Signal
  isAssetGalleryOpen = signal(false);

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
  headerImageUrl = signal<string>(''); // Image URL for template headers

  // Test target
  testPhoneNumber = signal('');

  // Targeting Audience Type & Group
  audienceType = signal<'ALL' | 'B2B' | 'B2C' | 'GROUP'>('ALL');
  selectedGroupId = signal<number | null>(null);
  groupMemberIds = signal<number[]>([]);

  setAudienceType(type: 'ALL' | 'B2B' | 'B2C' | 'GROUP') {
    this.audienceType.set(type);
    this.currentPage.set(1);
    if (type === 'GROUP' && this.selectedGroupId()) {
      this.onGroupSelect(this.selectedGroupId());
    }
  }

  onGroupSelect(groupIdVal: any) {
    const groupId = groupIdVal ? Number(groupIdVal) : null;
    this.selectedGroupId.set(groupId);
    this.currentPage.set(1);
    if (groupId) {
      this.contactService.getGroupMembers(groupId).subscribe({
        next: (res: any) => {
          const memberIds = (res.data || []).map((m: any) => m.contactId || m.id);
          this.groupMemberIds.set(memberIds);
        },
        error: () => {
          this.groupMemberIds.set([]);
        }
      });
    } else {
      this.groupMemberIds.set([]);
    }
  }

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

  // Dynamic WABA Metrics Signal
  wabaStats = signal<{
    qualityRating: string;
    tierDisplay: string;
    remainingQuota: number;
  }>({
    qualityRating: 'High',
    tierDisplay: 'Tier 1 (1k/day)',
    remainingQuota: 1000
  });

  constructor(
    private router: Router,
    private api: ApiService,
    public contactService: ContactService
  ) {}

  ngOnInit() {
    this.contactService.fetchContacts();
    this.contactService.fetchGroups();
    this.fetchTemplates();
    this.fetchWabaStats();
  }

  fetchWabaStats() {
    const projId = localStorage.getItem('activeProjectId') || '1';
    this.api.get<any>(`projects/${projId}/waba-stats`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.wabaStats.set({
            qualityRating: res.qualityRating || 'High',
            tierDisplay: res.tierDisplay || 'Tier 1 (1k/day)',
            remainingQuota: res.remainingQuota !== undefined ? res.remainingQuota : 1000
          });
        }
      },
      error: () => {}
    });
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

  isResolvingMedia = signal<boolean>(false);

  selectTemplate(tpl: any) {
    this.selectedTemplate.set(tpl);
    const matches = tpl?.templateBody?.match(/\{\{\d+\}\}/g) || [];
    const paramsMap: any = {};
    matches.forEach((match: string) => {
      const num = match.replace(/[\{\}]/g, '');
      paramsMap[num] = '';
    });
    this.templateParams.set(paramsMap);

    // Auto-extract image URL from template if present
    let imgUrl = tpl?.headerMediaUrl || tpl?.headerUrl || '';
    if (!imgUrl && tpl?.components && Array.isArray(tpl.components)) {
      const headComp = tpl.components.find((c: any) => (c.type || '').toUpperCase() === 'HEADER');
      if (headComp && headComp.example?.header_handle?.[0]) {
        imgUrl = headComp.example.header_handle[0];
      } else if (headComp && headComp.example?.header_url?.[0]) {
        imgUrl = headComp.example.header_url[0];
      }
    }

    const isMetaReviewUrl = imgUrl && (imgUrl.includes('scontent.whatsapp.net') || imgUrl.includes('fbcdn.net') || imgUrl.includes('.whatsapp.net'));

    if (isMetaReviewUrl) {
      // Do NOT display broken temporary Meta review link in the input box!
      // Immediately auto-resolve to permanent S3 CDN URL in background
      this.isResolvingMedia.set(true);
      this.headerImageUrl.set('');

      this.api.post<any>('/messagetemplates/resolve-media', { url: imgUrl, templateId: tpl?.id }).subscribe({
        next: (res) => {
          this.isResolvingMedia.set(false);
          const resolved = res?.url || imgUrl;
          this.headerImageUrl.set(resolved);
          if (tpl) {
            tpl.headerMediaUrl = resolved;
          }
        },
        error: () => {
          this.isResolvingMedia.set(false);
          // If network failed to resolve endpoint, set URL
          this.headerImageUrl.set(imgUrl);
        }
      });
    } else {
      this.headerImageUrl.set(imgUrl);
    }
  }

  getHeaderMediaUrl(): string {
    if (this.headerImageUrl()) return this.headerImageUrl();
    const tpl = this.selectedTemplate();
    if (!tpl) return '';
    if (tpl.headerMediaUrl && !tpl.headerMediaUrl.includes('scontent.whatsapp.net') && !tpl.headerMediaUrl.includes('fbcdn.net')) {
      return tpl.headerMediaUrl;
    }
    return '';
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

  getTemplateButtons(tpl: any): any[] {
    if (!tpl) return [];
    if (Array.isArray(tpl.buttons)) return tpl.buttons;
    if (Array.isArray(tpl.components)) {
      const btnComp = tpl.components.find((c: any) => c.type === 'BUTTONS' || c.type === 'buttons');
      if (btnComp && Array.isArray(btnComp.buttons)) return btnComp.buttons;
    }
    return [];
  }

  handleImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  showOnlySelected = signal<boolean>(false);

  selectedContactsList = computed(() => {
    const ids = new Set(this.selectedContactIds());
    return this.contactService.contacts().filter(c => c.id !== undefined && ids.has(c.id));
  });

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
    const onlySelected = this.showOnlySelected();
    const selectedIds = new Set(this.selectedContactIds());

    // 0. Selected Only Filter (if toggled)
    if (onlySelected) {
      list = list.filter(c => c.id !== undefined && selectedIds.has(c.id));
    }

    // 1. Audience Type Filter
    if (type === 'B2B') {
      list = list.filter(c => c.type === 'B2B');
    } else if (type === 'B2C') {
      list = list.filter(c => c.type === 'B2C');
    } else if (type === 'GROUP') {
      if (this.selectedGroupId()) {
        const memberIds = this.groupMemberIds();
        list = list.filter(c => c.id !== undefined && memberIds.includes(c.id));
      } else {
        list = [];
      }
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

  selectedContactIdsSet = computed(() => new Set(this.selectedContactIds()));

  isContactSelected(id: number | undefined): boolean {
    if (!id) return false;
    return this.selectedContactIdsSet().has(id);
  }

  isContactBlocked(contact: any): boolean {
    if (!contact) return false;
    const now = new Date();

    // 1. Explicit Cooldown Date
    if (contact.marketingCooldownUntil && new Date(contact.marketingCooldownUntil) > now) {
      return true;
    }

    // 2. Deliverability Advisory checks
    if (contact.advisory) {
      if (contact.advisory.level === 'HARD') return true;
      if (contact.advisory.reasons && Array.isArray(contact.advisory.reasons)) {
        for (const r of contact.advisory.reasons) {
          if (r.level === 'HARD') return true;
          if (r.type === 'COOLDOWN' && r.until && new Date(r.until) > now) return true;
          if (r.type === 'FREQUENCY_CAP') return true;
          if (r.type === 'UNREACHABLE' && (r.strikes || 0) >= 2) return true;
        }
      }
    }

    // 3. Fallback delivery status checks
    if (['INVALID', 'MARKETING_OPT_OUT'].includes(contact.deliveryStatus)) return true;
    if (contact.deliveryStatus === 'COOLDOWN') {
      if (!contact.marketingCooldownUntil || new Date(contact.marketingCooldownUntil) > now) {
        return true;
      }
    }

    return false;
  }

  getContactBlockReason(contact: any): string {
    if (!contact) return '';
    const now = new Date();

    if (contact.marketingCooldownUntil && new Date(contact.marketingCooldownUntil) > now) {
      const formattedDate = new Date(contact.marketingCooldownUntil).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      return `Disabled: In Marketing Cooldown until ${formattedDate}. Excluded to protect number quality rating and prevent spam penalties.`;
    }

    if (contact.advisory?.primary) {
      const p = contact.advisory.primary;
      if (p.type === 'COOLDOWN' && p.until && new Date(p.until) > now) {
        const formattedDate = new Date(p.until).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        return `Disabled: Marketing Cooldown active until ${formattedDate}. Excluded to protect phone reputation.`;
      }
      if (p.detail) {
        return `Disabled: ${p.label || 'Deliverability block'} - ${p.detail}`;
      }
    }

    if (contact.deliveryStatus === 'INVALID') {
      return 'Disabled: Invalid phone number. Excluded to prevent delivery bounce.';
    }
    if (contact.deliveryStatus === 'MARKETING_OPT_OUT') {
      return 'Disabled: Recipient opted out of marketing. Excluded for WhatsApp policy compliance.';
    }
    if (contact.deliveryStatus === 'COOLDOWN') {
      return 'Disabled: In marketing cooldown. Excluded to protect WhatsApp quality rating.';
    }

    return 'Disabled: Excluded by deliverability advisory.';
  }

  isAllSelected = computed(() => {
    const list = this.paginatedAudienceContacts().filter(c => !this.isContactBlocked(c));
    const set = this.selectedContactIdsSet();
    return list.length > 0 && list.every(c => c.id !== undefined && set.has(c.id));
  });

  toggleSelectAll() {
    const current = this.selectedContactIds();
    const pageList = this.paginatedAudienceContacts();
    if (this.isAllSelected()) {
      const pageIds = pageList.map(c => c.id!).filter(Boolean);
      this.selectedContactIds.set(current.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = pageList
        .filter(c => !this.isContactBlocked(c))
        .map(c => c.id!)
        .filter(Boolean);
      this.selectedContactIds.set(Array.from(new Set([...current, ...pageIds])));
    }
  }

  toggleSelectContact(id: number) {
    const contact = this.contactService.contacts().find(c => c.id === id);
    if (contact && this.isContactBlocked(contact)) return;
    const current = this.selectedContactIds();
    if (current.includes(id)) {
      this.selectedContactIds.set(current.filter(i => i !== id));
    } else {
      this.selectedContactIds.set([...current, id]);
    }
  }

  selectAllFiltered() {
    const ids = this.filteredAudienceContacts()
      .filter(c => !this.isContactBlocked(c))
      .map(c => c.id!)
      .filter(Boolean);
    const set = new Set([...this.selectedContactIds(), ...ids]);
    this.selectedContactIds.set(Array.from(set));
  }

  deselectAll() {
    this.selectedContactIds.set([]);
    this.showOnlySelected.set(false);
  }

  customAudienceBatchQty = signal<number | null>(null);

  selectBatchContacts(count: number) {
    if (!count || count <= 0) return;
    const eligible = this.filteredAudienceContacts().filter(c => !this.isContactBlocked(c));
    const targetIds = eligible.slice(0, count).map(c => c.id!).filter(Boolean);
    this.selectedContactIds.set(targetIds);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Selected ${targetIds.length} contact${targetIds.length === 1 ? '' : 's'}`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  applyCustomBatchContacts() {
    const qty = this.customAudienceBatchQty();
    if (!qty || qty <= 0) {
      Swal.fire('Invalid Quantity', 'Please enter a valid number of contacts to select (e.g. 50, 100, 500).', 'warning');
      return;
    }
    this.selectBatchContacts(qty);
  }

  toggleShowOnlySelected() {
    this.showOnlySelected.set(!this.showOnlySelected());
    this.currentPage.set(1);
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
          this.onGroupSelect(res.group.id);
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

  goToStep(step: number) {
    if (step > 1) {
      if (!this.campaignName || !this.campaignName.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Campaign Name Required',
          text: 'Please enter a campaign name first.',
          confirmButtonColor: '#7c3aed'
        });
        return;
      }
      if (this.selectedContactIds().length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Select Contacts First',
          text: 'Only selected contacts will be taken to the next step. Please check at least one contact in the table.',
          confirmButtonColor: '#7c3aed'
        });
        return;
      }
    }
    if (step === 3 && !this.selectedTemplate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Template Required',
        text: 'Please select an approved WhatsApp message template in Step 2 first.',
        confirmButtonColor: '#7c3aed'
      });
      return;
    }
    this.currentStep = step;
  }

  nextStep() {
    this.goToStep(this.currentStep + 1);
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  launchCampaign() {
    if (!this.campaignName || !this.campaignName.trim()) {
      Swal.fire('Error', 'Campaign Name is required', 'error');
      return;
    }
    if (this.selectedContactIds().length === 0) {
      Swal.fire('Error', 'No contacts selected. Please return to Step 1 and select the contacts to receive this message.', 'error');
      return;
    }
    if (!this.selectedTemplate()) {
      Swal.fire('Error', 'Please select a template', 'error');
      return;
    }

    const finalParameters = { ...this.templateParams() };
    if (this.headerImageUrl().trim()) {
      finalParameters['header_image'] = this.headerImageUrl().trim();
    }

    const payload: any = {
      name: this.campaignName.trim(),
      description: `${this.campaignMode()} Campaign (${this.selectedBlueprintKey()}): ${this.selectedTemplate().templateName}`,
      templateId: this.selectedTemplate().id,
      parameters: finalParameters,
      blueprintKey: this.selectedBlueprintKey(),
      type: this.campaignMode(),
      conversationalConfig: {
        mode: this.campaignMode(),
        blueprintKey: this.selectedBlueprintKey(),
        quickReplies: this.quickReplyOptions(),
        selectedContactIds: this.selectedContactIds()
      },
      contactIds: this.selectedContactIds(),
      selectedContactIds: this.selectedContactIds(),
      targetType: this.audienceType(),
      targetGroupId: this.audienceType() === 'GROUP' ? this.selectedGroupId() : null,
      status: 'RUNNING',
      autoRetryEnabled: this.autoRetryEnabled(),
      createdBy: 1
    };

    // Deliverability pre-flight before launch targeting ONLY the selected contacts
    this.api.post<any>('/campaigns/preflight', {
      contactIds: this.selectedContactIds(),
      selectedContactIds: this.selectedContactIds(),
      targetType: payload.targetType,
      targetGroupId: payload.targetGroupId,
      templateId: payload.templateId,
    }).subscribe({
      next: async (res: any) => {
        const pre = res?.data?.willSend ? res.data : res;
        const blocked = [...(pre.hard || []), ...(pre.soft || [])];
        if (!blocked.length) return this.submitCampaign(payload);
        const overrideIds = await this.reviewDeliverability(pre);
        if (overrideIds === null) return; // cancelled
        payload.overrideContactIds = overrideIds;
        this.submitCampaign(payload);
      },
      // If pre-flight is unavailable, fall back to server-side enforcement (blocked contacts are skipped)
      error: () => this.submitCampaign(payload),
    });
  }

  private escapeHtml(s: any) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
  }

  /**
   * Step 1: show blocked contacts (unchecked by default).
   * Step 2: if any are checked, require a secondary confirmation (type OVERRIDE for hard blocks).
   * Resolves to overrideContactIds ([] = launch without them) or null (cancel).
   */
  private async reviewDeliverability(pre: any): Promise<number[] | null> {
    const hard = pre.hard || [];
    const soft = pre.soft || [];
    const canHard = !!pre.canOverrideHard;
    const row = (b: any, level: 'HARD' | 'SOFT') => {
      const r = b.advisory?.primary || {};
      const disabled = level === 'HARD' && !canHard;
      const color = level === 'HARD' ? '#b91c1c' : '#c2410c';
      const bg = level === 'HARD' ? '#fef2f2' : '#fff7ed';
      return `
        <label style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid #f1f5f9;border-radius:8px;margin-bottom:6px;text-align:left;cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? .6 : 1}">
          <input type="checkbox" class="dlv-ovr" data-level="${level}" value="${b.contactId}" ${disabled ? 'disabled' : ''} style="margin-top:3px;accent-color:#7c3aed">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px;color:#0f172a">${this.escapeHtml(b.name || 'Unknown')} <span style="font-family:monospace;font-weight:500;color:#64748b;font-size:12px">${this.escapeHtml(b.phone)}</span></div>
            <div style="display:inline-block;margin-top:3px;font-size:11px;font-weight:700;color:${color};background:${bg};padding:1px 8px;border-radius:999px">${this.escapeHtml(r.label || level)}${r.sourceProject ? ' · via ' + this.escapeHtml(r.sourceProject) : ''}</div>
            <div style="font-size:11.5px;color:#475569;margin-top:3px;line-height:1.4">${this.escapeHtml(r.detail || '')}</div>
          </div>
        </label>`;
    };

    const step1 = await Swal.fire({
      title: 'Deliverability check',
      width: 640,
      html: `
        <div style="text-align:left;font-size:13px;color:#334155;margin-bottom:10px">
          <b>${pre.total}</b> targeted → <b style="color:#15803d">${pre.willSend.length} will send</b>,
          <b style="color:#c2410c">${soft.length} soft-blocked</b>, <b style="color:#b91c1c">${hard.length} hard-blocked</b>.
          Blocked numbers are <b>left out by default</b> to protect your number's quality and avoid over-sending across the agency.
        </div>
        <div style="max-height:340px;overflow:auto;padding-right:4px">
          ${hard.length ? `<div style="text-align:left;font-size:11px;font-weight:800;color:#b91c1c;margin:6px 0">HARD BLOCKS${canHard ? '' : ' (admin only)'}</div>` + hard.map((b: any) => row(b, 'HARD')).join('') : ''}
          ${soft.length ? `<div style="text-align:left;font-size:11px;font-weight:800;color:#c2410c;margin:10px 0 6px">SOFT BLOCKS</div>` + soft.map((b: any) => row(b, 'SOFT')).join('') : ''}
        </div>`,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: `Launch without blocked (${pre.willSend.length})`,
      denyButtonText: 'Include selected…',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#7c3aed',
      denyButtonColor: '#ea580c',
      preDeny: () => {
        const ids = Array.from(document.querySelectorAll<HTMLInputElement>('.dlv-ovr:checked')).map(i => ({ id: Number(i.value), level: i.dataset['level'] }));
        if (!ids.length) { Swal.showValidationMessage('Select at least one contact to include, or launch without them.'); return false; }
        return ids;
      },
    });

    if (step1.isConfirmed) return [];
    if (!step1.isDenied) return null;

    const picked = step1.value as { id: number; level: string }[];
    const hardPicked = picked.filter(p => p.level === 'HARD').length;
    const step2 = await Swal.fire({
      icon: 'warning',
      title: 'Confirm override',
      html: `<div style="font-size:13px;color:#334155;text-align:left">
        You are about to send to <b>${picked.length}</b> contact(s) flagged by deliverability advisories
        ${hardPicked ? `, including <b style="color:#b91c1c">${hardPicked} hard-blocked</b> number(s)` : ''}.
        Repeated sends to fatigued or invalid numbers can lower your WhatsApp quality rating and messaging limit.
        This override will be recorded against your user.
        ${hardPicked ? '<br><br>Type <b>OVERRIDE</b> to confirm.' : ''}</div>`,
      input: hardPicked ? 'text' : undefined,
      inputPlaceholder: 'OVERRIDE',
      showCancelButton: true,
      confirmButtonText: 'Yes, include them',
      confirmButtonColor: '#dc2626',
      preConfirm: (val: string) => {
        if (hardPicked && String(val || '').trim().toUpperCase() !== 'OVERRIDE') {
          Swal.showValidationMessage('Type OVERRIDE to confirm');
          return false;
        }
        return true;
      },
    });
    return step2.isConfirmed ? picked.map(p => p.id) : null;
  }

  private submitCampaign(payload: any) {
    this.api.post('/campaigns/add', payload).subscribe({
      next: () => {
        const n = (payload.overrideContactIds || []).length;
        const count = this.selectedContactIds().length;
        Swal.fire({
          icon: 'success',
          title: 'Campaign Launched!',
          text: `Your WhatsApp template message is being sent to ${count} selected contact${count > 1 ? 's' : ''}!${n ? ` (${n} override${n > 1 ? 's' : ''} recorded)` : ''}`,
          confirmButtonColor: '#7c3aed'
        }).then(() => {
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

    const finalParameters = { ...this.templateParams() };
    if (this.headerImageUrl().trim()) {
      finalParameters['header_image'] = this.headerImageUrl().trim();
    }

    const payload = {
      templateId: this.selectedTemplate().id,
      phone: this.testPhoneNumber(),
      parameters: finalParameters
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
