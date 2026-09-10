import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiveChatService, Conversation } from '../../services/live-chat.service';
import { AgentService, AccountAgent } from '../../../agents/services/agent.service';
import { ApiService } from '../../../../shared/services/api.service';
import Swal from 'sweetalert2';

interface AISuggestion {
  intent: string;
  recommendedAction: string;
  reasoning: string;
  confidence: string;
}

@Component({
  selector: 'app-chat-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-profile.html',
  styleUrl: './chat-profile.scss',
})
export class ChatProfile implements OnInit {
  aiSuggestion = signal<AISuggestion | null>(null);
  isLoadingSuggestion = signal(false);

  public agentService = inject(AgentService);

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

  ngOnInit() {
    this.agentService.fetchAccountAgents();
  }

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

  onAgentChange(event: any) {
    const active = this.chatService.selectedConversation();
    if (!active) return;

    const val = event.target.value;
    let userId: number | null = null;
    let assignedToType = 'HUMAN';

    if (val === 'AI') {
      assignedToType = 'AI';
      userId = null;
    } else {
      userId = parseInt(val, 10);
      assignedToType = 'HUMAN';
    }

    this.agentService.assignConversation(active.id, userId, assignedToType).subscribe({
      next: (res: any) => {
        const updated = {
          ...active,
          assignedToUserId: userId,
          assignedToType
        };
        this.chatService.selectedConversation.set(updated);
        this.chatService.fetchConversations();

        if (typeof Swal !== 'undefined' && Swal && Swal.fire) {
          Swal.fire({
            title: 'Conversation Assigned',
            text: `Re-assigned to ${val === 'AI' ? 'AI Bot' : 'Account Staff Member'}`,
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

  toggleAssignedType() {
    const active = this.chatService.selectedConversation();
    if (!active) return;

    const nextType = active.assignedToType === 'AI' ? 'HUMAN' : 'AI';
    this.api.put<any>(`conversations/update/${active.id}`, { assignedToType: nextType }).subscribe({
      next: (res: any) => {
        const updated = { ...active, assignedToType: nextType };
        this.chatService.selectedConversation.set(updated);
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

