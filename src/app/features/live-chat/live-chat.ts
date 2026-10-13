import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ChatList } from './components/chat-list/chat-list';
import { ChatWindow } from './components/chat-window/chat-window';
import { ChatProfile } from './components/chat-profile/chat-profile';
import { LiveChatService } from './services/live-chat.service';
import { PullContactsModal } from './components/pull-contacts-modal/pull-contacts-modal';

@Component({
  selector: 'app-live-chat',
  standalone: true,
  imports: [CommonModule, ChatList, ChatWindow, ChatProfile, PullContactsModal],
  templateUrl: './live-chat.html',
  styleUrl: './live-chat.scss',
})
export class LiveChat implements OnInit {
  private route = inject(ActivatedRoute);
  showPullContacts = signal(false);

  constructor(public chatService: LiveChatService) {}

  ngOnInit() {
    this.chatService.fetchConversations();
    this.route.queryParams.subscribe(params => {
      if (params['phone']) {
        setTimeout(() => {
          this.chatService.selectConversationByPhone(params['phone']);
        }, 300);
      }
    });
  }
}
