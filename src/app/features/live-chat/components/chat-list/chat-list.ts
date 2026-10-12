import { Component, signal, computed, HostListener } from '@angular/core';
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

  // Context Menu State
  contextMenuConv = signal<Conversation | null>(null);
  contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });

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
    this.closeContextMenu();
    this.chatService.selectConversation(conv);
  }

  onContextMenu(event: MouseEvent, conv: Conversation) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuConv.set(conv);
    this.contextMenuPos.set({ x: event.clientX, y: event.clientY });
  }

  openChevronMenu(event: MouseEvent, conv: Conversation) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.contextMenuConv.set(conv);
    this.contextMenuPos.set({ x: rect.left - 140, y: rect.bottom + 4 });
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuConv.set(null);
  }

  // Context Menu Actions
  togglePin(conv: Conversation) {
    this.chatService.togglePin(conv);
    this.closeContextMenu();
  }

  toggleArchive(conv: Conversation) {
    this.chatService.toggleArchive(conv);
    this.closeContextMenu();
  }

  toggleMute(conv: Conversation) {
    this.chatService.toggleMute(conv);
    this.closeContextMenu();
  }

  toggleUnread(conv: Conversation) {
    this.chatService.toggleUnread(conv);
    this.closeContextMenu();
  }

  toggleFavourite(conv: Conversation) {
    this.chatService.toggleFavourite(conv);
    this.closeContextMenu();
  }

  clearChat(conv: Conversation) {
    if (confirm(`Are you sure you want to clear all messages for ${conv.Contact?.name || 'this chat'}?`)) {
      this.chatService.clearChat(conv);
    }
    this.closeContextMenu();
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
