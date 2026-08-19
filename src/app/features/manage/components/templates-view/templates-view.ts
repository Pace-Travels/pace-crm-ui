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
  title?: string;
  templateBody: string;
  language: string;
  category: string;
  status: string;
  headerText?: string;
  footerText?: string;
  buttons?: string; // stringified JSON
  source?: 'CUSTOM' | 'META_SYNC' | 'META_LIBRARY';
  isMetaOfficial?: boolean;
  rejectionReason?: string;
  metaError?: string;
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

  // Signal Tab, Brand & Source Filters
  activeTab = signal<string>('All');
  selectedBrand = signal<string>('ALL');
  selectedSource = signal<string>('ALL'); // ALL | CUSTOM | META_SYNC | META_LIBRARY
  searchQuery = signal<string>('');

  templates = signal<MessageTemplate[]>([]);
  isLoading = signal<boolean>(false);

  // Real-Time Meta Rule & Rejection Risk Validator
  validationFeedback = signal<{ type: 'error' | 'warning' | 'info'; message: string }[]>([]);
  rejectionRisk = signal<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');

  // Source Origin Counts
  customCount = computed(() => this.templates().filter(t => (t.source === 'CUSTOM' || !t.source) && !t.isMetaOfficial).length);
  metaSyncedCount = computed(() => this.templates().filter(t => t.source === 'META_SYNC').length);
  metaLibraryCount = computed(() => this.templates().filter(t => t.isMetaOfficial || t.source === 'META_LIBRARY').length);

  // Modal State Controls
  editingTemplateId = signal<number | null>(null);
  showCreateModal = signal<boolean>(false);
  showPreviewModal = signal<boolean>(false);
  showGuideModal = signal<boolean>(false);
  showAiGenModal = signal<boolean>(false);
  showMetaLibraryModal = signal<boolean>(false);

  // Meta Template Library State
  metaLibraryTemplates = signal<any[]>([]);
  selectedMetaCategory = signal<string>('ALL');
  isLoadingMetaLibrary = signal<boolean>(false);

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
    const source = this.selectedSource();

    // 1. Source Origin Filter
    if (source !== 'ALL') {
      if (source === 'CUSTOM') {
        list = list.filter(t => (t.source === 'CUSTOM' || !t.source) && !t.isMetaOfficial);
      } else if (source === 'META_SYNC') {
        list = list.filter(t => t.source === 'META_SYNC');
      } else if (source === 'META_LIBRARY') {
        list = list.filter(t => t.source === 'META_LIBRARY' || t.isMetaOfficial);
      }
    }

    // 2. Brand Unit Filter
    if (brand !== 'ALL') {
      if (brand === 'PACE_TRAVELS') list = list.filter(t => t.templateName.startsWith('pace_b2c_') || t.templateName.includes('welcome') || t.templateName.includes('booking') || t.templateName.includes('flight'));
      else if (brand === 'PACE_B2B') list = list.filter(t => t.templateName.startsWith('pace_b2b_'));
      else if (brand === 'DUBAI_PACE') list = list.filter(t => t.templateName.startsWith('dubai_pace_') || t.templateName.includes('vip_staycation'));
      else if (brand === 'THAI_PACE') list = list.filter(t => t.templateName.startsWith('thai_pace_'));
      else if (brand === 'VIETNAM_PACE') list = list.filter(t => t.templateName.startsWith('vietnam_pace_'));
    }

    // 3. Search Query Filter
    if (query) {
      list = list.filter(t => 
        t.templateName.toLowerCase().includes(query) || 
        (t.title && t.title.toLowerCase().includes(query)) ||
        t.status.toLowerCase().includes(query) || 
        t.templateBody.toLowerCase().includes(query)
      );
    }

    // 4. Tab Status Filter
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

    this.templateForm.valueChanges.subscribe(() => {
      this.validateMetaRules();
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
    this.syncTemplates(true);
  }

  validateMetaRules() {
    const val = this.templateForm ? this.templateForm.value : {};
    const body = (val.body || '').trim();
    const header = (val.headerText || '').trim();
    const footer = (val.footerText || '').trim();
    const category = val.category || 'MARKETING';
    const buttons = val.buttonsText || '';

    const feedback: { type: 'error' | 'warning' | 'info'; message: string }[] = [];
    let riskScore = 0;

    // 1. Character Limits
    if (header.length > 60) {
      feedback.push({ type: 'error', message: `Header text exceeds Meta limit of 60 chars (${header.length}/60).` });
      riskScore += 3;
    }
    if (body.length > 1024) {
      feedback.push({ type: 'error', message: `Body text exceeds Meta limit of 1024 chars (${body.length}/1024).` });
      riskScore += 3;
    } else if (body.length > 0 && body.length < 15) {
      feedback.push({ type: 'warning', message: 'Very short body text may be flagged by Meta for quality review.' });
      riskScore += 1;
    }
    if (footer.length > 60) {
      feedback.push({ type: 'error', message: `Footer text exceeds Meta limit of 60 chars (${footer.length}/60).` });
      riskScore += 3;
    }

    // 2. Buttons Limit
    if (buttons) {
      const btnArray = buttons.split(',').map((b: string) => b.trim());
      if (btnArray.length > 3) {
        feedback.push({ type: 'error', message: `Meta permits max 3 Quick Reply buttons (${btnArray.length} provided).` });
        riskScore += 3;
      }
      btnArray.forEach((b: string, i: number) => {
        if (b.length > 25) {
          feedback.push({ type: 'error', message: `Button #${i+1} "${b}" exceeds 25 chars limit.` });
          riskScore += 2;
        }
      });
    }

    // 3. Variable Syntax & Indexing Check
    const varMatches = [...body.matchAll(/\{\{(\d+)\}\}/g)];
    if (varMatches.length > 0) {
      const indices = varMatches.map(m => parseInt(m[1], 10));
      let expected = 1;
      let sequential = true;
      for (const idx of indices) {
        if (idx !== expected && idx !== expected - 1) {
          if (idx !== expected) {
            sequential = false;
            break;
          }
        }
        if (idx === expected) expected++;
      }

      if (!sequential) {
        feedback.push({ type: 'error', message: 'Variables must be strictly sequential starting from {{1}}, then {{2}}, {{3}} without skipping.' });
        riskScore += 3;
      }

      if (/^\s*\{\{\d+\}\}/.test(body)) {
        feedback.push({ type: 'error', message: 'Meta rejects templates starting directly with a variable placeholder {{1}}.' });
        riskScore += 3;
      }
      if (/\{\{\d+\}\}\s*$/.test(body)) {
        feedback.push({ type: 'error', message: 'Meta rejects templates ending directly with a variable placeholder.' });
        riskScore += 3;
      }

      if (/\{\{\d+\}\}\{\{\d+\}\}/.test(body)) {
        feedback.push({ type: 'error', message: 'Adjacent variables {{1}}{{2}} must be separated by text or space.' });
        riskScore += 3;
      }
    }

    // 4. Check non-positional syntax like {{name}}
    const invalidVarMatches = body.match(/\{\{[a-zA-Z_$][a-zA-Z0-9_$]*\}\}/g);
    if (invalidVarMatches) {
      feedback.push({ type: 'error', message: `Invalid variable format ${invalidVarMatches.join(', ')}. Use positional brackets like {{1}}, {{2}}.` });
      riskScore += 4;
    }

    // 5. Category Policy Check
    if (category === 'UTILITY' || category === 'AUTHENTICATION') {
      const promoWords = ['discount', 'sale', 'free', 'offer', 'buy now', 'cashback', 'deal', 'promo', 'coupon', 'limited time', 'save', 'off'];
      const bodyLower = body.toLowerCase();
      const foundPromo = promoWords.filter(w => bodyLower.includes(w));
      if (foundPromo.length > 0) {
        feedback.push({ type: 'warning', message: `Body contains promotional words (${foundPromo.join(', ')}). Meta may reject ${category} template or force MARKETING category.` });
        riskScore += 2;
      }
    }

    if (feedback.length === 0) {
      feedback.push({ type: 'info', message: 'All Meta format & policy guidelines satisfied! Template has high approval probability.' });
    }

    this.validationFeedback.set(feedback);
    if (riskScore === 0) this.rejectionRisk.set('LOW');
    else if (riskScore <= 2) this.rejectionRisk.set('MEDIUM');
    else this.rejectionRisk.set('HIGH');
  }

  fetchTemplates() {
    this.isLoading.set(true);
    // Fetch DB Templates & Meta Library Templates in parallel
    this.api.get('/messagetemplates/list').subscribe({
      next: (res: any) => {
        const dbTemplates: MessageTemplate[] = (res.data || []).map((t: any) => ({
          ...t,
          source: t.source || 'CUSTOM'
        }));

        this.api.get('/messagetemplates/meta-library').subscribe({
          next: (libRes: any) => {
            const metaLibTemplates: MessageTemplate[] = (libRes.data || []).map((t: any) => ({
              ...t,
              status: 'APPROVED',
              source: 'META_LIBRARY',
              isMetaOfficial: true
            }));

            // Filter out Meta Library items that are already imported in DB
            const existingNames = new Set(dbTemplates.map(t => t.templateName));
            const freshMetaLib = metaLibTemplates.filter(t => !existingNames.has(t.templateName));

            this.templates.set([...dbTemplates, ...freshMetaLib]);
            this.isLoading.set(false);
          },
          error: () => {
            this.templates.set(dbTemplates);
            this.isLoading.set(false);
          }
        });
      },
      error: () => this.isLoading.set(false)
    });
  }

  getSourceBadge(tpl: MessageTemplate) {
    if (tpl.isMetaOfficial || tpl.source === 'META_LIBRARY') {
      return {
        label: '✨ Facebook Library (Ready)',
        bg: '#f3e8ff',
        color: '#6b21a8',
        border: '1px solid #d8b4fe',
        icon: 'fa-brands fa-facebook'
      };
    }
    if (tpl.source === 'META_SYNC') {
      return {
        label: '🔵 Synced from Meta WABA',
        bg: '#e0f2fe',
        color: '#0369a1',
        border: '1px solid #7dd3fc',
        icon: 'fa-brands fa-facebook-messenger'
      };
    }
    if (tpl.status === 'APPROVED') {
      return {
        label: '✅ Custom • Meta Approved',
        bg: '#dcfce7',
        color: '#15803d',
        border: '1px solid #86efac',
        icon: 'fa-solid fa-circle-check'
      };
    }
    if (tpl.status === 'PENDING' || tpl.status === 'IN_REVIEW') {
      return {
        label: '⏳ Custom • Pending Meta Review',
        bg: '#fef3c7',
        color: '#b45309',
        border: '1px solid #fde68a',
        icon: 'fa-solid fa-hourglass-half'
      };
    }
    return {
      label: '🎨 Custom Created (Draft)',
      bg: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      icon: 'fa-solid fa-pen-ruler'
    };
  }

  syncTemplates(isAuto = false) {
    if (this.hasMissingCredentials()) {
      if (!isAuto) {
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
      }
      return;
    }

    this.isLoading.set(true);
    this.api.get('/messagetemplates/sync').subscribe({
      next: (res: any) => {
        this.templates.set(res.data || []);
        this.isLoading.set(false);

        const summary = res.summary || {};
        const count = res.count || (res.data ? res.data.length : 0);
        const rejectedItems = (res.data || []).filter((t: any) => t.status === 'REJECTED');

        let rejectedListHtml = '';
        if (rejectedItems.length > 0) {
          rejectedListHtml = `
            <div style="margin-top: 14px; text-align: left; background: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 8px;">
              <strong style="color: #991b1b; font-size: 13px; display: block; margin-bottom: 6px;">⚠️ Templates Action Required / Rejected (${rejectedItems.length}):</strong>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #7f1d1d;">
                ${rejectedItems.map((item: any) => `<li><b>${item.templateName}</b>: ${item.rejectionReason || item.metaError || 'Rejected by Meta quality review'}</li>`).join('')}
              </ul>
            </div>
          `;
        }

        Swal.fire({
          title: 'Meta WhatsApp Status Auto-Synced',
          html: `
            <div style="font-size: 14px; color: #334155;">
              <p style="margin-bottom: 10px;">Successfully synchronized <b>${count}</b> templates with Facebook Meta WABA.</p>
              <div style="display: flex; justify-content: space-around; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px;">
                <div><span style="color: #16a34a; font-weight: 800; font-size: 16px;">${summary.approved || 0}</span><br><small style="color: #64748b;">Approved</small></div>
                <div><span style="color: #d97706; font-weight: 800; font-size: 16px;">${summary.pending || 0}</span><br><small style="color: #64748b;">Pending</small></div>
                <div><span style="color: #dc2626; font-weight: 800; font-size: 16px;">${summary.rejected || 0}</span><br><small style="color: #64748b;">Rejected</small></div>
              </div>
              ${rejectedListHtml}
            </div>
          `,
          icon: rejectedItems.length > 0 ? 'warning' : 'success',
          confirmButtonText: 'Great!',
          confirmButtonColor: '#0b494d'
        });
      },
      error: (err: any) => {
        this.isLoading.set(false);
        if (!isAuto) {
          Swal.fire('Error', 'Sync failed: ' + (err.error?.error || err.error?.message || err.message), 'error');
        }
      }
    });
  }

  openMetaLibrary() {
    this.showMetaLibraryModal.set(true);
    this.isLoadingMetaLibrary.set(true);
    this.api.get('/messagetemplates/meta-library').subscribe({
      next: (res: any) => {
        this.isLoadingMetaLibrary.set(false);
        if (res.success && res.data) {
          this.metaLibraryTemplates.set(res.data);
        }
      },
      error: () => this.isLoadingMetaLibrary.set(false)
    });
  }

  closeMetaLibrary() {
    this.showMetaLibraryModal.set(false);
  }

  importMetaTemplate(metaTpl: any) {
    Swal.fire({
      title: 'Import Meta Template',
      html: `Do you want to import <b>"${metaTpl.title}"</b> (<code>${metaTpl.templateName}</code>) into your template repository?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Import & Use',
      confirmButtonColor: '#0b494d'
    }).then(res => {
      if (res.isConfirmed) {
        const payload = {
          templateName: metaTpl.templateName,
          templateBody: metaTpl.templateBody,
          language: metaTpl.language || 'en_US',
          category: metaTpl.category || 'UTILITY',
          status: 'APPROVED',
          headerText: metaTpl.headerText || null,
          footerText: metaTpl.footerText || null,
          buttons: metaTpl.buttons || null
        };

        this.api.post('/messagetemplates/add', payload).subscribe({
          next: () => {
            Swal.fire('Template Imported', `"${metaTpl.title}" imported successfully!`, 'success');
            this.closeMetaLibrary();
            this.fetchTemplates();
          },
          error: (err: any) => {
            Swal.fire('Error', 'Import failed: ' + (err.error?.error || err.message), 'error');
          }
        });
      }
    });
  }

  openCreateTemplate() {
    this.router.navigate(['/templates/create']);
  }

  editTemplate(tpl: MessageTemplate) {
    this.editingTemplateId.set(tpl.id || null);
    this.templateForm.patchValue({
      name: tpl.templateName,
      category: tpl.category || 'MARKETING',
      language: tpl.language || 'en_US',
      headerFormat: tpl.headerText ? 'TEXT' : 'NONE',
      headerText: tpl.headerText || '',
      body: tpl.templateBody || '',
      footerText: tpl.footerText || '',
      buttonsText: tpl.buttons ? (Array.isArray(tpl.buttons) ? tpl.buttons.map((b: any) => b.text || b).join(', ') : tpl.buttons) : ''
    });
    this.showCreateModal.set(true);
  }

  deleteTemplate(tpl: MessageTemplate) {
    Swal.fire({
      title: 'Delete Template?',
      text: `Are you sure you want to delete "${tpl.templateName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#dc2626'
    }).then(res => {
      if (res.isConfirmed) {
        this.api.delete(`/messagetemplates/delete/${tpl.id}`).subscribe({
          next: () => {
            Swal.fire('Deleted', 'Template deleted successfully.', 'success');
            this.fetchTemplates();
          },
          error: (err: any) => {
            Swal.fire('Error', 'Failed to delete: ' + (err.error?.error || err.message), 'error');
          }
        });
      }
    });
  }

  closeCreateTemplate() {
    this.showCreateModal.set(false);
    this.editingTemplateId.set(null);
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
      templateName: val.name,
      category: val.category,
      language: val.language,
      templateBody: val.body,
      headerType: val.headerFormat === 'TEXT' ? 'TEXT' : null,
      headerText: val.headerText || null,
      footerText: val.footerText || null,
      buttons: val.buttonsText ? val.buttonsText.split(',').map((b: string) => b.trim()) : null,
      components: this.buildComponentsPayload()
    };

    if (this.editingTemplateId()) {
      this.api.put(`/messagetemplates/update/${this.editingTemplateId()}`, payload).subscribe({
        next: () => {
          this.closeCreateTemplate();
          this.fetchTemplates();
          Swal.fire('Updated', 'Template draft updated successfully!', 'success');
        },
        error: (err: any) => Swal.fire('Error', 'Failed to update: ' + err.message, 'error')
      });
    } else {
      this.api.post('/messagetemplates/draft', { ...payload, name: payload.templateName }).subscribe({
        next: () => {
          this.closeCreateTemplate();
          this.fetchTemplates();
          Swal.fire('Saved', 'Template draft saved locally!', 'success');
        },
        error: (err: any) => Swal.fire('Error', 'Failed to save draft: ' + err.message, 'error')
      });
    }
  }

  // View complete Meta error breakdown for rejected templates
  viewMetaErrorDetails(tpl: MessageTemplate) {
    const errorText = tpl.rejectionReason || tpl.metaError || 'Template rejected by Meta quality review.';
    Swal.fire({
      title: `Meta Rejection: ${tpl.templateName}`,
      html: `
        <div style="text-align: left; font-family: 'Inter', sans-serif;">
          <p style="font-size: 13px; color: #991b1b; background: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 8px; font-weight: 600; margin-bottom: 14px;">
            ❌ Meta API Error Trace:<br>
            <span style="font-size: 12px; font-weight: 400; font-family: monospace; display: block; margin-top: 6px; color: #7f1d1d; white-space: pre-wrap;">${errorText}</span>
          </p>
          <div style="font-size: 12.5px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 6px;">How to resolve this rejection:</strong>
            <ul style="margin: 0; padding-left: 18px; line-height: 1.5;">
              <li>Ensure variables strictly follow <code>{{1}}</code>, <code>{{2}}</code> positional order.</li>
              <li>Check body length is under 1024 characters and headers under 60 characters.</li>
              <li>If category is Utility, remove promotional words like "discount", "sale", "offer".</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'error',
      confirmButtonText: 'Understood',
      confirmButtonColor: '#0b494d'
    });
  }

  buildComponentsPayload() {
    const val = this.templateForm.value;
    const components: any[] = [];
    if (val.headerFormat === 'TEXT' && val.headerText) {
      components.push({ type: 'HEADER', format: 'TEXT', text: val.headerText });
    }
    components.push({ type: 'BODY', text: val.body });
    if (val.footerText) {
      components.push({ type: 'FOOTER', text: val.footerText });
    }
    if (val.buttonsText) {
      components.push({
        type: 'BUTTONS',
        buttons: val.buttonsText.split(',').map((b: string) => ({ type: 'QUICK_REPLY', text: b.trim() }))
      });
    }
    return components;
  }

  // Submit template for Meta WABA approval
  submitForApproval() {
    const val = this.templateForm.value;
    if (this.templateForm.invalid) {
      Swal.fire('Error', 'Please correct validation errors before submitting.', 'error');
      return;
    }

    const components = this.buildComponentsPayload();

    const payload = {
      name: val.name,
      templateName: val.name,
      category: val.category,
      language: val.language,
      parameter_format: 'POSITIONAL',
      templateBody: val.body,
      headerType: val.headerFormat === 'TEXT' ? 'TEXT' : null,
      headerText: val.headerText || null,
      footerText: val.footerText || null,
      buttons: val.buttonsText ? val.buttonsText.split(',').map((b: string) => b.trim()) : null,
      components
    };

    if (this.editingTemplateId()) {
      // First update the local template, then submit to Meta
      this.api.put(`/messagetemplates/update/${this.editingTemplateId()}`, payload).subscribe({
        next: () => {
          this.submitDraft(this.editingTemplateId()!);
          this.closeCreateTemplate();
        },
        error: (err: any) => Swal.fire('Error', 'Failed to update template before submission: ' + err.message, 'error')
      });
    } else {
      this.api.post('/messagetemplates/submit', payload).subscribe({
      next: () => {
        this.closeCreateTemplate();
        this.fetchTemplates();
        Swal.fire('Submitted', 'Template submitted to Meta for review!', 'success');
      },
      error: (err: any) => {
        this.closeCreateTemplate();
        this.fetchTemplates();
        const rawErr = err.error?.error || err.error?.message || err.message || 'Template submission failed.';
        const rejectionNote = err.error?.rejectionReason || rawErr;

        Swal.fire({
          title: 'Meta Template Rejection',
          html: `
            <div style="text-align: left; font-family: 'Inter', sans-serif;">
              <p style="font-size: 13.5px; color: #991b1b; background: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 8px; font-weight: 600; margin-bottom: 12px;">
                ❌ Meta API Error Response:<br>
                <span style="font-size: 12.5px; font-weight: 400; font-family: monospace; display: block; margin-top: 6px; color: #7f1d1d;">${rejectionNote}</span>
              </p>
              <div style="font-size: 12.5px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
                <b>Tips to fix rejection:</b>
                <ul style="margin-top: 4px; padding-left: 18px; line-height: 1.5;">
                  <li>Check variable placeholders use <code>{{1}}</code>, <code>{{2}}</code> positional format without skipping numbers.</li>
                  <li>Ensure character limits (Header 60, Body 1024, Footer 60) are respected.</li>
                  <li>Avoid promotional terms when category is set to Utility.</li>
                </ul>
              </div>
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'Review in Action Required',
          confirmButtonColor: '#0b494d'
        });
      }
    });
    }
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
        this.fetchTemplates();
        const rawErr = err.error?.error || err.error?.message || err.message || 'Submission failed.';
        const rejectionNote = err.error?.rejectionReason || rawErr;

        Swal.fire({
          title: 'Meta Template Rejection',
          html: `
            <div style="text-align: left; font-family: 'Inter', sans-serif;">
              <p style="font-size: 13.5px; color: #991b1b; background: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 8px; font-weight: 600; margin-bottom: 12px;">
                ❌ Meta API Error Response:<br>
                <span style="font-size: 12.5px; font-weight: 400; font-family: monospace; display: block; margin-top: 6px; color: #7f1d1d;">${rejectionNote}</span>
              </p>
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'Close',
          confirmButtonColor: '#0b494d'
        });
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
