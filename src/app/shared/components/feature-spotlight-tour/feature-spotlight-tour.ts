import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingService } from '../../services/onboarding.service';

export interface TourStep {
  step: number;
  title: string;
  icon: string;
  color: string;
  badge: string;
  description: string;
  highlights: string[];
  route: string;
  actionText: string;
}

@Component({
  selector: 'app-feature-spotlight-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-spotlight-tour.html'
})
export class FeatureSpotlightTourComponent {
  onboardingService = inject(OnboardingService);
  router = inject(Router);

  currentStepIndex = signal<number>(0);

  tourSteps: TourStep[] = [
    {
      step: 1,
      title: 'Omnichannel Inbox & Live Chat',
      icon: 'fa-comments',
      color: '#38bdf8',
      badge: 'Real-Time Messaging',
      description: 'Centralize all customer conversations across WhatsApp and digital channels with typing indicators, template shortcuts, media attachments, and canned responses.',
      highlights: [
        'Instant multi-channel inbox',
        'Canned quick responses & media support',
        'Assign chats & view contact context'
      ],
      route: '/chat',
      actionText: 'Explore Inbox'
    },
    {
      step: 2,
      title: 'Message Templates & AI Content Generator',
      icon: 'fa-layer-group',
      color: '#8b5cf6',
      badge: 'Meta Approved Templates',
      description: 'Create, submit for Meta approval, and generate highly converting WhatsApp message templates using our integrated AI Content Generator.',
      highlights: [
        'Direct Meta API template submission',
        'AI tone & prompt template generation',
        'Dynamic variables & header/footer buttons'
      ],
      route: '/templates',
      actionText: 'View Templates'
    },
    {
      step: 3,
      title: 'Bulk Broadcast Campaigns',
      icon: 'fa-paper-plane',
      color: '#f59e0b',
      badge: 'High Delivery Rates',
      description: 'Launch targeted marketing campaigns and automated broadcast announcements to thousands of contacts with real-time delivery and read tracking.',
      highlights: [
        'CSV contact bulk importer',
        'Scheduled broadcast dispatching',
        'Live campaign performance analytics'
      ],
      route: '/campaigns',
      actionText: 'Go to Campaigns'
    },
    {
      step: 4,
      title: 'Live Webhook Events Radar',
      icon: 'fa-radar',
      color: '#ec4899',
      badge: 'System Monitoring',
      description: 'Track incoming WhatsApp webhook payloads, delivery status updates, message failures, and live system activity in real-time.',
      highlights: [
        'Real-time streaming event log',
        'Status code diagnostics & retry logs',
        'Filter events by category & project'
      ],
      route: '/events-radar',
      actionText: 'Open Events Radar'
    },
    {
      step: 5,
      title: 'Brand Projects & Meta TSP Governance',
      icon: 'fa-diagram-project',
      color: '#10b981',
      badge: 'Multi-Account Hub',
      description: 'Manage multiple Facebook Business Apps, Meta Tech Solution Provider (TSP) credentials, WABAs, phone numbers, and usage meters in one place.',
      highlights: [
        'Multi-project & WABA switching',
        'Tier messaging quota monitoring',
        'Role-based permissions & API access'
      ],
      route: '/manage',
      actionText: 'Platform Settings'
    }
  ];

  nextStep() {
    if (this.currentStepIndex() < this.tourSteps.length - 1) {
      this.currentStepIndex.update(i => i + 1);
    } else {
      this.closeTour();
    }
  }

  prevStep() {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(i => i - 1);
    }
  }

  closeTour() {
    this.onboardingService.closeFeatureSpotlight();
    this.currentStepIndex.set(0);
  }

  jumpToFeature(route: string) {
    this.closeTour();
    this.router.navigate([route]);
  }
}
