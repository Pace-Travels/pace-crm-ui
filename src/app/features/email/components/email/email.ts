import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

interface EmailTemplate {
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
export class Email {

  constructor(private cdr: ChangeDetectorRef) {}

  activeTab: 'email' | 'whatsapp' | 'webpush' = 'email';
  showTemplateSelector: boolean = false;

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

  // Pre-built email templates
  templates: EmailTemplate[] = [
    {
      name: 'Flight Schedule Change',
      subject: 'Flight Schedule Change: Bali Retreat (GA882)',
      body: `Hi Alex,\n\nWe wanted to inform you that there has been a slight change in the departure time for your flight to Bali (Flight GA882) on Oct 12.\n\nThe new departure time is 14:30 PM (previously 13:00 PM). Please ensure you arrive at the airport at least 3 hours before the new departure time.\n\nIf you need any assistance with airport transfers due to this change, please reply to this email.\n\nSafe travels,\nThe Pace Travels Team`
    },
    {
      name: 'Booking Confirmation',
      subject: 'Booking Confirmed: Bali Retreat (7 Days)',
      body: `Hi Alex,\n\nYour booking #PT-8832A for Bali Retreat (7 Days) is confirmed!\n\nFlight Details:\nJFK → DPS (GA882)\nDates: Oct 12 - Oct 19, 2026\n\nPlease find your e-tickets attached below.\n\nWarm regards,\nThe Pace Travels Team`
    },
    {
      name: 'Payment Reminder',
      subject: 'Payment Pending for Booking #PT-8832A',
      body: `Hi Alex,\n\nThis is a quick reminder regarding your upcoming trip to Bali. Please complete your balance payment to ensure your reservation remains active.\n\nIf you have already made the payment, please ignore this email.\n\nBest regards,\nThe Pace Travels Team`
    }
  ];

  uploadedFile: { name: string; type: string; url: string } | null = null;

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

}
