import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveChatService, Conversation } from '../../services/live-chat.service';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-list.html',
  styleUrl: './chat-list.scss',
})
export class ChatList {
  activeTab = 'ACTIVE';

  constructor(public chatService: LiveChatService) {}

  selectChat(conv: Conversation) {
    this.chatService.selectConversation(conv);
  }

  getAvatarInitial(name: string | undefined): string {
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  formatPreview(msg: any): string {
    if (!msg) return 'No messages';
    const text = msg.textContent || msg.content || '';
    if (!text) return 'No messages';
    if (text === '[Interactive Selection]') return '🔘 Quick Reply Selection';
    if (text.includes('[Interactive Selection]')) return text.replace('[Interactive Selection]', '🔘 Quick Reply Selection');
    return text;
  }
}
