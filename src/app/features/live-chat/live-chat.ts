import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatList } from './components/chat-list/chat-list';
import { ChatWindow } from './components/chat-window/chat-window';
import { ChatProfile } from './components/chat-profile/chat-profile';
import { LiveChatService } from './services/live-chat.service';

@Component({
  selector: 'app-live-chat',
  standalone: true,
  imports: [CommonModule, ChatList, ChatWindow, ChatProfile],
  templateUrl: './live-chat.html',
  styleUrl: './live-chat.scss',
})
export class LiveChat {
  constructor(public chatService: LiveChatService) {
    this.chatService.fetchConversations();
  }
}
