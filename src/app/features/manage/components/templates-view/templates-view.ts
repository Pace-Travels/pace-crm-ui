import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './templates-view.html',
  styleUrl: './templates-view.scss',
})
export class TemplatesView implements OnInit {
  activeTab = 'All';
  activeCategory = 'Trending';

  templates = signal<MessageTemplate[]>([]);
  isLoading = signal(false);

  // Modal controls
  showCreateModal = signal(false);
  showPreviewModal = signal(false);
  selectedPreviewTemplate = signal<MessageTemplate | null>(null);

  // Create template form
  templateForm: FormGroup;

  // Search filter
  searchQuery = signal('');

  // Filtered templates selector
  filteredTemplates = computed(() => {
    let list = this.templates();
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(t => t.templateName.toLowerCase().includes(query) || t.status.toLowerCase().includes(query));
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

  openPreview(tpl: MessageTemplate) {
    this.selectedPreviewTemplate.set(tpl);
    this.showPreviewModal.set(true);
  }

  closePreview() {
    this.showPreviewModal.set(false);
    this.selectedPreviewTemplate.set(null);
  }
}
