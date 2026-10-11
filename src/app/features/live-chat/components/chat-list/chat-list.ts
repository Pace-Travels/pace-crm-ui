import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiveChatService, Conversation } from '../../services/live-chat.service';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-list.html',
  styleUrl: './chat-list.scss',
})
export class ChatList {
  activeTab = signal<'ACTIVE' | 'REQUESTING' | 'INTERVENED'>('ACTIVE');
  searchQuery = signal<string>('');

  constructor(public chatService: LiveChatService) {}

  displayedConversations = computed(() => {
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();
    
    let list: Conversation[] = [];
    if (tab === 'ACTIVE') list = this.chatService.activeConversations();
    else if (tab === 'REQUESTING') list = this.chatService.requestingConversations();
    else if (tab === 'INTERVENED') list = this.chatService.intervenedConversations();

    if (!query) return list;

    return list.filter(c => {
      const name = (c.Contact?.name || `${c.Contact?.firstName || ''} ${c.Contact?.lastName || ''}`).toLowerCase();
      const phone = (c.Contact?.phone || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  });

  selectChat(conv: Conversation) {
    this.chatService.selectConversation(conv);
  }

  getAvatarInitial(name: string | undefined): string {
    return name ? name.charAt(0).toUpperCase() : 'C';
  }

  formatPreview(msg: any): string {
    if (!msg) return 'Click to open conversation history';
    const text = msg.textContent || msg.text || msg.content || '';
    if (!text) return 'Click to open conversation history';
    if (text === '[Interactive Selection]') return '🔘 Quick Reply Selection';
    if (text.includes('[Interactive Selection]')) return text.replace('[Interactive Selection]', '🔘 Quick Reply Selection');
    return text;
  }
}
