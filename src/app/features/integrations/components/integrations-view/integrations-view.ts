import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface IntegrationApp {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: 'CHANNELS' | 'ECOMMERCE' | 'PAYMENTS' | 'AUTOMATION' | 'CRM';
  isNew: boolean;
  status: 'CONNECTED' | 'DISCONNECTED';
}

@Component({
  selector: 'app-integrations-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './integrations-view.html',
  styleUrl: './integrations-view.scss',
})
export class IntegrationsView implements OnInit {
  api = inject(ApiService);

  activeFilter = signal<'ALL' | 'CHANNELS' | 'ECOMMERCE' | 'PAYMENTS' | 'AUTOMATION'>('ALL');
  
  // WhatsApp Link Modal state
  showWaLinkModal = signal(false);
  waLinkPhone = '+919876543210';
  waLinkMessage = 'Hello Pace Travels, I would like to inquire about tour packages!';
  generatedWaLink = signal('');
  qrCodeUrl = signal('');

  // Generic Integration Modal state
  showConfigModal = signal(false);
  selectedApp = signal<IntegrationApp | null>(null);
  configApiKey = '';
  configSecret = '';
  configWebhookUrl = '';

  apps = signal<IntegrationApp[]>([
    { id: 'wa-link', name: 'WhatsApp Link Generator', desc: 'Create shareable links & QR codes for your business number', icon: 'fa-solid fa-link text-blue', category: 'CHANNELS', isNew: false, status: 'CONNECTED' },
    { id: 'wa-widget', name: 'WhatsApp Website Widget', desc: 'Drive website sales with personalized chat widgets & CTAs', icon: 'fa-brands fa-whatsapp text-green', category: 'CHANNELS', isNew: false, status: 'CONNECTED' },
    { id: 'shopify', name: 'Shopify Store Sync', desc: 'Sync Shopify products, abandoned carts & order status updates', icon: 'fa-brands fa-shopify text-green', category: 'ECOMMERCE', isNew: false, status: 'DISCONNECTED' },
    { id: 'woocommerce', name: 'WooCommerce Store Sync', desc: 'Boost cart recovery & re-engage customers with automated WA receipts', icon: 'fa-solid fa-cart-shopping text-purple', category: 'ECOMMERCE', isNew: false, status: 'DISCONNECTED' },
    { id: 'razorpay', name: 'Razorpay Payment Gateway', desc: 'Send automated WhatsApp payment links & subscription receipts', icon: 'fa-solid fa-money-bill-transfer text-blue', category: 'PAYMENTS', isNew: true, status: 'DISCONNECTED' },
    { id: 'payu', name: 'PayU Payment Gateway', desc: 'Drive quick payment collection via interactive WhatsApp links', icon: 'fa-solid fa-credit-card text-orange', category: 'PAYMENTS', isNew: true, status: 'DISCONNECTED' },
    { id: 'sheets', name: 'Google Sheets Live Sync', desc: 'Sync contacts from Google Sheets automatically without uploading CSVs', icon: 'fa-solid fa-file-excel text-green', category: 'AUTOMATION', isNew: true, status: 'DISCONNECTED' },
    { id: 'pabbly', name: 'Pabbly Connect / Zapier', desc: 'Integrate with 800+ apps through automated webhooks & triggers', icon: 'fa-solid fa-bolt text-yellow', category: 'AUTOMATION', isNew: false, status: 'CONNECTED' }
  ]);

  ngOnInit() {
    this.fetchConnectedIntegrations();
  }

  fetchConnectedIntegrations() {
    this.api.get<any>('integrations/list').subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const dbList = res.data;
          const updated = this.apps().map(app => {
            const match = dbList.find((item: any) => item.appId === app.id);
            if (match) {
              return { ...app, status: match.status as 'CONNECTED' | 'DISCONNECTED' };
            }
            return app;
          });
          this.apps.set(updated);
        }
      },
      error: () => console.warn('Could not fetch connected integrations status')
    });
  }

  get filteredApps() {
    const filter = this.activeFilter();
    if (filter === 'ALL') return this.apps();
    return this.apps().filter(a => a.category === filter);
  }

  openConfig(app: IntegrationApp) {
    if (app.id === 'wa-link') {
      this.generateWaLink();
      this.showWaLinkModal.set(true);
      return;
    }

    this.selectedApp.set(app);
    this.configApiKey = '';
    this.configSecret = '';
    const cleanBase = this.api.baseUrl.replace(/\/+$/, '');
    this.configWebhookUrl = `${cleanBase}/integrations/webhook/${app.id}`;
    this.showConfigModal.set(true);
  }

  generateWaLink() {
    const cleanPhone = this.waLinkPhone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(this.waLinkMessage);
    const link = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    this.generatedWaLink.set(link);
    this.qrCodeUrl.set(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`);
  }

  copyLink(text: string) {
    navigator.clipboard.writeText(text);
    Swal.fire('Copied!', 'Link copied to clipboard.', 'success');
  }

  saveIntegration() {
    const app = this.selectedApp();
    if (!app) return;

    const payload = {
      appId: app.id,
      name: app.name,
      apiKey: this.configApiKey,
      apiSecret: this.configSecret,
      status: 'CONNECTED'
    };

    this.api.post<any>('integrations/save', payload).subscribe({
      next: (res) => {
        if (res.success) {
          const updated = this.apps().map(a => a.id === app.id ? { ...a, status: 'CONNECTED' as const } : a);
          this.apps.set(updated);
          this.showConfigModal.set(false);
          Swal.fire('Integration Connected', `${app.name} has been configured and connected successfully!`, 'success');
        }
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Failed to save integration config', 'error');
      }
    });
  }
}
