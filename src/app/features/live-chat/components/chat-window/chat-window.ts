import { Component, signal } from '@angular/core';
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
  showInteractiveModal = signal(false);
  interactiveBody = '';
  btn1 = '';
  btn2 = '';
  btn3 = '';

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
        this.chatService.selectConversation(conv);
      },
      error: (err: any) => {
        alert("Failed to send message: " + err.message);
      }
    });
  }

  toggleInteractiveModal() {
    this.showInteractiveModal.set(!this.showInteractiveModal());
  }

  sendInteractiveButtons() {
    const conv = this.chatService.selectedConversation();
    if (!conv) return;
    if (!this.interactiveBody) {
      alert("Please enter message body text!");
      return;
    }

    const buttons = [];
    if (this.btn1.trim()) buttons.push({ title: this.btn1.trim() });
    if (this.btn2.trim()) buttons.push({ title: this.btn2.trim() });
    if (this.btn3.trim()) buttons.push({ title: this.btn3.trim() });

    if (buttons.length === 0) {
      alert("Please enter at least one button title!");
      return;
    }

    const payload = {
      conversationId: conv.id,
      textContent: this.interactiveBody,
      buttons
    };

    this.api.post('messages/send-interactive', payload).subscribe({
      next: () => {
        this.interactiveBody = '';
        this.btn1 = '';
        this.btn2 = '';
        this.btn3 = '';
        this.showInteractiveModal.set(false);
        this.chatService.selectConversation(conv);
      },
      error: (err: any) => {
        alert("Failed to send interactive buttons: " + err.message);
      }
    });
  }
}
