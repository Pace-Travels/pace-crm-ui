import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

import { FcmWebpushService } from '../../services/fcm-webpush.service';

// 🔹 Device Interface (Service mein na ho toh error se bachne ke liye)
export interface DeviceItem {
  idKey: string;
  identityToken: string;
  displayName?: string;
  operatingSystem?: string;
  browser?: string;
  ipAddress?: string;
  deviceType?: string;
  access?: boolean;
}

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
  public fcmWebpushService = inject(FcmWebpushService);

  deviceList: DeviceItem[] = [];
  selectedDeviceIdKey: string = ''; // Dropdown ki selected idKey
  selectedDevice: DeviceItem | null = null;
  isLoadingDevices = false;

  user = {
    recipient: '',
    name: 'Select a Device',
    initials: '?',
    email: 'N/A',
    phone: 'N/A',
    tier: 'N/A',
    booking: {
      title: 'Bali Retreat (7 Days)',
      id: '#PT-8832A',
      dates: 'Oct 12 - Oct 19, 2026',
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
  isSending = false;

  ngOnInit(): void {
    // Sirf registered devices fetch honge (No local permission/token calls)
    this.fetchRegisteredDevices();
  }

  fetchRegisteredDevices(): void {
    this.isLoadingDevices = true;
    this.fcmWebpushService.getRegisteredDevices().subscribe({
      next: (response: any) => {
        if (response && response.success) {
          this.deviceList = response.data || [];
        } else if (response && Array.isArray(response.data)) {
          this.deviceList = response.data;
        } else if (Array.isArray(response)) {
          this.deviceList = response;
        }
        this.isLoadingDevices = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch registered devices:', err);
        this.isLoadingDevices = false;
        this.cdr.detectChanges();
      }
    });
  }

  onDeviceChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedIdKey = selectElement.value;

    const device = this.deviceList.find((d) => d.idKey === selectedIdKey) || null;
    this.selectedDevice = device;

    if (device) {
      this.user.recipient = device.idKey;
      this.user.name = device.displayName || device.browser || 'Registered Device';
      this.user.initials = device.browser ? device.browser.charAt(0).toUpperCase() : 'D';
      this.user.email = `IP: ${device.ipAddress || 'Unknown'}`;
      this.user.phone = `OS: ${device.operatingSystem || 'N/A'}`;
      this.user.tier = device.deviceType ? device.deviceType.toUpperCase() : 'DEVICE';
    } else {
      this.user.recipient = '';
      this.user.name = 'Select a Device';
      this.user.initials = '?';
      this.user.email = 'N/A';
      this.user.phone = 'N/A';
      this.user.tier = 'N/A';
    }

    this.cdr.detectChanges();
  }

  get isFormValid(): boolean {
    return (
      !!this.selectedDeviceIdKey &&
      !!this.pushData.title && this.pushData.title.trim().length > 0 &&
      !!this.pushData.message && this.pushData.message.trim().length > 0
    );
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

  sendNotification(): void {
    if (!this.isFormValid || !this.selectedDeviceIdKey) return;

    if (this.selectedDevice && this.selectedDevice.access === false) {
      alert('Warning: This user has blocked/disabled notifications on their device!');
      return;
    }

    this.isSending = true;

    const payload = {
      idKey: this.selectedDeviceIdKey,
      title: this.pushData.title,
      body: this.pushData.message,
      icon: this.uploadedFile?.url || this.pushData.iconUrl || '/favicon.ico',
      clickUrl: this.pushData.clickUrl
    };
    console.log('=====================>>>>')
    console.log(payload)
    console.log('=====================>>>>')


    this.fcmWebpushService.sendNotificationByIdKey(payload).subscribe({
      next: (res) => {
        console.log('Notification Sent:', res);
        alert('Push notification sent successfully!');
        this.isSending = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to send push notification:', err);
        const errorMessage = err.error?.message || err.error?.error || 'Error sending push notification.';
        alert(`Failed: ${errorMessage}`);
        this.isSending = false;
        this.cdr.detectChanges();
      }
    });
  }
}