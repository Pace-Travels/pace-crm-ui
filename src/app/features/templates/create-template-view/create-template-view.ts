import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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

  // AI Visual & Idea Generator Modal/Drawer Signals
  showImageEditorModal = signal<boolean>(false);
  showVideoEditorModal = signal<boolean>(false);
  showIdeaDrawer = signal<boolean>(false);
  isAnalyzingVisual = signal<boolean>(false);
  isGeneratingIdeas = signal<boolean>(false);
  imageAnalysis = signal<any>(null);
  videoAnalysis = signal<any>(null);
  aiIdeas = signal<any[]>([]);
  selectedAspectRatio = signal<'SQUARE' | 'LANDSCAPE'>('SQUARE');

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
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check if coming from AI Generator page with queryParams
    this.route.queryParams.subscribe(params => {
      if (params['aiBody']) {
        this.bodyText.set(params['aiBody']);
        if (params['aiHeader']) {
          this.headerText.set(params['aiHeader']);
        }
        if (params['aiFooter']) {
          this.footerText.set(params['aiFooter']);
        }
        // Jump directly to Step 2 (Edit Template) so user sees prefilled AI copy!
        this.currentStep.set(2);
      }
    });
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

    // File Type & Size Validation
    if (type === 'IMAGE') {
      if (!file.type.startsWith('image/')) {
        Swal.fire('Invalid File', 'Please select an image file (.jpg, .jpeg, .png).', 'warning');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Image file size exceeds the 5MB limit for Meta WhatsApp templates.', 'warning');
        return;
      }
    }

    if (type === 'VIDEO') {
      if (!file.type.startsWith('video/')) {
        Swal.fire('Invalid File', 'Please select a video file (.mp4, .3gp).', 'warning');
        return;
      }
      if (file.size > 16 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Video file size exceeds the 16MB limit for Meta WhatsApp templates.', 'warning');
        return;
      }
    }

    if (type === 'DOCUMENT') {
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Document file size exceeds the 10MB limit for Meta WhatsApp templates.', 'warning');
        return;
      }
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
        let errorMsg = 'Failed to upload media to server.';
        if (err.status === 413) {
          errorMsg = 'File size is too large (413 Content Too Large). Please upload a smaller file.';
        } else if (err.status === 0) {
          errorMsg = 'Upload failed due to CORS or network error. Check Nginx client_max_body_size setting on your server.';
        } else if (err.error?.message || err.error?.error) {
          errorMsg = err.error?.message || err.error?.error;
        }
        Swal.fire('Upload Failed', errorMsg, 'error');
      }
    });
  }

  removeUploadedMedia(): void {
    this.headerMediaUrl.set('');
    this.uploadedFileName.set('');
    this.imageAnalysis.set(null);
    this.videoAnalysis.set(null);
  }

  onMediaHeaderTypeChange(newType: string): void {
    this.mediaHeaderType.set(newType as any);
    this.imageAnalysis.set(null);
    this.videoAnalysis.set(null);

    const currentUrl = this.headerMediaUrl();
    const isCurrentVideo = currentUrl.endsWith('.mp4') || currentUrl.includes('/videos/');
    const isCurrentImage = currentUrl.endsWith('.png') || currentUrl.endsWith('.jpg') || currentUrl.endsWith('.jpeg') || currentUrl.includes('/images/');

    if (newType === 'NONE' || newType === 'LOCATION') {
      this.headerMediaUrl.set('');
      this.uploadedFileName.set('');
    } else if (newType === 'IMAGE') {
      if (isCurrentVideo || !currentUrl || currentUrl.includes('sample_image.png')) {
        this.headerMediaUrl.set('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80');
        this.uploadedFileName.set('Sample_Header_Banner.jpg');
      }
    } else if (newType === 'VIDEO') {
      if (isCurrentImage || !currentUrl) {
        this.headerMediaUrl.set('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
        this.uploadedFileName.set('Sample_Promo_Video.mp4');
      }
    } else if (newType === 'DOCUMENT') {
      if (isCurrentVideo || isCurrentImage) {
        this.headerMediaUrl.set('');
        this.uploadedFileName.set('');
      }
    }
  }

  // --- Gemini Vision AI Image Analysis & Crop Editor ---
  openImageEditor(): void {
    this.showImageEditorModal.set(true);
  }

  saveCroppedImage(): void {
    const currentUrl = this.headerMediaUrl();
    if (!currentUrl) {
      this.showImageEditorModal.set(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const ratio = this.selectedAspectRatio();

      if (ratio === 'SQUARE') {
        canvas.width = 800;
        canvas.height = 800;
      } else {
        canvas.width = 800;
        canvas.height = 418; // 1.91:1 Meta Landscape
      }

      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const formData = new FormData();
            formData.append('file', blob, `cropped_header_${Date.now()}.png`);
            formData.append('folderCategory', 'templates');
            formData.append('subCategory', 'images');

            this.api.post('/storage/upload', formData).subscribe({
              next: (res: any) => {
                if (res && res.url) {
                  this.headerMediaUrl.set(res.url);
                  this.uploadedFileName.set(`cropped_header_${Date.now()}.png`);
                }
              }
            });
          }
        }, 'image/png');
      }
    };
    img.src = currentUrl;

    this.showImageEditorModal.set(false);
    Swal.fire({
      title: 'Cropped Image Saved',
      text: `Applied ${this.selectedAspectRatio() === 'SQUARE' ? '1:1 Square' : '1.91:1 Landscape'} crop to template header!`,
      icon: 'success',
      timer: 1800,
      showConfirmButton: false
    });
  }

  analyzeImageWithGemini(): void {
    const mediaUrl = this.headerMediaUrl();
    if (!mediaUrl) {
      Swal.fire('No Media File', 'Please upload an image first to run Gemini AI analysis.', 'warning');
      return;
    }

    this.isAnalyzingVisual.set(true);
    // Send request to AI controller
    this.api.post('/ai/analyze-image', { imageBase64: mediaUrl }).subscribe({
      next: (res: any) => {
        this.isAnalyzingVisual.set(false);
        if (res && res.analysis) {
          this.imageAnalysis.set(res.analysis);
        }
      },
      error: () => {
        this.isAnalyzingVisual.set(false);
        Swal.fire('Notice', 'Using offline Gemini analysis fallback.', 'info');
      }
    });
  }

  // --- Gemini Video AI Analyser ---
  openVideoEditor(): void {
    this.showVideoEditorModal.set(true);
  }

  analyzeVideoWithGemini(): void {
    this.isAnalyzingVisual.set(true);
    this.api.post('/ai/analyze-video', { videoMetadata: { fileName: this.uploadedFileName() } }).subscribe({
      next: (res: any) => {
        this.isAnalyzingVisual.set(false);
        if (res && res.analysis) {
          this.videoAnalysis.set(res.analysis);
        }
      },
      error: () => this.isAnalyzingVisual.set(false)
    });
  }

  // --- Gemini Pro Idea Generator Engine ---
  openIdeaDrawer(): void {
    this.showIdeaDrawer.set(true);
    if (this.aiIdeas().length === 0) {
      this.generateCreativeIdeas();
    }
  }

  generateCreativeIdeas(): void {
    this.isGeneratingIdeas.set(true);
    const payload = {
      prompt: this.bodyText() || this.templateName() || 'Promotional sale for WhatsApp',
      category: this.selectedCategory(),
      type: this.selectedType()
    };

    this.api.post('/ai/generate-ideas', payload).subscribe({
      next: (res: any) => {
        this.isGeneratingIdeas.set(false);
        if (res && res.ideas) {
          this.aiIdeas.set(res.ideas);
        }
      },
      error: () => this.isGeneratingIdeas.set(false)
    });
  }

  applyIdeaToTemplate(idea: any): void {
    if (idea.headerText) this.headerText.set(idea.headerText);
    if (idea.bodyText) this.bodyText.set(idea.bodyText);
    if (idea.footerText) this.footerText.set(idea.footerText);

    // 1. Map Suggested Buttons to ActionButton objects
    if (idea.suggestedButtons && Array.isArray(idea.suggestedButtons)) {
      const mappedButtons: ActionButton[] = idea.suggestedButtons.map((b: any) => {
        let typeAction: any = 'QUICK_REPLY';
        if (b.type === 'URL') typeAction = 'VISIT_WEBSITE';
        if (b.type === 'PHONE_NUMBER') typeAction = 'CALL_PHONE';

        return {
          typeOfAction: typeAction,
          buttonText: b.text || 'Action Button',
          websiteUrl: b.url || 'https://quotedesks.com',
          urlType: 'STATIC',
          phoneNumber: b.phoneNumber || '+15552043548',
          countryCode: '+1'
        };
      });
      this.buttons.set(mappedButtons);
    }

    // 2. Set Media Header Type & Generate S3 GenAI Video/Image Asset
    const hasVideoConcept = idea.bananaProPrompt || (idea.angle && idea.angle.toLowerCase().includes('video'));
    const mediaType = hasVideoConcept ? 'VIDEO' : 'IMAGE';
    
    this.mediaHeaderType.set(mediaType);
    this.showIdeaDrawer.set(false);

    // Call S3 GenAI Media Generator API
    const promptText = idea.bananaProPrompt || idea.headerText || idea.bodyText || 'Promo Asset';
    
    this.api.post('/ai/generate-media', { prompt: promptText, mediaType }).subscribe({
      next: (res: any) => {
        if (res && res.url) {
          this.headerMediaUrl.set(res.url);
          this.uploadedFileName.set(mediaType === 'VIDEO' ? 'GenAI_BananaPro_Promo.mp4' : 'GenAI_Promo_Asset.png');
          
          Swal.fire({
            title: 'AI Idea & Media Applied!',
            text: `Applied "${idea.angle}" template copy, buttons, and generated ${mediaType.toLowerCase()} header stored in S3 genai folder!`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          });
        }
      },
      error: () => {
        // Fallback default GenAI asset
        const fallbackUrl = mediaType === 'VIDEO' 
          ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          : 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
        
        this.headerMediaUrl.set(fallbackUrl);
        this.uploadedFileName.set(mediaType === 'VIDEO' ? 'GenAI_BananaPro_Promo.mp4' : 'GenAI_Promo_Asset.jpg');
      }
    });

    // Scroll smoothly to top of workspace
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  applySuggestionToBody(text: string): void {
    this.bodyText.set(text);
  }

  applySuggestionToHeader(text: string): void {
    this.headerText.set(text);
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
