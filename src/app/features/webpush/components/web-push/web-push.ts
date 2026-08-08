import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-web-push',
  imports: [CommonModule, FormsModule, InputTextModule, TextareaModule, ButtonModule],
  templateUrl: './web-push.html',
  styleUrl: './web-push.scss',
})
export class WebPush {
  // Inject ChangeDetectorRef into the constructor
  constructor(private cdr: ChangeDetectorRef) {}

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
      dates: 'Oct 12 - Oct 19, 2023',
      flight: 'JFK → DPS (GA882)'
    }
  };

  pushData = {
    title: 'Flight Schedule Change ⚠️',
    message: 'Your flight GA882 schedule has been updated.',
    iconUrl: '',
    clickUrl: 'https://portal.pacetravels.com/itinerary/PT-8832A'
  };

  uploadedFile: { name: string; type: string; url: string } | null = null;

  get isFormValid(): boolean {
    return (
      !!this.user.recipient && this.user.recipient.trim().length > 0 &&
      !!this.pushData.title && this.pushData.title.trim().length > 0 &&
      !!this.pushData.message && this.pushData.message.trim().length > 0
    );
  }

  // FIXED FILE UPLOAD FUNCTION
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
        // Force Angular to update the DOM immediately!
        this.cdr.detectChanges(); 
      };

      reader.readAsDataURL(file);
    }
  }

}
