import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';

export interface RateMatrix {
  country: string;
  code: string;
  flag: string;
  rates: {
    MARKETING: number;
    UTILITY: number;
    AUTHENTICATION: number;
    SERVICE: number;
  };
}

@Component({
  selector: 'app-whatsapp-cost-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-cost-calculator.html',
  styleUrl: './whatsapp-cost-calculator.scss',
})
export class WhatsappCostCalculator implements OnInit {
  
  senderCountry = signal<string>('IN');
  targetCountry = signal<string>('AE');
  category = signal<'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'SERVICE'>('MARKETING');
  recipientCount = signal<number>(500);

  // Official Facebook WhatsApp Meta Conversation Rates (per 24-hr window in INR)
  ratesMap: Record<string, RateMatrix> = {
    IN: {
      country: 'India (+91)',
      code: 'IN',
      flag: '🇮🇳',
      rates: { MARKETING: 0.78, UTILITY: 0.15, AUTHENTICATION: 0.15, SERVICE: 0.30 }
    },
    AE: {
      country: 'UAE / Dubai (+971)',
      code: 'AE',
      flag: '🇦🇪',
      rates: { MARKETING: 2.65, UTILITY: 0.85, AUTHENTICATION: 0.85, SERVICE: 1.10 }
    },
    GB: {
      country: 'United Kingdom (+44)',
      code: 'GB',
      flag: '🇬🇧',
      rates: { MARKETING: 3.90, UTILITY: 1.20, AUTHENTICATION: 1.20, SERVICE: 1.80 }
    },
    US: {
      country: 'USA / Canada (+1)',
      code: 'US',
      flag: '🇺🇸',
      rates: { MARKETING: 1.95, UTILITY: 0.60, AUTHENTICATION: 0.60, SERVICE: 0.90 }
    },
    ROW: {
      country: 'Rest of World',
      code: 'ROW',
      flag: '🌐',
      rates: { MARKETING: 4.50, UTILITY: 1.50, AUTHENTICATION: 1.50, SERVICE: 2.20 }
    }
  };

  constructor(public contactService: ContactService) {}

  ngOnInit() {
    if (this.contactService.contacts().length > 0) {
      this.recipientCount.set(this.contactService.contacts().length);
    }
  }

  activeRate = computed(() => {
    const matrix = this.ratesMap[this.targetCountry()] || this.ratesMap['IN'];
    return matrix.rates[this.category()] || 0.78;
  });

  baseTotal = computed(() => {
    return Math.round(this.recipientCount() * this.activeRate() * 100) / 100;
  });

  gstAmount = computed(() => {
    return Math.round(this.baseTotal() * 0.18 * 100) / 100;
  });

  finalTotal = computed(() => {
    return Math.round((this.baseTotal() + this.gstAmount()) * 100) / 100;
  });

  effectiveCostPerContact = computed(() => {
    if (this.recipientCount() <= 0) return 0;
    return Math.round((this.finalTotal() / this.recipientCount()) * 100) / 100;
  });

  setPreset(count: number) {
    this.recipientCount.set(count);
  }

  useContactListCount() {
    const total = this.contactService.filteredContacts().length || this.contactService.contacts().length || 100;
    this.recipientCount.set(total);
  }
}
