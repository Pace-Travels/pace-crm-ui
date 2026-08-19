import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface ActionButton {
  typeOfAction: 'VISIT_WEBSITE' | 'CALL_WHATSAPP' | 'CALL_PHONE' | 'COMPLETE_FLOW' | 'COPY_OFFER_CODE' | 'CUSTOM';
  buttonText: string;
  urlType?: 'STATIC' | 'DYNAMIC';
  websiteUrl?: string;
  trackConversions?: boolean;
  activeForDays?: number;
  countryCode?: string;
  phoneNumber?: string;
  buttonIcon?: string;
  flowPicker?: 'CREATE_NEW' | 'USE_EXISTING';
  flowId?: string;
  offerCode?: string;
}

@Component({
  selector: 'app-create-template-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-template-view.html',
  styleUrl: './create-template-view.scss'
})
export class CreateTemplateView implements OnInit {
  // Wizard steps: 1 = Set up template, 2 = Edit template, 3 = Submit for Review
  currentStep = signal<number>(1);

  // Step 1: Configuration
  selectedCategory = signal<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  selectedType = signal<string>('DEFAULT');

  // Step 2: Template Metadata & Content
  templateName = signal<string>('');
  selectedLanguage = signal<string>('en_US');
  variableType = signal<'NUMBER' | 'NAME'>('NUMBER');
  
  // Media Header & Upload State
  mediaHeaderType = signal<'NONE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'>('NONE');
  headerText = signal<string>('');
  headerMediaUrl = signal<string>('');
  locationName = signal<string>('Jasper Market');
  locationAddress = signal<string>('123 Market St, City');

  isDragging = signal<boolean>(false);
  isUploadingMedia = signal<boolean>(false);
  uploadedFileName = signal<string>('');
  uploadProgress = signal<number>(0);

  // Body & Footer Content
  bodyText = signal<string>('Hello {{1}}, check out our latest offerings!');
  footerText = signal<string>('');

  // Buttons List
  buttons = signal<ActionButton[]>([]);

  // Validity & Tracking Settings
  enableCustomValidity = signal<boolean>(false);
  validityPeriodHours = signal<number>(12);
  appConversionTracking = signal<boolean>(false);

  // Interactive UI State
  showButtonDropdown = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Available Languages
  languages = [
    { code: 'en_US', label: 'English (US)' },
    { code: 'en_GB', label: 'English (UK)' },
    { code: 'hi', label: 'Hindi' },
    { code: 'es', label: 'Spanish' },
    { code: 'pt_BR', label: 'Portuguese (BR)' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'ar', label: 'Arabic' }
  ];

  // Character Limit Computeds
  templateNameLength = computed(() => this.templateName().length);
  headerTextLength = computed(() => this.headerText().length);
  bodyTextLength = computed(() => this.bodyText().length);
  footerTextLength = computed(() => this.footerText().length);

  // Duplicate button text validation check
  hasDuplicateButtonTexts = computed(() => {
    const texts = this.buttons().map(b => b.buttonText.trim().toLowerCase()).filter(t => t.length > 0);
    return new Set(texts).size !== texts.length;
  });

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Default initial template state
  }

  setCategory(cat: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'): void {
    this.selectedCategory.set(cat);
    // Reset type defaults for selected category
    if (cat === 'MARKETING') {
      this.selectedType.set('DEFAULT');
    } else if (cat === 'UTILITY') {
      this.selectedType.set('DEFAULT');
    } else if (cat === 'AUTHENTICATION') {
      this.selectedType.set('OTP');
      this.bodyText.set('{{1}} is your verification code. For your security, do not share this code.');
    }
  }

  setType(type: string): void {
    this.selectedType.set(type);
  }

  nextStep(): void {
    if (this.currentStep() === 1) {
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      if (!this.templateName().trim()) {
        Swal.fire('Required Field', 'Please enter a template name.', 'warning');
        return;
      }
      if (this.hasDuplicateButtonTexts()) {
        Swal.fire('Validation Error', 'You cannot enter the same text for multiple buttons.', 'error');
        return;
      }
      this.currentStep.set(3);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  // Dropzone Drag & Drop File Upload Handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.uploadMediaFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadMediaFile(file);
    }
  }

  uploadMediaFile(file: File): void {
    const type = this.mediaHeaderType();
    if (type === 'NONE' || type === 'LOCATION') return;

    // File Validation
    if (type === 'IMAGE' && !file.type.startsWith('image/')) {
      Swal.fire('Invalid File', 'Please select an image file (.jpg, .jpeg, .png).', 'warning');
      return;
    }
    if (type === 'VIDEO' && !file.type.startsWith('video/')) {
      Swal.fire('Invalid File', 'Please select a video file (.mp4, .3gp).', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderCategory', 'templates');
    formData.append('subCategory', type.toLowerCase() + 's');

    this.isUploadingMedia.set(true);
    this.uploadedFileName.set(file.name);

    this.api.post('/storage/upload', formData).subscribe({
      next: (res: any) => {
        this.isUploadingMedia.set(false);
        if (res && res.url) {
          this.headerMediaUrl.set(res.url);
          Swal.fire({
            title: 'Media Uploaded',
            text: `File "${file.name}" uploaded successfully to S3 storage!`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      },
      error: (err: any) => {
        this.isUploadingMedia.set(false);
        Swal.fire('Upload Failed', err.error?.message || err.message || 'Failed to upload media to server.', 'error');
      }
    });
  }

  removeUploadedMedia(): void {
    this.headerMediaUrl.set('');
    this.uploadedFileName.set('');
  }

  // Body Rich Text Editing Actions
  insertVariableToBody(): void {
    const text = this.bodyText();
    const matches = text.match(/\{\{(\d+)\}\}/g) || [];
    const nextNum = matches.length + 1;
    this.bodyText.set(text + ` {{${nextNum}}}`);
  }

  insertVariableToHeader(): void {
    const text = this.headerText();
    const matches = text.match(/\{\{(\d+)\}\}/g) || [];
    const nextNum = matches.length + 1;
    this.headerText.set(text + ` {{${nextNum}}}`);
  }

  applyFormatting(style: 'BOLD' | 'ITALIC' | 'STRIKE' | 'MONO'): void {
    const current = this.bodyText();
    let wrap = '';
    if (style === 'BOLD') wrap = '*';
    if (style === 'ITALIC') wrap = '_';
    if (style === 'STRIKE') wrap = '~';
    if (style === 'MONO') wrap = '```';

    this.bodyText.set(current + `${wrap}text${wrap}`);
  }

  // Button Management
  toggleButtonDropdown(): void {
    this.showButtonDropdown.set(!this.showButtonDropdown());
  }

  addButton(type: 'VISIT_WEBSITE' | 'CALL_WHATSAPP' | 'CALL_PHONE' | 'COMPLETE_FLOW' | 'COPY_OFFER_CODE' | 'CUSTOM'): void {
    this.showButtonDropdown.set(false);
    if (this.buttons().length >= 10) {
      Swal.fire('Limit Reached', 'You can add up to 10 buttons maximum.', 'info');
      return;
    }

    const newBtn: ActionButton = {
      typeOfAction: type,
      buttonText: this.getDefaultButtonText(type),
      urlType: type === 'VISIT_WEBSITE' ? 'STATIC' : undefined,
      websiteUrl: type === 'VISIT_WEBSITE' ? 'https://www.example.com' : undefined,
      activeForDays: type === 'CALL_WHATSAPP' ? 7 : undefined,
      countryCode: type === 'CALL_PHONE' ? '+91' : undefined,
      phoneNumber: type === 'CALL_PHONE' ? '' : undefined,
      buttonIcon: type === 'COMPLETE_FLOW' ? 'Default' : undefined,
      flowPicker: type === 'COMPLETE_FLOW' ? 'USE_EXISTING' : undefined,
      offerCode: type === 'COPY_OFFER_CODE' ? '' : undefined
    };

    this.buttons.set([...this.buttons(), newBtn]);
  }

  removeButton(index: number): void {
    const list = [...this.buttons()];
    list.splice(index, 1);
    this.buttons.set(list);
  }

  getDefaultButtonText(type: string): string {
    switch (type) {
      case 'VISIT_WEBSITE': return 'Visit website';
      case 'CALL_WHATSAPP': return 'Call on WhatsApp';
      case 'CALL_PHONE': return 'Call phone number';
      case 'COMPLETE_FLOW': return 'View flow';
      case 'COPY_OFFER_CODE': return 'Copy offer code';
      case 'CUSTOM': return 'Quick Reply';
      default: return 'Button';
    }
  }

  // Rendered Body Preview formatting parser
  parsedBodyText = computed(() => {
    let raw = this.bodyText() || '';
    // Highlight {{1}}, {{2}} tags
    raw = raw.replace(/\{\{(\d+)\}\}/g, '<span class="preview-var-tag">{{$1}}</span>');
    return raw;
  });

  submitTemplate(): void {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const componentsPayload: any[] = [
      {
        type: 'BODY',
        text: this.bodyText()
      }
    ];

    if (this.mediaHeaderType() !== 'NONE' || this.headerText().trim()) {
      const headerComp: any = {
        type: 'HEADER',
        format: this.mediaHeaderType() !== 'NONE' ? this.mediaHeaderType() : 'TEXT'
      };
      if (headerComp.format === 'TEXT') {
        headerComp.text = this.headerText();
      }
      componentsPayload.push(headerComp);
    }

    if (this.footerText().trim()) {
      componentsPayload.push({
        type: 'FOOTER',
        text: this.footerText()
      });
    }

    if (this.buttons().length > 0) {
      componentsPayload.push({
        type: 'BUTTONS',
        buttons: this.buttons().map(b => ({
          type: b.typeOfAction,
          text: b.buttonText,
          url: b.websiteUrl,
          phone_number: b.countryCode && b.phoneNumber ? `${b.countryCode}${b.phoneNumber}` : undefined,
          code: b.offerCode
        }))
      });
    }

    const payload = {
      name: this.templateName().trim().toLowerCase().replace(/\s+/g, '_'),
      category: this.selectedCategory(),
      language: this.selectedLanguage(),
      components: componentsPayload,
      validityPeriod: this.enableCustomValidity() ? this.validityPeriodHours() * 3600 : null,
      appConversionTracking: this.appConversionTracking()
    };

    this.api.post('/messagetemplates/submit', payload).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        Swal.fire({
          title: 'Template Submitted!',
          text: 'Your template has been submitted to Meta for review.',
          icon: 'success',
          confirmButtonColor: '#059669'
        }).then(() => {
          this.router.navigate(['/templates']);
        });
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        Swal.fire('Submission Failed', err.error?.message || err.message || 'Failed to submit template.', 'error');
      }
    });
  }

  saveDraft(): void {
    const payload = {
      name: this.templateName().trim().toLowerCase().replace(/\s+/g, '_') || 'draft_template',
      category: this.selectedCategory(),
      language: this.selectedLanguage(),
      templateBody: this.bodyText()
    };

    this.api.post('/messagetemplates/draft', payload).subscribe({
      next: (res: any) => {
        Swal.fire('Draft Saved', 'Your template draft was saved locally.', 'success');
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to save draft.', 'error');
      }
    });
  }
}
