import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-license-warning-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './license-warning-banner.html',
  styleUrl: './license-warning-banner.scss'
})
export class LicenseWarningBannerComponent implements OnInit {
  private api = inject(ApiService);

  showBanner = signal<boolean>(false);
  bannerType = signal<'GRACE_PERIOD' | 'PAYMENT_REQUIRED' | 'EXPIRED'>('GRACE_PERIOD');
  bannerMessage = signal<string>('');
  daysRemaining = signal<number>(0);

  ngOnInit(): void {
    this.checkLicenseWarning();
  }

  checkLicenseWarning(): void {
    // Check local storage or header warning flags
    const warningMsg = localStorage.getItem('license_warning_msg');
    const warningType = localStorage.getItem('license_warning_type') as any;

    if (warningMsg && warningType) {
      this.bannerMessage.set(warningMsg);
      this.bannerType.set(warningType);
      this.showBanner.set(true);
    }
  }

  dismiss(): void {
    this.showBanner.set(false);
  }
}
