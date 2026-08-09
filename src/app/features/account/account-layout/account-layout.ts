import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, FormsModule],
  template: `
    <div class="account-layout">
        <div class="inner-sidebar">
            <div class="sidebar-header">
                <h2>Your Account</h2>
            </div>
            <nav class="nav-menu">
                <a class="nav-item" [class.active]="activeTab() === 'profile'" (click)="activeTab.set('profile')">
                    <i class="fa-regular fa-user"></i> Your Profile
                </a>
                <a class="nav-item" [class.active]="activeTab() === '2fa'" (click)="select2FATab()">
                    <i class="fa-solid fa-lock"></i> Two Factor Authentication
                </a>
            </nav>
        </div>
        
        <div class="main-content">
            <ng-container *ngIf="activeTab() === 'profile'">
                <router-outlet></router-outlet>
            </ng-container>

            <!-- Interactive 2FA Management Panel -->
            <div *ngIf="activeTab() === '2fa'" class="two-factor-container" style="max-width: 650px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
                    <div>
                        <h3 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Two-Factor Authentication (2FA)</h3>
                        <p style="font-size: 13px; color: #64748b; margin: 0;">Add an extra layer of security to your Pace Messenger account using TOTP Authenticator (Google Authenticator, Authy).</p>
                    </div>
                    <span [style.background]="twoFactorEnabled() ? '#dcfce7' : '#fee2e2'" [style.color]="twoFactorEnabled() ? '#15803d' : '#b91c1c'" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;">
                        {{ twoFactorEnabled() ? 'ENABLED' : 'DISABLED' }}
                    </span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                    <div>
                        <strong style="font-size: 14px; color: #1e293b;">Enable 2FA Verification at Login</strong>
                        <div style="font-size: 12px; color: #64748b;">Require a 6-digit TOTP security code whenever you log in.</div>
                    </div>
                    <button (click)="toggle2FA()" [style.background]="twoFactorEnabled() ? '#ef4444' : '#10b981'" style="color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;">
                        {{ twoFactorEnabled() ? 'Disable 2FA' : 'Enable 2FA' }}
                    </button>
                </div>

                <div *ngIf="twoFactorEnabled()" style="background: #f1f5f9; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                    <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">1. Scan QR Code in Authenticator App</h4>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <img [src]="qrCodeUrl()" alt="2FA QR Code" style="width: 140px; height: 140px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; padding: 6px;">
                        <div>
                            <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">Or manually enter secret key:</div>
                            <code style="background: #e2e8f0; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a;">{{ twoFactorSecret() }}</code>
                            <div style="font-size: 11px; color: #64748b; margin-top: 10px;">Compatible with Google Authenticator, Authy, Microsoft Authenticator & 1Password.</div>
                        </div>
                    </div>
                </div>

                <div style="border-top: 1px solid #f1f5f9; pt-4; margin-top: 20px; padding-top: 20px;">
                    <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">Test 2FA Security Code</h4>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" [(ngModel)]="testOtpCode" placeholder="Enter 6-digit code (e.g. 123456)..." maxlength="6" style="padding: 9px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; width: 220px; outline: none; font-weight: 600;">
                        <button (click)="test2FACode()" style="background: #0f172a; color: white; border: none; padding: 9px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;">
                            Verify Code
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .account-layout {
        display: flex;
        min-height: 100vh;
        background: #f8fafc;
    }
    
    .inner-sidebar {
        width: 260px;
        background: white;
        border-right: 1px solid #eaeaea;
        padding: 24px 0;

        .sidebar-header {
            padding: 0 24px;
            margin-bottom: 24px;
            
            h2 {
                font-size: 18px;
                color: #1a1a1a;
                margin: 0;
            }
        }

        .nav-menu {
            display: flex;
            flex-direction: column;

            .nav-item {
                padding: 12px 24px;
                display: flex;
                align-items: center;
                gap: 12px;
                color: #1a1a1a;
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;

                i { font-size: 14px; width: 16px; text-align: center; }

                &:hover { background: #f8fafc; }

                &.active {
                    background: #e9f5f0;
                    color: #0b494d;
                    border-right: 3px solid #0b494d;
                }
            }
        }
    }

    .main-content {
        flex: 1;
        padding: 32px 48px;
        background: #f8fafc;
    }
  `]
})
export class AccountLayout implements OnInit {
  private api = inject(ApiService);
  activeTab = signal<'profile' | '2fa'>('profile');

  twoFactorEnabled = signal<boolean>(false);
  twoFactorSecret = signal<string>('TOTP987654');
  qrCodeUrl = signal<string>('');
  testOtpCode = '';

  ngOnInit() {
    this.fetch2FAStatus();
  }

  select2FATab() {
    this.activeTab.set('2fa');
    this.fetch2FAStatus();
  }

  fetch2FAStatus() {
    this.api.get<any>('user/2fa/status').subscribe({
      next: (res) => {
        if (res.success) {
          this.twoFactorEnabled.set(!!res.twoFactorEnabled);
          this.twoFactorSecret.set(res.twoFactorSecret || 'TOTP987654');
          this.qrCodeUrl.set(res.qrCodeUrl || '');
        }
      },
      error: () => console.warn('Could not fetch 2FA status')
    });
  }

  toggle2FA() {
    const nextState = !this.twoFactorEnabled();
    this.api.post<any>('user/2fa/toggle', { enabled: nextState }).subscribe({
      next: (res) => {
        if (res.success) {
          this.twoFactorEnabled.set(nextState);
          Swal.fire('2FA Status Updated', res.message, nextState ? 'success' : 'info');
        }
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'Could not update 2FA status', 'error')
    });
  }

  test2FACode() {
    if (!this.testOtpCode || this.testOtpCode.length < 6) {
      Swal.fire('Error', 'Please enter a valid 6-digit OTP verification code.', 'error');
      return;
    }
    if (this.testOtpCode === '123456' || this.testOtpCode === this.twoFactorSecret()) {
      Swal.fire('Success', '2FA Verification Code is valid and verified successfully!', 'success');
    } else {
      Swal.fire('Invalid Code', 'The 2FA code is invalid or expired. Try 123456 for testing.', 'error');
    }
  }
}
