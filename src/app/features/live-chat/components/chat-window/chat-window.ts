import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiveChatService } from '../../services/live-chat.service';
import { ApiService } from '../../../../shared/services/api.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss',
})
export class ChatWindow {
  constructor(
    public chatService: LiveChatService,
    private api: ApiService
  ) {}

  sendMessage() {
    const text = this.chatService.chatInputMessage().trim();
    const conv = this.chatService.selectedConversation();
    if (!text || !conv) return;

    const payload = {
      conversationId: conv.id,
      textContent: text
    };

    this.api.post('messages/send', payload).subscribe({
      next: (res: any) => {
        this.chatService.chatInputMessage.set('');
        // Trigger a fresh message list load
        this.chatService.selectConversation(conv);
      },
      error: (err: any) => {
        alert("Failed to send message: " + err.message);
      }
    });
  }
}
