import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ApiService } from '../../../../shared/services/api.service';
import Swal from 'sweetalert2';

interface EmailTemplate {
  id?: number;
  name: string;
  subject: string;
  body: string;
}

@Component({
  selector: 'app-email',
  imports: [CommonModule, FormsModule, InputTextModule, TextareaModule, ButtonModule],
  templateUrl: './email.html',
  styleUrl: './email.scss',
})
export class Email implements OnInit {
  private api: ApiService = inject(ApiService);
  constructor(private cdr: ChangeDetectorRef) {}

  activeTab: 'email' | 'whatsapp' | 'webpush' = 'email';
  showTemplateSelector: boolean = false;
  isSending: boolean = false;

  user = {
    recipient: 'Alex Rivera (Booking #PT-8832A)',
    name: 'Alex Rivera',
    initials: 'AR',
    email: 'alex.r@example.com',
    phone: '+1 415 555 0198',
    tier: 'Gold Tier',
    booking: {
      title: 'Bali Retreat (7 Days)',
      id: '#PT-8832A',
      dates: 'Oct 12 - Oct 19, 2026',
      flight: 'JFK → DPS (GA882)'
    }
  };

  emailData = {
    subject: 'Important update regarding your upcoming flight to Bali',
    body: `The new departure time is 14:30 PM (previously 13:00 PM). Please ensure you arrive at the airport at least 3 hours before the new departure time.\n\nIf you need any assistance with airport transfers due to this change, please reply to this email.\n\nSafe travels,\nThe Pace Travels Team`
  };

  templates: EmailTemplate[] = [];

  uploadedFile: { name: string; type: string; url: string } | null = null;

  ngOnInit(): void {
    this.fetchEmailTemplates();
  }

  fetchEmailTemplates(): void {
    this.api.get<any>('/email/templates').subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          this.templates = res.data;
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => console.warn('Failed to load email templates from API', err)
    });
  }

  get isFormValid(): boolean {
    return (
      !!this.user.recipient && this.user.recipient.trim().length > 0 &&
      !!this.emailData.subject && this.emailData.subject.trim().length > 0 &&
      !!this.emailData.body && this.emailData.body.trim().length > 0
    );
  }

  toggleTemplateSelector(): void {
    this.showTemplateSelector = !this.showTemplateSelector;
  }

  applyTemplate(template: EmailTemplate): void {
    this.emailData.subject = template.subject;
    this.emailData.body = template.body;
    this.showTemplateSelector = false;
    this.cdr.detectChanges();
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.uploadedFile = {
          name: file.name,
          type: file.type,
          url: e.target?.result as string
        };
        this.cdr.detectChanges();
      };

      reader.readAsDataURL(file);
    }
  }

  sendEmail(): void {
    if (!this.isFormValid || this.isSending) return;

    this.isSending = true;

    const payload = {
      recipient: this.user.email || this.user.recipient,
      subject: this.emailData.subject,
      body: this.emailData.body,
      replyTo: 'admin@quotedesks.com'
    };

    this.api.post<any>('/email/send', payload).subscribe({
      next: (res: any) => {
        this.isSending = false;
        Swal.fire({
          title: 'Email Sent!',
          html: `<p>${res.message || 'Email dispatched successfully via SES'}</p>
                 <p style="font-size: 12px; color: #64748b;"><b>Reply Tunnel:</b> admin@quotedesks.com</p>`,
          icon: 'success'
        });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSending = false;
        const msg = err.error?.error || err.message || 'Failed to send email';
        Swal.fire('Email Dispatch Error', msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }
}
