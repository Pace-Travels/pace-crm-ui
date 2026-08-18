import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

import { FcmWebpushService } from '../../services/fcm-webpush.service';
import Swal from 'sweetalert2';

export interface DeviceItem {
  idKey?: string;
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
  selectedDeviceIdKey: string = '';
  selectedDevice: DeviceItem | null = null;
  isLoadingDevices = false;

  // 🔹 Bulk Send State
  isBulkSend: boolean = false;

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

  onBulkToggleChange(): void {
    if (this.isBulkSend) {
      this.selectedDeviceIdKey = '';
      this.selectedDevice = null;
      this.user.recipient = '';
      this.user.name = 'All Registered Devices';
      this.user.initials = 'ALL';
      this.user.email = 'Bulk Mode';
      this.user.phone = 'N/A';
      this.user.tier = 'BULK';
    } else {
      this.user.name = 'Select a Device';
      this.user.initials = '?';
      this.user.email = 'N/A';
      this.user.phone = 'N/A';
      this.user.tier = 'N/A';
    }
    this.cdr.detectChanges();
  }

  onDeviceChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedToken = selectElement.value;

    const device = this.deviceList.find((d) => d.identityToken === selectedToken || d.idKey === selectedToken) || null;
    this.selectedDevice = device;

    if (device) {
      this.user.recipient = device.identityToken || device.idKey || '';
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
    const isTargetValid = this.isBulkSend || !!this.selectedDeviceIdKey;
    return (
      isTargetValid &&
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
    if (!this.isFormValid) return;

    // Single device permission validation
    if (!this.isBulkSend && this.selectedDevice && this.selectedDevice.access === false) {
      Swal.fire('Access Denied', 'This user has disabled/blocked notification permission!', 'warning');
      return;
    }

    this.isSending = true;

    // Common Payload Structure
    const payload = {
      idKey: this.selectedDeviceIdKey,
      title: this.pushData.title,
      body: this.pushData.message,
      icon: this.pushData.iconUrl || '/favicon.ico',
      attachmentUrl: this.uploadedFile?.url || null,
      clickUrl: this.pushData.clickUrl
    };

    // 🔹 CHECKBOX CONDITION ROUTING
    // Checkbox TRUE -> sendBulkNotification
    // Checkbox FALSE -> sendSingleNotification (Old Flow)
    const apiCall$ = this.isBulkSend
      ? this.fcmWebpushService.sendBulkNotification(payload)
      : this.fcmWebpushService.sendSingleNotification(payload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.isSending = false;

        if (this.isBulkSend) {
          // 🔹 BULK RESPONSE HANDLING
          const activeCount = res?.data?.activeDevicesCount ?? res?.data?.totalCount ?? 0;
          const successCount = res?.data?.successCount ?? 0;
          const failureCount = res?.data?.failureCount ?? 0;
          const logs = res?.data?.deliveryLogs || [];

          let logTableHtml = `
            <div style="font-size: 13px; margin-bottom: 10px; text-align: left;">
              <p style="margin: 4px 0;"><b>Active Devices Target:</b> ${activeCount}</p>
              <p style="margin: 4px 0; color: #10B981;"><b>Successfully Delivered:</b> ${successCount}</p>
              <p style="margin: 4px 0; color: #EF4444;"><b>Failed / Disabled:</b> ${failureCount}</p>
            </div>
          `;

          if (logs.length > 0) {
            logTableHtml += `
              <div style="max-height: 180px; overflow-y: auto; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 6px;">
                <table class="table table-sm text-left" style="font-size: 12px; width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="border-bottom: 1px solid #ddd;">
                      <th style="padding: 6px;">Device Info</th>
                      <th style="padding: 6px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${logs.map((log: any) => `
                      <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 6px;">${log.deviceInfo}</td>
                        <td style="padding: 6px;"><b style="color: ${log.status === 'DELIVERED' ? '#10B981' : '#EF4444'};">${log.status}</b></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }

          Swal.fire({
            title: 'Bulk Dispatch Completed',
            html: logTableHtml,
            icon: 'success'
          });

        } else {
          // 🔹 OLD SINGLE DEVICE RESPONSE HANDLING
          Swal.fire({
            title: 'Push Sent Successfully!',
            text: res?.message || `Notification dispatched to device: ${this.selectedDeviceIdKey}`,
            icon: 'success'
          });
        }

        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to send push notification:', err);
        this.isSending = false;

        const errorMessage = err?.error?.error || err?.error?.message || err?.message || 'Error sending push notification.';
        Swal.fire('Failed', errorMessage, 'error');

        this.cdr.detectChanges();
      }
    });
  }
}