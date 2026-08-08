import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'app-docs-viewer',
  standalone: true,
  imports: [CommonModule, MarkdownComponent],
  templateUrl: './docs-viewer.html',
  styleUrl: './docs-viewer.scss'
})
export class DocsViewer implements OnInit {
  markdownContent = `# Pace Messenger Developer & API Documentation

Welcome to the Pace Messenger Platform Documentation.

---

## 🔗 Official Meta WhatsApp Platform Documentation

* **Official Meta Pricing Overview**: [https://developers.facebook.com/docs/whatsapp/pricing/](https://developers.facebook.com/docs/whatsapp/pricing/)
* **Official Regional Rate Cards (Excel & CSV Download)**: [https://developers.facebook.com/docs/whatsapp/pricing/rates-card](https://developers.facebook.com/docs/whatsapp/pricing/rates-card)
* **Meta App Developers Console**: [https://developers.facebook.com/](https://developers.facebook.com/)

---

## 🛠️ Manual Configuration for Meta WABA Integration

1. Go to your [Meta for Developers Dashboard](https://developers.facebook.com/).
2. Select your App and navigate to **WhatsApp > API Setup**.
3. Copy the **Phone Number ID** and **WABA Account ID**.
4. Generate a permanent System User Token for the **Access Token**.

---

## 🧮 Conversation Billing & Category Rules

* **Marketing Templates**: Promotional broadcasts, seasonal offers, and re-engagement campaigns.
* **Utility Templates**: Booking confirmations, flight updates, and transactional receipts.
* **Authentication Templates**: One-Time Passwords (OTP) and security codes.
* **Service Conversations**: Free customer support responses within an open 24-hour window.
* **72-Hour Free Entry Points**: Free messaging window for users clicking Meta Click-to-WhatsApp Ads.
`;

  constructor() {}

  ngOnInit(): void {}
}
