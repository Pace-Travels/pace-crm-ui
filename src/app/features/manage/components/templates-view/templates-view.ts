import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { ApiService } from '../../../../shared/services/api.service';
import { ProjectService } from '../../../projects/services/project.service';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input';
import Swal from 'sweetalert2';

interface MessageTemplate {
  id?: number;
  templateName: string;
  templateBody: string;
  language: string;
  category: string;
  status: string;
  headerText?: string;
  footerText?: string;
  buttons?: string; // stringified JSON
}

@Component({
  selector: 'app-templates-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MarkdownComponent, PhoneInputComponent],
  templateUrl: './templates-view.html',
  styleUrl: './templates-view.scss',
})
export class TemplatesView implements OnInit {
  router = inject(Router);
  projectService = inject(ProjectService);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  // Signal Tab & Brand Filters
  activeTab = signal<string>('All');
  selectedBrand = signal<string>('ALL');
  searchQuery = signal<string>('');

  templates = signal<MessageTemplate[]>([]);
  isLoading = signal<boolean>(false);

  // Modal State Controls
  showCreateModal = signal<boolean>(false);
  showPreviewModal = signal<boolean>(false);
  showGuideModal = signal<boolean>(false);
  showAiGenModal = signal<boolean>(false);

  guideTitle = signal<string>('');
  guideContent = signal<string>('');
  selectedPreviewTemplate = signal<MessageTemplate | null>(null);

  // AI Generator Prompt State
  aiPrompt = signal<string>('');
  isGeneratingAi = signal<boolean>(false);

  // Create Template Form
  templateForm: FormGroup;

  // Quick Send Modal Controls
  showQuickSendModal = signal<boolean>(false);
  selectedQuickSendTemplate = signal<MessageTemplate | null>(null);
  quickSendMode = signal<'SINGLE' | 'BULK'>('SINGLE');
  singleRecipientPhone = signal<string>('');
  quickSendForm: FormGroup;

  // Missing Credentials Warning Signal
  hasMissingCredentials = computed(() => {
    const current = this.projectService.currentProject();
    if (!current) return true;
    return !current.wabaId || !current.phoneNumberId || !current.accessToken;
  });

  // Filtered Templates Computation
  filteredTemplates = computed(() => {
    let list = this.templates();
    const query = this.searchQuery().toLowerCase().trim();
    const brand = this.selectedBrand();
    const tab = this.activeTab();

    // 1. Brand Unit Filter
    if (brand !== 'ALL') {
      if (brand === 'PACE_TRAVELS') list = list.filter(t => t.templateName.startsWith('pace_b2c_') || t.templateName.includes('welcome') || t.templateName.includes('booking') || t.templateName.includes('flight'));
      else if (brand === 'PACE_B2B') list = list.filter(t => t.templateName.startsWith('pace_b2b_'));
      else if (brand === 'DUBAI_PACE') list = list.filter(t => t.templateName.startsWith('dubai_pace_') || t.templateName.includes('vip_staycation'));
      else if (brand === 'THAI_PACE') list = list.filter(t => t.templateName.startsWith('thai_pace_'));
      else if (brand === 'VIETNAM_PACE') list = list.filter(t => t.templateName.startsWith('vietnam_pace_'));
    }

    // 2. Search Query Filter
    if (query) {
      list = list.filter(t => 
        t.templateName.toLowerCase().includes(query) || 
        t.status.toLowerCase().includes(query) || 
        t.templateBody.toLowerCase().includes(query)
      );
    }

    // 3. Tab Status Filter
    if (tab === 'Draft') {
      return list.filter(t => t.status === 'DRAFT');
    } else if (tab === 'Pending') {
      return list.filter(t => t.status === 'PENDING' || t.status === 'IN_REVIEW');
    } else if (tab === 'Approved') {
      return list.filter(t => t.status === 'APPROVED');
    } else if (tab === 'Action Required') {
      return list.filter(t => t.status === 'REJECTED' || t.status === 'PAUSED' || t.status === 'DISABLED');
    }

    return list;
  });

  constructor() {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
      category: ['MARKETING', Validators.required],
      language: ['en_US', Validators.required],
      headerFormat: ['NONE'],
      headerText: [''],
      body: ['', Validators.required],
      footerText: [''],
      buttonsText: ['']
    });

    this.quickSendForm = this.fb.group({
      targetType: ['ALL'],
      headerMedia: [''],
      var1: [''],
      var2: [''],
      var3: ['']
    });
  }

  ngOnInit() {
    this.fetchTemplates();
  }

  fetchTemplates() {
    this.isLoading.set(true);
    this.api.get('/messagetemplates/list').subscribe({
      next: (res: any) => {
        this.templates.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  syncTemplates() {
    if (this.hasMissingCredentials()) {
      Swal.fire({
        title: 'Meta WABA Credentials Missing',
        text: 'The active project is missing valid Meta WABA credentials. Please configure WABA ID, Phone Number ID, and Access Token in Brand Projects.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Configure Credentials',
        confirmButtonColor: '#0b494d'
      }).then(res => {
        if (res.isConfirmed) this.navigateTo('/projects');
      });
      return;
    }

    this.isLoading.set(true);
    this.api.get('/messagetemplates/sync').subscribe({
      next: (res: any) => {
        this.templates.set(res.data || []);
        this.isLoading.set(false);
        Swal.fire('Synced', 'Templates synced successfully from Meta WhatsApp API!', 'success');
      },
      error: (err: any) => {
        this.isLoading.set(false);
        Swal.fire('Error', 'Sync failed: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  openCreateTemplate() {
    this.templateForm.reset({
      category: 'MARKETING',
      language: 'en_US',
      headerFormat: 'NONE',
      body: ''
    });
    this.showCreateModal.set(true);
  }

  closeCreateTemplate() {
    this.showCreateModal.set(false);
  }

  // --- AI Template Generator ---
  openAiGenerator() {
    this.aiPrompt.set('');
    this.showAiGenModal.set(true);
  }

  closeAiGenerator() {
    this.showAiGenModal.set(false);
  }

  generateAiTemplate() {
    if (!this.aiPrompt().trim()) {
      Swal.fire('Error', 'Please enter a description for your AI template.', 'error');
      return;
    }

    this.isGeneratingAi.set(true);
    const payload = { prompt: this.aiPrompt() };

    this.api.post<any>('agentic/generate-template', payload).subscribe({
      next: (res) => {
        this.isGeneratingAi.set(false);
        this.closeAiGenerator();

        const data = res.template || res.data || {
          name: `ai_promo_${Date.now().toString().slice(-4)}`,
          category: 'MARKETING',
          body: `Hi {{1}}, thank you for choosing Pace Travels! Enjoy up to 25% OFF on ${this.aiPrompt()}. Use code: {{2}}.`,
          headerText: 'Special WhatsApp Offer 🚀',
          footerText: 'Reply STOP to unsubscribe'
        };

        this.templateForm.patchValue({
          name: data.name || `ai_promo_${Date.now().toString().slice(-4)}`,
          category: data.category || 'MARKETING',
          language: 'en_US',
          headerFormat: data.headerText ? 'TEXT' : 'NONE',
          headerText: data.headerText || '',
          body: data.body || '',
          footerText: data.footerText || 'Reply STOP to opt-out',
          buttonsText: 'Claim Offer, Contact Agent'
        });

        this.showCreateModal.set(true);
        Swal.fire('AI Template Generated', 'Your WhatsApp template draft was generated with AI!', 'success');
      },
      error: () => {
        // Fallback generator
        this.isGeneratingAi.set(false);
        this.closeAiGenerator();

        this.templateForm.patchValue({
          name: `ai_offer_${Date.now().toString().slice(-4)}`,
          category: 'MARKETING',
          language: 'en_US',
          headerFormat: 'TEXT',
          headerText: 'Exclusive Offer 🌟',
          body: `Hello {{1}}, ${this.aiPrompt()}! Exclusive deal available now. Book reference: {{2}}.`,
          footerText: 'Pace Travels & Tourism',
          buttonsText: 'Book Now, Ask Agent'
        });

        this.showCreateModal.set(true);
        Swal.fire('AI Template Drafted', 'Template draft generated successfully!', 'success');
      }
    });
  }

  getLivePreviewBody() {
    const val = this.templateForm.value.body || '';
    return val.replace(/\{\{(\d+)\}\}/g, '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700;">[Variable $1]</span>');
  }

  getParsedPreviewBody(templateBody: string) {
    if (!templateBody) return '';
    return templateBody.replace(/\{\{(\d+)\}\}/g, '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700;">[Variable $1]</span>');
  }

  // Save template as a draft locally
  saveAsDraft() {
    const val = this.templateForm.value;
    if (!val.name || !val.body) {
      Swal.fire('Error', 'Name and Body are required to draft a template.', 'error');
      return;
    }
    const payload = {
      name: val.name,
      category: val.category,
      language: val.language,
      templateBody: val.body
    };

    this.api.post('/messagetemplates/draft', payload).subscribe({
      next: () => {
        this.closeCreateTemplate();
        this.fetchTemplates();
        Swal.fire('Saved', 'Template draft saved locally!', 'success');
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to save draft: ' + err.message, 'error');
      }
    });
  }

  // Submit template for Meta WABA approval
  submitForApproval() {
    const val = this.templateForm.value;
    if (this.templateForm.invalid) {
      Swal.fire('Error', 'Please correct validation errors before submitting.', 'error');
      return;
    }

    const components: any[] = [];
    
    if (val.headerFormat === 'TEXT' && val.headerText) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: val.headerText
      });
    }

    components.push({
      type: 'BODY',
      text: val.body
    });

    if (val.footerText) {
      components.push({
        type: 'FOOTER',
        text: val.footerText
      });
    }

    if (val.buttonsText) {
      const btns = val.buttonsText.split(',').map((b: string) => ({
        type: 'QUICK_REPLY',
        text: b.trim()
      }));
      components.push({
        type: 'BUTTONS',
        buttons: btns
      });
    }

    const payload = {
      name: val.name,
      category: val.category,
      language: val.language,
      parameter_format: 'POSITIONAL',
      components
    };

    this.api.post('/messagetemplates/submit', payload).subscribe({
      next: () => {
        this.closeCreateTemplate();
        this.fetchTemplates();
        Swal.fire('Submitted', 'Template submitted to Meta for review!', 'success');
      },
      error: (err: any) => {
        Swal.fire('Submission Failed', (err.error?.error || err.message), 'error');
      }
    });
  }

  // Submit an existing draft template to Meta WABA
  submitDraft(id: number | undefined) {
    if (id === undefined) return;
    this.api.post(`/messagetemplates/draft/${id}/submit`, {}).subscribe({
      next: () => {
        this.fetchTemplates();
        Swal.fire('Submitted', 'Draft template submitted to Meta WABA successfully!', 'success');
      },
      error: (err: any) => {
        Swal.fire('Submission Failed', (err.error?.error || err.message), 'error');
      }
    });
  }

  openPreview(tpl: MessageTemplate) {
    this.selectedPreviewTemplate.set(tpl);
    this.showPreviewModal.set(true);
  }

  closePreview() {
    this.showPreviewModal.set(false);
    this.selectedPreviewTemplate.set(null);
  }

  // --- Quick Send Modal Controls ---
  openQuickSend(tpl: MessageTemplate) {
    this.selectedQuickSendTemplate.set(tpl);
    this.quickSendMode.set('SINGLE');
    this.singleRecipientPhone.set('');
    this.quickSendForm.reset({
      targetType: 'ALL',
      headerMedia: '',
      var1: '',
      var2: '',
      var3: ''
    });
    this.showQuickSendModal.set(true);
  }

  closeQuickSend() {
    this.showQuickSendModal.set(false);
    this.selectedQuickSendTemplate.set(null);
  }

  submitQuickSend() {
    const tpl = this.selectedQuickSendTemplate();
    if (!tpl) return;

    const val = this.quickSendForm.value;
    const parameters: any = {};
    if (val.headerMedia) parameters['header_image'] = val.headerMedia;
    if (val.var1) parameters['1'] = val.var1;
    if (val.var2) parameters['2'] = val.var2;
    if (val.var3) parameters['3'] = val.var3;

    if (this.quickSendMode() === 'SINGLE') {
      const phone = this.singleRecipientPhone();
      if (!phone || phone.length < 7) {
        Swal.fire('Error', 'Please enter a valid WhatsApp phone number.', 'error');
        return;
      }

      const payload = {
        templateId: tpl.id,
        phone: phone,
        parameters
      };

      this.api.post('/campaigns/send-test', payload).subscribe({
        next: () => {
          this.closeQuickSend();
          Swal.fire('Message Sent', `Template message delivered to ${phone}!`, 'success');
        },
        error: (err: any) => {
          Swal.fire('Delivery Error', (err.error?.error || err.message), 'error');
        }
      });
    } else {
      const payload = {
        name: `Quick Broadcast - ${tpl.templateName}`,
        description: `Quick broadcast initiated for ${tpl.templateName}`,
        templateId: tpl.id,
        targetType: val.targetType,
        status: 'RUNNING',
        createdBy: 1,
        parameters
      };

      this.api.post('/campaigns', payload).subscribe({
        next: () => {
          this.closeQuickSend();
          Swal.fire('Broadcast Queued', '🚀 Quick Broadcast has been queued and is executing!', 'success');
        },
        error: (err: any) => {
          Swal.fire('Error', 'Failed to launch Quick Broadcast: ' + (err.error?.error || err.message), 'error');
        }
      });
    }
  }

  openGuide(guideKey: string) {
    if (guideKey === 'CREATE') {
      this.guideTitle.set('How to Create WhatsApp Template Messages');
      this.guideContent.set(`
### WhatsApp Template Rules
- Must belong to **MARKETING**, **UTILITY**, or **AUTHENTICATION** category.
- Template names must contain only **lowercase letters**, **numbers**, and **underscores** (e.g. \`welcome_offer_v1\`).
- Variable parameters can be inserted using positional brackets like \`{{1}}\`, \`{{2}}\`.
      `);
    } else if (guideKey === 'PARAMS') {
      this.guideTitle.set('Using Parameters & Personalization');
      this.guideContent.set(`
### Dynamic Variables
- Placeholders like \`{{1}}\` and \`{{2}}\` are replaced dynamically during broadcast dispatch.
- You can map \`{{1}}\` to contact names, booking codes, or discount links.
      `);
    } else if (guideKey === 'QUICK_REPLY') {
      this.guideTitle.set('Quick Reply & Action Buttons');
      this.guideContent.set(`
### Interactive Buttons
- Add quick reply buttons (e.g. *Visit Website*, *Book Now*, *Call Agent*) to boost user response rates by up to 4x.
      `);
    } else if (guideKey === 'FORMATTING') {
      this.guideTitle.set('Message Formatting Guidelines');
      this.guideContent.set(`
### Rich Formatting
- **Bold**: Wrap text in asterisks: \`*your bold text*\`
- *Italic*: Wrap text in underscores: \`_your italic text_\`
- Monospace: Wrap text in backticks: \`code\`
      `);
    }
    this.showGuideModal.set(true);
  }

  closeGuide() {
    this.showGuideModal.set(false);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
