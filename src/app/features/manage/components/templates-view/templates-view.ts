import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { ApiService } from '../../../../shared/services/api.service';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MarkdownComponent],
  templateUrl: './templates-view.html',
  styleUrl: './templates-view.scss',
})
export class TemplatesView implements OnInit {
  router = inject(Router);

  activeTab = 'All';
  activeCategory = 'Trending';

  templates = signal<MessageTemplate[]>([]);
  isLoading = signal(false);

  // Modal controls
  showCreateModal = signal(false);
  showPreviewModal = signal(false);
  showGuideModal = signal(false);

  guideTitle = signal('');
  guideContent = signal('');

  selectedPreviewTemplate = signal<MessageTemplate | null>(null);

  // Create template form
  templateForm: FormGroup;

  // Search & Brand Filter
  searchQuery = signal('');
  selectedBrand = signal('ALL');

  // Filtered templates selector
  filteredTemplates = computed(() => {
    let list = this.templates();
    const query = this.searchQuery().toLowerCase().trim();
    const brand = this.selectedBrand();

    if (brand !== 'ALL') {
      if (brand === 'PACE_TRAVELS') list = list.filter(t => t.templateName.startsWith('pace_b2c_') || t.templateName.includes('welcome') || t.templateName.includes('booking') || t.templateName.includes('flight'));
      else if (brand === 'PACE_B2B') list = list.filter(t => t.templateName.startsWith('pace_b2b_'));
      else if (brand === 'DUBAI_PACE') list = list.filter(t => t.templateName.startsWith('dubai_pace_') || t.templateName.includes('vip_staycation'));
      else if (brand === 'THAI_PACE') list = list.filter(t => t.templateName.startsWith('thai_pace_'));
      else if (brand === 'VIETNAM_PACE') list = list.filter(t => t.templateName.startsWith('vietnam_pace_'));
    }

    if (query) {
      list = list.filter(t => t.templateName.toLowerCase().includes(query) || t.status.toLowerCase().includes(query) || t.templateBody.toLowerCase().includes(query));
    }

    if (this.activeTab === 'Explore') {
      return list;
    } else if (this.activeTab === 'All') {
      return list;
    } else if (this.activeTab === 'Draft') {
      return list.filter(t => t.status === 'DRAFT');
    } else if (this.activeTab === 'Pending') {
      return list.filter(t => t.status === 'PENDING' || t.status === 'IN_REVIEW');
    } else if (this.activeTab === 'Approved') {
      return list.filter(t => t.status === 'APPROVED');
    } else if (this.activeTab === 'Action Required') {
      return list.filter(t => t.status === 'REJECTED' || t.status === 'PAUSED' || t.status === 'DISABLED');
    }
    return list;
  });

  constructor(
    private api: ApiService,
    private fb: FormBuilder
  ) {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
      category: ['MARKETING', Validators.required],
      language: ['en_US', Validators.required],
      headerFormat: ['NONE', Validators.required],
      headerText: [''],
      body: ['', Validators.required],
      footerText: [''],
      buttonsText: [''] // Quick reply button texts comma separated
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
    this.isLoading.set(true);
    this.api.get('/messagetemplates/sync').subscribe({
      next: (res: any) => {
        this.templates.set(res.data || []);
        this.isLoading.set(false);
        alert("Templates synced successfully from WhatsApp!");
      },
      error: (err: any) => {
        this.isLoading.set(false);
        alert("Sync failed: " + err.message);
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

  getLivePreviewBody() {
    const val = this.templateForm.value.body || '';
    // Replace variables like {{1}} with styled placeholders for preview
    return val.replace(/\{\{(\d+)\}\}/g, '<strong>[Variable $1]</strong>');
  }

  // Save template as a draft locally
  saveAsDraft() {
    const val = this.templateForm.value;
    if (!val.name || !val.body) {
      alert("Name and Body are required to draft a template.");
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
        alert("Template draft saved locally!");
      },
      error: (err: any) => {
        alert("Failed to save draft: " + err.message);
      }
    });
  }

  // Submit template for Meta WABA approval
  submitForApproval() {
    const val = this.templateForm.value;
    if (this.templateForm.invalid) {
      alert("Please correct validation errors before submitting.");
      return;
    }

    // Build Meta standard components payload
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
        alert("Template submitted to Meta for review!");
      },
      error: (err: any) => {
        alert("Meta submission failed: " + (err.error?.error || err.message));
      }
    });
  }

  // Submit an existing draft template to Meta WABA
  submitDraft(id: number | undefined) {
    if (id === undefined) return;
    this.api.post(`/messagetemplates/draft/${id}/submit`, {}).subscribe({
      next: () => {
        this.fetchTemplates();
        alert("Draft template submitted to Meta WABA successfully!");
      },
      error: (err: any) => {
        alert("Failed to submit draft: " + (err.error?.error || err.message));
      }
    });
  }

  openGuide(guideKey: string) {
    if (guideKey === 'CREATE') {
      this.guideTitle.set('How to Create WhatsApp Template Messages');
      this.guideContent.set(`
# How to Create WhatsApp Template Messages

Templates are pre-approved message formats used for initiating conversations with users on WhatsApp.

### 📝 Key Rules & Guidelines:
1. **Naming**: Only lowercase letters, numbers, and underscores are allowed (e.g. \`welcome_offer_v1\`).
2. **Categories**:
   - **MARKETING**: Promotions, staycation deals, and re-engagement campaigns.
   - **UTILITY**: Booking confirmations, flight alerts, and receipts.
   - **AUTHENTICATION**: One-Time Passwords (OTP).
3. **Variables**: Use positional placeholders like \`{{1}}\`, \`{{2}}\` for dynamic text (e.g. \`Hello {{1}}, your booking for {{2}} is confirmed!\`).
4. **Approval**: Meta automatically approves compliant utility and marketing templates within 1-5 minutes.
      `);
    } else if (guideKey === 'PARAMS') {
      this.guideTitle.set('Using Chatbot Parameters for Leads');
      this.guideContent.set(`
# Using Chatbot Parameters in WhatsApp Templates

Dynamic parameters allow you to personalize every broadcast message with customer details.

### 💡 Example Parameter Mapping:
* **\`{{1}}\`** ➔ Customer Name (\`John Doe\`)
* **\`{{2}}\`** ➔ Hotel / Destination (\`Atlantis The Palm Dubai\`)
* **\`{{3}}\`** ➔ Booking Reference ID (\`BK-98412\`)
* **\`{{4}}\`** ➔ Checkout Date (\`Nov 24, 2026\`)

### ⚡ Quick Tip:
You can pass custom fallback variables in Pace Messenger when broadcasting campaigns!
      `);
    } else if (guideKey === 'QUICK_REPLY') {
      this.guideTitle.set('Adding Quick Replies to WhatsApp Templates');
      this.guideContent.set(`
# Adding Quick Reply Buttons to Templates

Quick reply buttons allow recipients to respond with a single tap, dramatically boosting response rates!

### 🔘 Supported Button Types:
1. **Quick Reply**: Pre-defined response buttons (e.g. \`Book Now\`, \`Speak to Agent\`, \`Cancel\`).
2. **Call to Action**:
   - **Call Phone Number**: Direct phone call (e.g. \`+917204262473\`).
   - **Visit Website**: Custom web URL with dynamic URL tracking.
      `);
    } else if (guideKey === 'FORMATTING') {
      this.guideTitle.set('Message Formatting Guidelines');
      this.guideContent.set(`
# WhatsApp Text Formatting Guide

Enhance your template text with rich markdown formatting supported by WhatsApp:

* **Bold**: Wrap text in asterisks \`*bold text*\` ➔ **bold text**
* *Italic*: Wrap text in underscores \`_italic text_\` ➔ *italic text*
* ~Strikethrough~: Wrap text in tildes \`~strikethrough~\` ➔ ~strikethrough~
* \`Monospace\`: Wrap text in triple backticks \` \`\`\`monospace\`\`\` \` ➔ \`monospace\`

> **Note**: Avoid headers longer than 60 characters to ensure 100% Meta approval.
      `);
    }

    this.showGuideModal.set(true);
  }

  closeGuide() {
    this.showGuideModal.set(false);
  }

  openPreview(tpl: MessageTemplate) {
    this.selectedPreviewTemplate.set(tpl);
    this.showPreviewModal.set(true);
  }

  closePreview() {
    this.showPreviewModal.set(false);
    this.selectedPreviewTemplate.set(null);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
