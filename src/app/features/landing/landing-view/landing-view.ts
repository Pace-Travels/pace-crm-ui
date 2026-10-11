import { Component, AfterViewInit, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeService } from '../../../shared/services/theme.service';
import { ThreeGlobeCanvas } from '../components/three-globe-canvas/three-globe-canvas';

gsap.registerPlugin(ScrollTrigger);

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

@Component({
  selector: 'app-landing-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterModule, ThreeGlobeCanvas],
  templateUrl: './landing-view.html',
  styleUrl: './landing-view.scss',
})
export class LandingView implements AfterViewInit {
  @ViewChild(ThreeGlobeCanvas) globeCanvas?: ThreeGlobeCanvas;

  themeService = inject(ThemeService);
  userInput = signal('');
  isTyping = signal(false);
  isAnnual = signal(false);

  toggleBilling() {
    this.isAnnual.set(!this.isAnnual());
  }

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
    this.initGsapAnimations();
  }

  private initGsapAnimations() {
    const nativeEl = this.el.nativeElement;

    // Hero entrance animations
    gsap.from(nativeEl.querySelector('.hero-title'), {
      duration: 1,
      y: 40,
      opacity: 0,
      ease: 'power3.out',
      delay: 0.1
    });

    gsap.from(nativeEl.querySelector('.hero-subtitle'), {
      duration: 1,
      y: 25,
      opacity: 0,
      ease: 'power3.out',
      delay: 0.3
    });

    gsap.from(nativeEl.querySelector('.hero-cta'), {
      duration: 1,
      y: 20,
      opacity: 0,
      ease: 'power3.out',
      delay: 0.4
    });

    gsap.from(nativeEl.querySelector('.chatbot-simulator-card'), {
      duration: 1.2,
      scale: 0.96,
      opacity: 0,
      ease: 'power3.out',
      delay: 0.6
    });

    // ScrollTrigger animations for feature cards
    const featureCards = nativeEl.querySelectorAll('.feature-card');
    if (featureCards.length > 0) {
      gsap.from(featureCards, {
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        },
        duration: 0.8,
        y: 45,
        opacity: 0,
        stagger: 0.15,
        ease: 'power3.out'
      });
    }

    // ScrollTrigger animation for pricing cards
    const pricingCards = nativeEl.querySelectorAll('.pricing-card');
    if (pricingCards.length > 0) {
      gsap.from(pricingCards, {
        scrollTrigger: {
          trigger: '.pricing-grid',
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        },
        duration: 0.9,
        y: 50,
        opacity: 0,
        stagger: 0.2,
        ease: 'power3.out'
      });
    }

    // ScrollTrigger binding to update 3D Globe camera/scale progress on scroll
    ScrollTrigger.create({
      trigger: nativeEl.querySelector('.landing-container'),
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        if (this.globeCanvas) {
          this.globeCanvas.updateScrollProgress(self.progress);
        }
      }
    });
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
