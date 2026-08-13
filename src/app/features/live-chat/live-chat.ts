import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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
export class LiveChat implements OnInit {
  private route = inject(ActivatedRoute);

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
