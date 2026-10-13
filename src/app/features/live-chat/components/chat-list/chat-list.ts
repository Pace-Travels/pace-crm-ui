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

  isTyping(convId: number): boolean {
    const t = this.chatService.typingMap()[convId];
    return !!(t && t.isTyping);
  }

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

  getMessagePreviewInfo(msg: any): { icon: string; text: string; isFailed: boolean } {
    if (!msg) {
      return { icon: '', text: 'Click to open conversation history', isFailed: false };
    }

    const isFailed = msg.status === 'FAILED' && msg.direction === 'OUTBOUND';
    const type = (msg.messageType || '').toUpperCase();
    const mediaUrl = (msg.mediaUrl || msg.content || '').toLowerCase();
    const rawText = (msg.textContent || msg.text || msg.content || '').trim();

    // 1. Check Image / Photo (including template messages with media header)
    const hasImage = type === 'IMAGE' || 
      (mediaUrl && (mediaUrl.includes('.png') || mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || mediaUrl.includes('.webp') || mediaUrl.includes('.gif') || mediaUrl.includes('scontent') || mediaUrl.includes('fbcdn') || mediaUrl.includes('templates/headers') || mediaUrl.includes('messengerassets.'))) ||
      (type === 'TEMPLATE' && !!msg.mediaUrl);

    if (hasImage) {
      let caption = rawText;
      if (!caption || caption.startsWith('[Media Attachment') || caption.startsWith('http://') || caption.startsWith('https://')) {
        caption = 'Photo';
      }
      return { icon: 'fa-solid fa-camera', text: caption, isFailed };
    }

    // 2. Video
    if (type === 'VIDEO' || mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.3gp')) {
      let caption = rawText;
      if (!caption || caption.startsWith('[Media Attachment') || caption.startsWith('http://') || caption.startsWith('https://')) {
        caption = 'Video';
      }
      return { icon: 'fa-solid fa-video', text: caption, isFailed };
    }

    // 3. Audio / Voice Note
    if (type === 'AUDIO' || mediaUrl.includes('.mp3') || mediaUrl.includes('.ogg') || mediaUrl.includes('.wav') || rawText.includes('[Voice Note')) {
      return { icon: 'fa-solid fa-microphone', text: 'Voice message', isFailed };
    }

    // 4. Document / PDF
    if (type === 'DOCUMENT' || type === 'PDF' || mediaUrl.includes('.pdf') || mediaUrl.includes('.doc') || mediaUrl.includes('.docx')) {
      let caption = msg.fileName || rawText;
      if (!caption || caption.startsWith('[Media Attachment') || caption.startsWith('http://') || caption.startsWith('https://')) {
        caption = 'Document';
      }
      return { icon: 'fa-solid fa-file-lines', text: caption, isFailed };
    }

    // 5. Sticker / GIF
    if (type === 'STICKER' || type === 'GIF') {
      return { icon: 'fa-solid fa-note-sticky', text: 'Sticker', isFailed };
    }

    // 6. Interactive Button Selection
    if (type === 'INTERACTIVE' || rawText.includes('[Interactive Selection]')) {
      const clean = rawText.replace('[Interactive Selection:', '').replace('[Interactive Selection]', '').replace(/\]$/, '').trim();
      return { icon: 'fa-solid fa-list-check', text: clean || 'Option selected', isFailed };
    }

    // 7. Payment Link
    if (rawText.toLowerCase().includes('payment request') || rawText.includes('/pay/')) {
      return { icon: 'fa-solid fa-credit-card', text: rawText, isFailed };
    }

    // 8. Default Clean Text Preview
    const cleanText = rawText.replace(/^\[Media Attachment:[^\]]+\]/, 'Attachment').trim() || 'Click to open conversation history';
    return { icon: '', text: cleanText, isFailed };
  }
}
