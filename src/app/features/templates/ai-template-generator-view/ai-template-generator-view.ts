import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface PromptHistoryItem {
  id: string;
  promptText: string;
  style: string;
  objective: string;
  timestamp: Date;
}

export interface AiGeneratedVariation {
  id: number;
  title: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  style: string;
  score: number;
}

@Component({
  selector: 'app-ai-template-generator-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ai-template-generator-view.html',
  styleUrl: './ai-template-generator-view.scss'
})
export class AiTemplateGeneratorView implements OnInit {
  promptText = signal<string>('');
  selectedStyle = signal<'NORMAL' | 'POETIC' | 'EXCITING' | 'FUNNY'>('NORMAL');
  selectedObjective = signal<'CLICK_RATE' | 'REPLY_RATE'>('CLICK_RATE');
  
  isGenerating = signal<boolean>(false);
  showPromptHistoryDrawer = signal<boolean>(false);
  
  // Previous prompts history trajectory
  promptHistory = signal<PromptHistoryItem[]>([
    {
      id: 'p1',
      promptText: 'Promotional message offering 20% discount on new summer product line',
      style: 'EXCITING',
      objective: 'CLICK_RATE',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: 'p2',
      promptText: 'Appointment reminder message asking customer to confirm attendance',
      style: 'NORMAL',
      objective: 'REPLY_RATE',
      timestamp: new Date(Date.now() - 86400000)
    }
  ]);

  // Generated Variations Output
  generatedVariations = signal<AiGeneratedVariation[]>([]);

  promptLength = computed(() => this.promptText().length);

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  setStyle(style: 'NORMAL' | 'POETIC' | 'EXCITING' | 'FUNNY'): void {
    this.selectedStyle.set(style);
  }

  setObjective(obj: 'CLICK_RATE' | 'REPLY_RATE'): void {
    this.selectedObjective.set(obj);
  }

  togglePromptHistory(): void {
    this.showPromptHistoryDrawer.set(!this.showPromptHistoryDrawer());
  }

  copyPromptToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
    Swal.fire({
      title: 'Copied!',
      text: 'Prompt text copied to clipboard.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  }

  usePrompt(text: string, style?: string, obj?: string): void {
    this.promptText.set(text);
    if (style) this.selectedStyle.set(style as any);
    if (obj) this.selectedObjective.set(obj as any);
    this.showPromptHistoryDrawer.set(false);
  }

  generateTemplateVariations(): void {
    if (!this.promptText().trim()) {
      Swal.fire('Prompt Required', 'Please enter a prompt describing the template message you want to create.', 'warning');
      return;
    }

    this.isGenerating.set(true);

    // Save prompt to history trajectory
    const newHistory: PromptHistoryItem = {
      id: 'p_' + Date.now(),
      promptText: this.promptText().trim(),
      style: this.selectedStyle(),
      objective: this.selectedObjective(),
      timestamp: new Date()
    };
    this.promptHistory.set([newHistory, ...this.promptHistory()]);

    const payload = {
      prompt: this.promptText(),
      style: this.selectedStyle(),
      objective: this.selectedObjective()
    };

    // Call API endpoint
    this.api.post('/aiinteractions/generate-template', payload).subscribe({
      next: (res: any) => {
        this.isGenerating.set(false);
        if (res && res.variations) {
          this.generatedVariations.set(res.variations);
        } else {
          this.generateMockVariations();
        }
      },
      error: () => {
        this.isGenerating.set(false);
        this.generateMockVariations();
      }
    });
  }

  generateMockVariations(): void {
    const prompt = this.promptText();
    const style = this.selectedStyle();
    
    let prefix = 'Hello {{1}}, ';
    if (style === 'POETIC') prefix = 'Dearest {{1}}, a special delivery awaits... ';
    if (style === 'EXCITING') prefix = 'Hey {{1}}! 🎉 Exclusive news for you: ';
    if (style === 'FUNNY') prefix = 'Knock knock {{1}}! 😃 No jokes here, just awesome deals: ';

    this.generatedVariations.set([
      {
        id: 1,
        title: 'High Conversion Variant 1',
        headerText: 'Exclusive Offer for You',
        bodyText: `${prefix}${prompt}. Use code SAVE20 at checkout today!`,
        footerText: 'Reply STOP to unsubscribe',
        style: style,
        score: 98
      },
      {
        id: 2,
        title: 'Action-Oriented Variant 2',
        headerText: 'Special Announcement',
        bodyText: `Hi {{1}}, we crafted this just for you: ${prompt}. Click below to explore!`,
        footerText: 'Pace Messenger Offers',
        style: style,
        score: 94
      },
      {
        id: 3,
        title: 'Short & Punchy Variant 3',
        bodyText: `${prefix}${prompt}. Limited time only!`,
        footerText: 'Official Message',
        style: style,
        score: 89
      },
      {
        id: 4,
        title: 'Interactive Engagement Variant 4',
        headerText: 'Quick Question for {{1}}',
        bodyText: `${prompt}. Let us know your thoughts by tapping a response button below!`,
        footerText: 'Instant Response Required',
        style: style,
        score: 87
      }
    ]);
  }

  useVariationInWizard(varItem: AiGeneratedVariation): void {
    // Navigate to create template wizard with prefilled variation
    this.router.navigate(['/templates/create'], {
      queryParams: {
        aiBody: varItem.bodyText,
        aiHeader: varItem.headerText || '',
        aiFooter: varItem.footerText || ''
      }
    });
  }
}
