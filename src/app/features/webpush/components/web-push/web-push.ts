import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

// Firebase Push Notification Service
import { FcmWebpushService } from '../../services/fcm-webpush.service';  // Adjust path if needed

@Component({
  selector: 'app-web-push',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    InputTextModule, 
    TextareaModule, 
    ButtonModule
  ],
  templateUrl: './web-push.html',
  styleUrl: './web-push.scss',
})
export class WebPush implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  public FcmWebpushService = inject(FcmWebpushService);

  // Active User / Traveler Context
  user = {
    userId: 'user_alex_rivera',
    recipient: 'Alex Rivera (Booking #PT-8832A)',
    name: 'Alex Rivera',
    initials: 'AR',
    email: 'alex.r@example.com',
    phone: '+1 415 555 0198',
    tier: 'Gold Tier',
    booking: {
      title: 'Bali Retreat (7 Days)',
      id: '#PT-8832A',
      dates: 'Oct 12 - Oct 19, 2023',
      flight: 'JFK → DPS (GA882)'
    }
  };

  // Form Model matching [(ngModel)]
  pushData = {
    title: 'Flight Schedule Change ⚠️',
    message: 'Your flight GA882 schedule has been updated.',
    iconUrl: '',
    clickUrl: 'https://portal.pacetravels.com/itinerary/PT-8832A'
  };

  // Uploaded Attachment File State
  uploadedFile: { name: string; type: string; url: string } | null = null;
  
  // UI Loading State
  isSending = false;

  async ngOnInit(): Promise<void> {
    // Check permission / request token automatically on load
    await this.enableNotifications();
  }

  /**
   * Request FCM Push Permission from Browser
   */
  async enableNotifications(): Promise<void> {
    await this.FcmWebpushService.requestPermissionAndSaveToken(this.user.userId);
    this.cdr.detectChanges();
  }

  /**
   * Form Validation Getter
   */
  get isFormValid(): boolean {
    return (
      !!this.user.recipient && this.user.recipient.trim().length > 0 &&
      !!this.pushData.title && this.pushData.title.trim().length > 0 &&
      !!this.pushData.message && this.pushData.message.trim().length > 0
    );
  }

  /**
   * File Attachment Handler with Reactive DOM Update
   */
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
        // Force Angular to render image/PDF preview instantly
        this.cdr.detectChanges(); 
      };

      reader.readAsDataURL(file);
    }
  }

  /**
   * Dispatch Push Notification to Node.js Server
   */
  sendNotification(): void {
    if (!this.isFormValid) return;

    const token = this.FcmWebpushService.fcmToken();

    if (!token) {
      alert('Notification permission missing! Please enable push permissions first.');
      return;
    }

    this.isSending = true;

    // Construct backend payload
    const payload = {
      token: token,
      userId: this.user.userId,
      recipient: this.user.recipient,
      title: this.pushData.title,
      body: this.pushData.message,
      icon: this.uploadedFile?.url || this.pushData.iconUrl || '/favicon.ico',
      clickUrl: this.pushData.clickUrl
    };

    console.log('Sending WebPush Payload:', payload);

    // Express backend API call
    this.http.post('http://localhost:3000/api/send-notification', payload).subscribe({
      next: (res) => {
        console.log('Notification sent:', res);
        alert('Push notification sent successfully!');
        this.isSending = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to send push notification:', err);
        alert('Error sending push notification.');
        this.isSending = false;
        this.cdr.detectChanges();
      }
    });
  }
}