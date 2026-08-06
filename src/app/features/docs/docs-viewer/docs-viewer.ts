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
  markdownContent = `# Developer Documentation

Welcome to the Pace CRM Developer Documentation.

## Manual Configuration for Facebook Auth

1. Go to your [Meta for Developers](https://developers.facebook.com/) dashboard.
2. Select your App and navigate to **WhatsApp > API Setup**.
3. Copy the **Phone Number ID** and **WABA Account ID**.
4. Generate a permanent System User Token for the **Access Token**.

> Need more help? Contact our support team.
`;

  constructor() {}

  ngOnInit(): void {}
}
