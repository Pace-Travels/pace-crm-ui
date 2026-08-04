import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveChatService } from '../../services/live-chat.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss',
})
export class ChatWindow {
  constructor(public chatService: LiveChatService) {}
}
