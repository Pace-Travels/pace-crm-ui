import { Component, AfterViewInit, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { gsap } from 'gsap';

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

@Component({
  selector: 'app-landing-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterModule],
  templateUrl: './landing-view.html',
  styleUrl: './landing-view.scss',
})
export class LandingView implements AfterViewInit {
  userInput = signal('');
  isTyping = signal(false);

  chatHistory = signal<ChatMessage[]>([
    {
      sender: 'bot',
      text: '👋 Hi! Welcome to QuoteDesks Messenger. I am your Gemini AI Sales Assistant. How can I help boost your WhatsApp revenue today?',
      time: '10:00 AM'
    }
  ]);

  samplePrompts = [
    'What features are included in QuoteDesks Messenger?',
    'How does multi-tenant agent walling out work?',
    'What are the seat allocation limits for team plans?'
  ];

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    gsap.from(this.el.nativeElement.querySelector('.hero-title'), { duration: 1, y: 40, opacity: 0, ease: 'power3.out', delay: 0.1 });
    gsap.from(this.el.nativeElement.querySelector('.hero-subtitle'), { duration: 1, y: 25, opacity: 0, ease: 'power3.out', delay: 0.3 });
    gsap.from(this.el.nativeElement.querySelector('.hero-cta'), { duration: 1, y: 20, opacity: 0, ease: 'power3.out', delay: 0.4 });
    gsap.from(this.el.nativeElement.querySelector('.chatbot-simulator-card'), { duration: 1.2, scale: 0.96, opacity: 0, ease: 'power3.out', delay: 0.6 });
  }

  sendSamplePrompt(promptText: string) {
    this.processUserMessage(promptText);
  }

  sendMessage() {
    const text = this.userInput().trim();
    if (!text) return;
    this.userInput.set('');
    this.processUserMessage(text);
  }

  private processUserMessage(text: string) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Push user message
    this.chatHistory.update(prev => [...prev, { sender: 'user', text, time: timeStr }]);
    this.isTyping.set(true);

    setTimeout(() => {
      let botReply = 'QuoteDesks Messenger offers automated WhatsApp broadcasts, live shared inbox, multi-tenant agent walling out, and Gemini AI bots!';
      const lower = text.toLowerCase();

      if (lower.includes('walling out') || lower.includes('multi-tenant') || lower.includes('privacy')) {
        botReply = '🔒 Multi-tenant RBAC walling out ensures sales agents only view their owned/assigned contacts. Agency Admins retain full visibility across all staff!';
      } else if (lower.includes('seat') || lower.includes('pricing') || lower.includes('plan')) {
        botReply = '💳 QuoteDesks seat tiers: Starter (1 seat), Standard (2 seats), Premium (3 seats), and Enterprise (5 seats). Invitations dispatch automatically via AWS SES!';
      } else if (lower.includes('feature') || lower.includes('broadcast') || lower.includes('inbox')) {
        botReply = '🚀 Key Features: Official WhatsApp broadcasts, Meta Click-to-WhatsApp Ads integration, Visual Flow Builder, and Gemini AI agent auto-responders.';
      }

      this.isTyping.set(false);
      this.chatHistory.update(prev => [...prev, { sender: 'bot', text: botReply, time: timeStr }]);
    }, 1000);
  }
}
