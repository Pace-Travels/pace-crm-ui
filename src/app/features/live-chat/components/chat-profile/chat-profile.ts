import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveChatService, Conversation } from '../../services/live-chat.service';
import { ApiService } from '../../../../shared/services/api.service';

declare var Swal: any;

interface AISuggestion {
  intent: string;
  recommendedAction: string;
  reasoning: string;
  confidence: string;
}

@Component({
  selector: 'app-chat-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-profile.html',
  styleUrl: './chat-profile.scss',
})
export class ChatProfile implements OnInit {
  aiSuggestion = signal<AISuggestion | null>(null);
  isLoadingSuggestion = signal(false);

  constructor(
    public chatService: LiveChatService,
    private api: ApiService
  ) {
    // Listen to changes in the active selected conversation using Angular effects
    effect(() => {
      const active = this.chatService.selectedConversation();
      if (active) {
        this.fetchNextStepSuggestion(active.id);
      } else {
        this.aiSuggestion.set(null);
      }
    });
  }

  ngOnInit() {}

  fetchNextStepSuggestion(convId: number) {
    this.isLoadingSuggestion.set(true);
    this.aiSuggestion.set(null);
    
    this.api.get<any>(`conversations/${convId}/suggest-next-action`).subscribe({
      next: (res: any) => {
        this.isLoadingSuggestion.set(false);
        if (res.success && res.suggestion) {
          this.aiSuggestion.set(res.suggestion);
        }
      },
      error: (err: any) => {
        this.isLoadingSuggestion.set(false);
        console.error("AI predictor error:", err);
      }
    });
  }

  toggleAssignedType() {
    const active = this.chatService.selectedConversation();
    if (!active) return;

    const nextType = active.assignedToType === 'AI' ? 'HUMAN' : 'AI';
    this.api.put<any>(`conversations/update/${active.id}`, { assignedToType: nextType }).subscribe({
      next: (res: any) => {
        const updated = { ...active, assignedToType: nextType };
        this.chatService.selectedConversation.set(updated);
        // Refresh conversations list
        this.chatService.fetchConversations();
        if (typeof Swal !== 'undefined' && Swal && Swal.fire) {
          Swal.fire({
            title: 'Assignment Switched',
            text: `Conversation assigned to ${nextType}!`,
            icon: 'success',
            toast: true,
            position: 'top-end',
            timer: 3000,
            showConfirmButton: false
          });
        }
      }
    });
  }

  useSuggestedAction() {
    const suggestion = this.aiSuggestion();
    if (suggestion) {
      this.chatService.chatInputMessage.set(suggestion.recommendedAction);
    }
  }
}
