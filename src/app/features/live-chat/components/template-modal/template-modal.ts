import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';

export interface TemplateDispatchPayload {
  templateId: number | string;
  templateName: string;
  customParameters: Record<string, string>;
}

@Component({
  selector: 'app-template-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="closeModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        
        <div class="modal-header">
          <div class="title-group">
            <i class="fa-solid fa-file-invoice header-icon"></i>
            <div>
              <h3>Re-Engage with Approved Template</h3>
              <p class="subtitle">Select an approved Meta template to re-open customer 24h window or initiate chat</p>
            </div>
          </div>
          <button type="button" class="btn-close" (click)="closeModal()">&times;</button>
        </div>

        <div class="modal-body">
          <div *ngIf="loading" class="loading-spinner">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Loading approved templates for project...
          </div>

          <div *ngIf="!loading && templates.length === 0" class="no-templates-alert">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>No approved templates found for this project. Please create & approve templates in the <strong>Templates Manager</strong> first.</span>
          </div>

          <div *ngIf="!loading && templates.length > 0" class="template-form-grid">
            
            <!-- Left Side: Selection & Variable Inputs -->
            <div class="form-section">
              <!-- Template Dropdown -->
              <div class="form-group">
                <label class="input-label">Select Approved Template *</label>
                <select class="form-control" [(ngModel)]="selectedTemplateId" (change)="onTemplateChange()">
                  <option [value]="null" disabled>-- Choose an Approved Template --</option>
                  <option *ngFor="let t of templates" [value]="t.id">
                    {{ t.templateName }} ({{ t.category || 'MARKETING' }} - {{ t.language || 'en_US' }})
                  </option>
                </select>
              </div>

              <!-- Variable Auto-Fill Inputs -->
              <div *ngIf="selectedTemplate && templateVariables.length > 0" class="variables-section">
                <label class="section-label">Smart Variable Customization:</label>
                <div class="var-input-row" *ngFor="let v of templateVariables; let i = index">
                  <span class="var-badge">{{ '{{' + v.key + '}}' }}</span>
                  <input 
                    type="text" 
                    class="form-control var-input" 
                    [placeholder]="'Value for ' + v.key"
                    [(ngModel)]="variableValues[v.key]" 
                  />
                </div>
              </div>

              <div *ngIf="selectedTemplate && templateVariables.length === 0" class="no-vars-notice">
                <i class="fa-solid fa-circle-info"></i> This template has no dynamic variables. Ready to dispatch.
              </div>
            </div>

            <!-- Right Side: Live WhatsApp Card Preview -->
            <div class="preview-section" *ngIf="selectedTemplate">
              <label class="preview-label">Live WhatsApp Preview:</label>
              
              <div class="wa-chat-bubble">
                <!-- Header Media/Text -->
                <div *ngIf="selectedTemplate.headerType === 'IMAGE' || selectedTemplate.headerUrl" class="wa-header-media">
                  <img [src]="selectedTemplate.headerUrl || 'assets/placeholder-media.png'" alt="Header" />
                </div>
                <div *ngIf="selectedTemplate.headerType === 'TEXT' && selectedTemplate.headerText" class="wa-header-text">
                  {{ selectedTemplate.headerText }}
                </div>

                <!-- Body Text with Replaced Variables -->
                <div class="wa-body-text">
                  {{ getPreviewBodyText() }}
                </div>

                <!-- Footer Text -->
                <div *ngIf="selectedTemplate.footerText" class="wa-footer-text">
                  {{ selectedTemplate.footerText }}
                </div>

                <!-- Action Buttons Preview -->
                <div *ngIf="selectedTemplate.components || selectedTemplate.buttons" class="wa-buttons-list">
                  <div class="wa-btn-item" *ngFor="let btn of getButtonsList(selectedTemplate)">
                    <i class="fa-solid fa-reply" *ngIf="btn.type === 'QUICK_REPLY'"></i>
                    <i class="fa-solid fa-arrow-up-right-from-square" *ngIf="btn.type === 'URL'"></i>
                    <i class="fa-solid fa-phone" *ngIf="btn.type === 'PHONE_NUMBER'"></i>
                    <span>{{ btn.text || btn.buttonText || 'Action' }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-cancel" (click)="closeModal()">Cancel</button>
          <button 
            type="button" 
            class="btn btn-submit" 
            (click)="submitTemplate()" 
            [disabled]="!selectedTemplate || submitting">
            <i class="fa-solid fa-paper-plane" *ngIf="!submitting"></i>
            <i class="fa-solid fa-circle-notch fa-spin" *ngIf="submitting"></i>
            <span>{{ submitting ? 'Dispatching Template...' : 'Send Template to Customer' }}</span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px);
      z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-card {
      background: #ffffff; width: 100%; max-width: 760px; border-radius: 20px;
      box-shadow: 0 20px 45px rgba(0,0,0,0.2); overflow: hidden;
      animation: modalFadeIn 0.25s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px; border-bottom: 1px solid #e2e8f0;
      .title-group { display: flex; align-items: center; gap: 12px; }
      .header-icon { font-size: 20px; color: #4338ca; background: #eef2ff; padding: 10px; border-radius: 10px; }
      h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
      .subtitle { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
      .btn-close { background: transparent; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; }
    }
    .modal-body { padding: 20px 24px; max-height: 70vh; overflow-y: auto; }
    .loading-spinner { padding: 40px; text-align: center; color: #6366f1; font-weight: 600; font-size: 14px; }
    .no-templates-alert {
      background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 14px 18px; border-radius: 12px;
      display: flex; align-items: center; gap: 10px; font-size: 13px;
    }
    .template-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .form-group {
      display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;
      .input-label { font-size: 12px; font-weight: 700; color: #475569; }
      .form-control { width: 100%; box-sizing: border-box; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; outline: none; background: white; }
    }
    .variables-section {
      background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 12px; margin-top: 10px;
      .section-label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 10px; display: block; }
      .var-input-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .var-badge { background: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 6px; min-width: 45px; text-align: center; }
      .var-input { flex: 1; padding: 7px 10px; font-size: 12.5px; border: 1px solid #cbd5e1; border-radius: 6px; }
    }
    .no-vars-notice { font-size: 12px; color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; margin-top: 10px; }
    .preview-section {
      background: #efeae2; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px;
      .preview-label { font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase; }
    }
    .wa-chat-bubble {
      background: #ffffff; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); font-family: 'Segoe UI', system-ui, sans-serif;
      .wa-header-media img { width: 100%; max-height: 140px; object-fit: cover; border-radius: 6px; margin-bottom: 8px; }
      .wa-header-text { font-weight: 700; font-size: 13.5px; color: #111827; margin-bottom: 6px; }
      .wa-body-text { font-size: 13px; line-height: 1.4; color: #1f2937; white-space: pre-wrap; word-break: break-word; }
      .wa-footer-text { font-size: 10.5px; color: #6b7280; margin-top: 6px; }
      .wa-buttons-list {
        margin-top: 10px; border-top: 1px solid #e5e7eb; padding-top: 6px; display: flex; flex-direction: column; gap: 4px;
        .wa-btn-item { display: flex; align-items: center; justify-content: center; gap: 6px; color: #0284c7; font-weight: 600; font-size: 12.5px; padding: 6px; background: #f8fafc; border-radius: 6px; }
      }
    }
    .modal-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;
      .btn { padding: 10px 20px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
      .btn-cancel { background: #ffffff; border: 1px solid #cbd5e1; color: #475569; }
      .btn-submit { background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); border: none; color: #ffffff; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); &:disabled { opacity: 0.5; cursor: not-allowed; } }
    }
  `]
})
export class SendTemplateModal implements OnChanges {
  private api = inject(ApiService);

  @Input() isOpen = false;
  @Input() conversation: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() sendTemplate = new EventEmitter<TemplateDispatchPayload>();

  loading = false;
  submitting = false;
  templates: any[] = [];
  selectedTemplateId: number | string | null = null;
  selectedTemplate: any = null;
  templateVariables: { key: string }[] = [];
  variableValues: Record<string, string> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadApprovedTemplates();
    }
  }

  loadApprovedTemplates(): void {
    this.loading = true;
    const projectId = this.conversation?.projectId || null;
    let url = 'messagetemplates?status=APPROVED';
    if (projectId) url += `&projectId=${projectId}`;

    this.api.get(url).subscribe({
      next: (res: any) => {
        this.loading = false;
        const list = res.data || res.items || (Array.isArray(res) ? res : []);
        // Filter APPROVED status
        this.templates = list.filter((t: any) => !t.status || t.status === 'APPROVED');
        if (this.templates.length > 0) {
          this.selectedTemplateId = this.templates[0].id;
          this.onTemplateChange();
        }
      },
      error: () => {
        this.loading = false;
        this.templates = [];
      }
    });
  }

  onTemplateChange(): void {
    if (!this.selectedTemplateId) {
      this.selectedTemplate = null;
      this.templateVariables = [];
      this.variableValues = {};
      return;
    }

    this.selectedTemplate = this.templates.find(t => t.id == this.selectedTemplateId) || null;
    if (!this.selectedTemplate) return;

    // Extract dynamic variables like {{1}}, {{2}} or {{name}}, {{phone}}
    const bodyText = this.selectedTemplate.bodyText || this.selectedTemplate.content || '';
    const matches = bodyText.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    
    this.templateVariables = [];
    this.variableValues = {};

    if (matches && matches.length > 0) {
      const keysSeen = new Set<string>();
      matches.forEach((match: string, idx: number) => {
        const key = match.replace(/[\{\}]/g, '');
        if (!keysSeen.has(key)) {
          keysSeen.add(key);
          this.templateVariables.push({ key });

          // Auto-fill smart default values from conversation Contact details
          const contact = this.conversation?.Contact || {};
          if (idx === 0 || key === 'name' || key === 'first_name' || key === '1') {
            this.variableValues[key] = contact.firstName || contact.name || 'Customer';
          } else if (idx === 1 || key === 'phone' || key === '2') {
            this.variableValues[key] = contact.phone || '';
          } else if (key === 'company') {
            this.variableValues[key] = contact.company || 'Pace Travels';
          } else {
            this.variableValues[key] = '';
          }
        }
      });
    }
  }

  getPreviewBodyText(): string {
    if (!this.selectedTemplate) return '';
    let text = this.selectedTemplate.bodyText || this.selectedTemplate.content || '';
    Object.keys(this.variableValues).forEach(key => {
      const val = this.variableValues[key] || `{{${key}}}`;
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    });
    return text;
  }

  getButtonsList(template: any): any[] {
    if (!template) return [];
    if (Array.isArray(template.buttons)) return template.buttons;
    if (Array.isArray(template.components)) {
      const btnComp = template.components.find((c: any) => c.type === 'BUTTONS');
      if (btnComp && Array.isArray(btnComp.buttons)) return btnComp.buttons;
    }
    return [];
  }

  submitTemplate(): void {
    if (!this.selectedTemplate) return;
    this.submitting = true;
    this.sendTemplate.emit({
      templateId: this.selectedTemplate.id,
      templateName: this.selectedTemplate.templateName,
      customParameters: { ...this.variableValues }
    });
  }

  closeModal(): void {
    this.submitting = false;
    this.close.emit();
  }
}
