import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-integrations-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './integrations-view.html',
  styleUrl: './integrations-view.scss',
})
export class IntegrationsView {
  apps = [
    { name: 'WhatsApp Link Generator', desc: 'Create shareable links & QR for your WA business number', icon: 'fa-solid fa-link text-blue', isNew: false },
    { name: 'WhatsApp Website Widget', desc: 'Drive WhatsApp sales with personalised CTAs', icon: 'fa-brands fa-whatsapp text-green', isNew: false },
    { name: 'Google Sheets', desc: 'Sync contacts from Google Sheets to Pace Messenger automatically, without uploading CSVs.', icon: 'fa-solid fa-file-excel text-green', isNew: true },
    { name: 'Shopify', desc: 'Provide live chat support to your customers & boost cart recovery', icon: 'fa-brands fa-shopify text-green', isNew: false },
    { name: 'WooCommerce', desc: 'Boost your cart recovery & reengage with your customers to upsell', icon: 'fa-solid fa-cart-shopping text-purple', isNew: false },
    { name: 'Razorpay', desc: 'Send payment links & subscription updates to drive quick payments', icon: 'fa-solid fa-money-bill-transfer text-blue', isNew: true },
    { name: 'PayU', desc: 'Send payment links & subscription updates to drive quick payments', icon: 'fa-solid fa-credit-card text-orange', isNew: true },
    { name: 'Zoho', desc: 'Drive WhatsApp communication to your Leads and Customers on Zoho seamlessly.', icon: 'fa-solid fa-z text-blue', isNew: true },
    { name: 'Pabbly', desc: 'Integrate with 800+ apps through direct integration', icon: 'fa-solid fa-p text-green', isNew: false }
  ];
}
