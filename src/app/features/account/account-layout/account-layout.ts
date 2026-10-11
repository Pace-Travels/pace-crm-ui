import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface TeamMemberItem {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
}

export interface ActiveSessionItem {
  id: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, FormsModule],
  template: `
    <div class="account-layout">
        <!-- Left Inner Sidebar Menu -->
        <div class="inner-sidebar">
            <div class="sidebar-header">
                <h2>Account & Agency Hub</h2>
                <span class="agency-tag"><i class="fa-solid fa-building-user"></i> Agency Owner Portal</span>
            </div>
            
            <nav class="nav-menu">
                <a class="nav-item" [class.active]="activeTab() === 'profile'" (click)="activeTab.set('profile')">
                    <i class="fa-regular fa-user"></i> Your Profile
                </a>
                <a class="nav-item" [class.active]="activeTab() === 'agency'" (click)="activeTab.set('agency')">
                    <i class="fa-solid fa-building"></i> Agency Settings
                </a>
                <a class="nav-item" [class.active]="activeTab() === 'team'" (click)="selectTeamTab()">
                    <i class="fa-solid fa-users-gear"></i> Team & User Access
                </a>
                <a class="nav-item" [class.active]="activeTab() === 'security'" (click)="selectSecurityTab()">
                    <i class="fa-solid fa-shield-halved"></i> Security & Sessions
                </a>
                <a class="nav-item" [class.active]="activeTab() === 'billing'" (click)="activeTab.set('billing')">
                    <i class="fa-solid fa-receipt"></i> Subscriptions & Quota
                </a>
                <a class="nav-item" [class.active]="activeTab() === 'notifications'" (click)="activeTab.set('notifications')">
                    <i class="fa-regular fa-bell"></i> Notifications
                </a>
            </nav>
        </div>
        
        <!-- Right Main Panel Container -->
        <div class="main-content">
            
            <!-- TAB 1: USER PROFILE -->
            <ng-container *ngIf="activeTab() === 'profile'">
                <router-outlet></router-outlet>
            </ng-container>

            <!-- TAB 2: AGENCY PROFILE & BUSINESS BRANDING -->
            <div *ngIf="activeTab() === 'agency'" class="account-card">
                <div class="card-header">
                    <div>
                        <h3>Agency Profile & Business Details</h3>
                        <p>Configure legal business credentials, base currency, timezone, and portal branding.</p>
                    </div>
                    <button (click)="saveAgencySettings()" class="btn-primary">
                        <i class="fa-solid fa-floppy-disk"></i> Save Agency Details
                    </button>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Agency Name *</label>
                        <input type="text" [(ngModel)]="agencyData.name" placeholder="e.g. Pace Travels & Media">
                    </div>
                    <div class="form-group">
                        <label>Legal Entity Name / Billing Name</label>
                        <input type="text" [(ngModel)]="agencyData.legalName" placeholder="e.g. Pace Travels Private Limited">
                    </div>
                    <div class="form-group">
                        <label>GSTIN / Tax Registration ID</label>
                        <input type="text" [(ngModel)]="agencyData.taxId" placeholder="e.g. 27AAAAA0000A1Z5">
                    </div>
                    <div class="form-group">
                        <label>Base Currency</label>
                        <select [(ngModel)]="agencyData.currency">
                            <option value="INR">INR (₹ Indian Rupee)</option>
                            <option value="USD">USD ($ US Dollar)</option>
                            <option value="EUR">EUR (€ Euro)</option>
                            <option value="GBP">GBP (£ British Pound)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Primary Timezone</label>
                        <select [(ngModel)]="agencyData.timezone">
                            <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                            <option value="UTC">UTC (GMT +00:00)</option>
                            <option value="America/New_York">America/New_York (EST -05:00)</option>
                            <option value="Europe/London">Europe/London (GMT +00:00)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>White-Label Custom Portal Domain</label>
                        <input type="text" [(ngModel)]="agencyData.subdomain" placeholder="e.g. messenger.quotedesks.com">
                    </div>
                </div>
            </div>

            <!-- TAB 3: TEAM & USER MANAGEMENT -->
            <div *ngIf="activeTab() === 'team'" class="account-card">
                <div class="card-header">
                    <div>
                        <h3>Team & User Access Control (RBAC)</h3>
                        <p>Manage allocated seat licenses, invite team agents, and set role permissions.</p>
                    </div>
                    <button (click)="showInviteModal.set(true)" class="btn-primary">
                        <i class="fa-solid fa-user-plus"></i> Invite Team Member
                    </button>
                </div>

                <!-- Seat Allocation Usage Bar -->
                <div class="seats-banner">
                    <div class="banner-text">
                        <strong><i class="fa-solid fa-chair"></i> Allocated Team Seats: {{ seatInfo().allocatedSeats }} / {{ seatInfo().maxSeats }}</strong>
                        <span>Plan Tier: <strong style="color: #7c3aed;">{{ seatInfo().tierName }}</strong> ({{ seatInfo().availableSeats }} available seats remaining)</span>
                    </div>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" [style.width]="(seatInfo().allocatedSeats / seatInfo().maxSeats) * 100 + '%'"></div>
                    </div>
                </div>

                <!-- Team Members Table -->
                <table class="account-table">
                    <thead>
                        <tr>
                            <th>MEMBER</th>
                            <th>EMAIL</th>
                            <th>ROLE</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let m of teamMembers()">
                            <td>
                                <strong>{{ m.name }}</strong>
                            </td>
                            <td><code>{{ m.email }}</code></td>
                            <td>
                                <span class="role-pill">{{ m.role }}</span>
                            </td>
                            <td>
                                <span class="status-badge active">{{ m.status }}</span>
                            </td>
                            <td>
                                <button (click)="revokeUser(m)" class="btn-text-danger" title="Revoke Access">
                                    <i class="fa-solid fa-user-xmark"></i> Revoke
                                </button>
                            </td>
                        </tr>
                        <tr *ngIf="teamMembers().length === 0">
                            <td colspan="5" class="text-muted" style="text-align: center; padding: 24px;">No team members found. Click "Invite Team Member" above.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- TAB 4: SECURITY & ACTIVE SESSIONS -->
            <div *ngIf="activeTab() === 'security'" class="account-card">
                <div class="card-header">
                    <div>
                        <h3>Two-Factor Authentication & Active Sessions</h3>
                        <p>Manage TOTP 2FA verification, inspect active device logins, and generate API tokens.</p>
                    </div>
                </div>

                <!-- 2FA Section -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <div>
                            <strong style="font-size: 15px; color: #0f172a;">TOTP Authenticator (2FA)</strong>
                            <div style="font-size: 12.5px; color: #64748b;">Require Google Authenticator or Authy OTP verification at login.</div>
                        </div>
                        <button (click)="toggle2FA()" [style.background]="twoFactorEnabled() ? '#ef4444' : '#10b981'" style="color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer;">
                            {{ twoFactorEnabled() ? 'Disable 2FA' : 'Enable 2FA' }}
                        </button>
                    </div>

                    <div *ngIf="twoFactorEnabled()" style="display: flex; gap: 20px; align-items: center; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <img [src]="qrCodeUrl()" alt="2FA QR Code" style="width: 120px; height: 120px; border-radius: 6px; border: 1px solid #cbd5e1;">
                        <div>
                            <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">Manual TOTP Secret Key:</div>
                            <code style="background: #f1f5f9; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 14px; font-weight: 700;">{{ twoFactorSecret() }}</code>
                        </div>
                    </div>
                </div>

                <!-- Active Login Sessions Table -->
                <h4 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Active Login Sessions</h4>
                <table class="account-table">
                    <thead>
                        <tr>
                            <th>BROWSER & OS</th>
                            <th>IP ADDRESS</th>
                            <th>LOCATION</th>
                            <th>LAST ACTIVE</th>
                            <th>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let s of activeSessions()">
                            <td>
                                <strong>{{ s.browser }}</strong> on {{ s.os }}
                                <span *ngIf="s.isCurrent" class="current-badge">THIS DEVICE</span>
                            </td>
                            <td><code>{{ s.ip }}</code></td>
                            <td>{{ s.location }}</td>
                            <td>{{ s.lastActive }}</td>
                            <td>
                                <button *ngIf="!s.isCurrent" (click)="revokeSession(s.id)" class="btn-text-danger">
                                    Revoke
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- TAB 5: SUBSCRIPTIONS & QUOTA -->
            <div *ngIf="activeTab() === 'billing'" class="account-card">
                <div class="card-header">
                    <div>
                        <h3>Subscriptions & Omnichannel Quotas</h3>
                        <p>View your active SaaS subscription plan, messaging limits, and download past invoices.</p>
                    </div>
                    <button (click)="navigateTo('/payments')" class="btn-primary">
                        <i class="fa-solid fa-crown"></i> Upgrade Plan
                    </button>
                </div>

                <div class="plan-hero-card">
                    <div class="plan-info">
                        <span class="plan-label">ACTIVE PLAN</span>
                        <h2>AGENCY ENTERPRISE <span class="badge-active">ACTIVE</span></h2>
                        <p>Unlimited WABA Channels, 10,000 Messages/day, Multi-Agent RBAC, and AI Automation.</p>
                    </div>
                </div>
            </div>

            <!-- TAB 6: NOTIFICATIONS -->
            <div *ngIf="activeTab() === 'notifications'" class="account-card">
                <div class="card-header">
                    <div>
                        <h3>Notification & Alert Preferences</h3>
                        <p>Choose when and how you receive alerts for system events and campaigns.</p>
                    </div>
                </div>

                <div class="toggle-list">
                    <div class="toggle-row">
                        <div>
                            <strong>Webhook Failure Alerts</strong>
                            <p>Receive immediate alerts if WhatsApp webhook delivery fails.</p>
                        </div>
                        <input type="checkbox" [(ngModel)]="notifPrefs.webhookAlerts">
                    </div>
                    <div class="toggle-row">
                        <div>
                            <strong>Campaign Completion Summaries</strong>
                            <p>Get notified when a bulk WhatsApp broadcast campaign finishes sending.</p>
                        </div>
                        <input type="checkbox" [(ngModel)]="notifPrefs.campaignAlerts">
                    </div>
                    <div class="toggle-row">
                        <div>
                            <strong>Daily Performance Digest</strong>
                            <p>Receive daily email analytics for message delivery and lead engagement.</p>
                        </div>
                        <input type="checkbox" [(ngModel)]="notifPrefs.dailyDigest">
                    </div>
                </div>
            </div>

        </div>
    </div>

    <!-- INVITE TEAM MEMBER MODAL -->
    <div *ngIf="showInviteModal()" class="modal-backdrop">
        <div class="modal-card">
            <div class="modal-header">
                <h3><i class="fa-solid fa-user-plus text-purple"></i> Invite Team Member</h3>
                <button (click)="showInviteModal.set(false)" class="close-btn">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>First Name *</label>
                    <input type="text" [(ngModel)]="inviteForm.firstName" placeholder="e.g. Rahul">
                </div>
                <div class="form-group">
                    <label>Last Name</label>
                    <input type="text" [(ngModel)]="inviteForm.lastName" placeholder="e.g. Sharma">
                </div>
                <div class="form-group">
                    <label>Email Address *</label>
                    <input type="email" [(ngModel)]="inviteForm.email" placeholder="rahul@company.com">
                </div>
                <div class="form-group">
                    <label>Assigned Role *</label>
                    <select [(ngModel)]="inviteForm.role">
                        <option value="AGENCY_OWNER">Agency Owner / Super Admin</option>
                        <option value="PROJECT_MANAGER">Project Manager</option>
                        <option value="SUPPORT_AGENT">Support & Live Chat Agent</option>
                        <option value="READ_ONLY">Read-Only Viewer</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button (click)="showInviteModal.set(false)" class="btn-secondary">Cancel</button>
                <button (click)="sendInvite()" [disabled]="isSendingInvite()" class="btn-primary">
                    <span *ngIf="!isSendingInvite()">Send SES Invitation <i class="fa-solid fa-paper-plane"></i></span>
                    <span *ngIf="isSendingInvite()"><i class="fa-solid fa-spinner fa-spin"></i> Dispatched...</span>
                </button>
            </div>
        </div>
    </div>
  `,
  styles: [`
    .account-layout {
        display: flex;
        min-height: 100vh;
        background: #f8fafc;
        font-family: 'Inter', sans-serif;
    }
    
    .inner-sidebar {
        width: 270px;
        background: white;
        border-right: 1px solid #e2e8f0;
        padding: 24px 0;

        .sidebar-header {
            padding: 0 24px;
            margin-bottom: 24px;
            
            h2 {
                font-size: 18px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 6px 0;
            }

            .agency-tag {
                font-size: 11px;
                font-weight: 700;
                color: #7c3aed;
                background: rgba(124, 58, 237, 0.08);
                padding: 4px 10px;
                border-radius: 20px;
                display: inline-block;
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
                color: #475569;
                text-decoration: none;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;

                i { font-size: 14px; width: 18px; text-align: center; }

                &:hover { background: #f8fafc; color: #0f172a; }

                &.active {
                    background: rgba(124, 58, 237, 0.08);
                    color: #7c3aed;
                    border-right: 3px solid #7c3aed;
                }
            }
        }
    }

    .main-content {
        flex: 1;
        padding: 32px 48px;
        background: #f8fafc;
    }

    .account-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 32px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.03);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 20px;
        margin-bottom: 24px;

        h3 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #0f172a; }
        p { margin: 0; font-size: 13.5px; color: #64748b; }
    }

    .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        label { font-size: 12.5px; font-weight: 700; color: #334155; }
        input, select {
            padding: 10px 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            color: #0f172a;
            &:focus { border-color: #7c3aed; }
        }
    }

    .seats-banner {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 18px 24px;
        margin-bottom: 24px;

        .banner-text {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #0f172a;
            margin-bottom: 10px;
        }

        .progress-bar-wrap {
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;

            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #7c3aed, #38bdf8);
                transition: width 0.4s ease;
            }
        }
    }

    .account-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13.5px;

        th {
            text-align: left;
            padding: 12px 16px;
            font-size: 11.5px;
            color: #64748b;
            font-weight: 800;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }

        td {
            padding: 14px 16px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
        }

        .role-pill {
            background: #f1f5f9;
            color: #334155;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
        }

        .status-badge.active {
            background: #dcfce7;
            color: #15803d;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
        }

        .current-badge {
            background: #e0f2fe;
            color: #0284c7;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 800;
            margin-left: 6px;
        }
    }

    .plan-hero-card {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: white;
        padding: 32px;
        border-radius: 12px;

        .plan-label { font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; }
        h2 { margin: 6px 0 10px 0; font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 12px; }
        .badge-active { background: #16a34a; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; }
        p { margin: 0; font-size: 14px; color: #94a3b8; }
    }

    .toggle-list {
        display: flex;
        flex-direction: column;
        gap: 16px;

        .toggle-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;

            strong { display: block; font-size: 14px; color: #0f172a; }
            p { margin: 2px 0 0 0; font-size: 12.5px; color: #64748b; }
            input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; }
        }
    }

    .btn-primary {
        background: #7c3aed;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 13.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
    }

    .btn-secondary {
        background: white;
        border: 1px solid #cbd5e1;
        color: #475569;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
    }

    .btn-text-danger {
        background: none;
        border: none;
        color: #ef4444;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
    }

    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .modal-card {
        background: white;
        width: 480px;
        max-width: 90vw;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
            .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b; }
        }

        .modal-body {
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin-bottom: 24px;
        }

        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
    }
  `]
})
export class AccountLayout implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  activeTab = signal<'profile' | 'agency' | 'team' | 'security' | 'billing' | 'notifications'>('profile');

  // Agency Profile Data
  agencyData = {
    name: 'Pace Travels & Media',
    legalName: 'Pace Travels Private Limited',
    taxId: '27AAAAA0000A1Z5',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    subdomain: 'messenger.quotedesks.com'
  };

  // Team & User Access Data
  seatInfo = signal<{ tierName: string; maxSeats: number; allocatedSeats: number; availableSeats: number }>({
    tierName: 'STANDARD',
    maxSeats: 5,
    allocatedSeats: 2,
    availableSeats: 3
  });

  teamMembers = signal<TeamMemberItem[]>([
    { id: 1, name: 'shadab', email: 'shadab@pacetravels.in', role: 'AGENCY_OWNER', status: 'ACTIVE', lastActive: 'Just now' },
    { id: 2, name: 'Support Agent 1', email: 'agent1@pacetravels.in', role: 'SUPPORT_AGENT', status: 'ACTIVE', lastActive: '2h ago' }
  ]);

  showInviteModal = signal<boolean>(false);
  isSendingInvite = signal<boolean>(false);
  inviteForm = { firstName: '', lastName: '', email: '', role: 'SUPPORT_AGENT' };

  // Security & 2FA Data
  twoFactorEnabled = signal<boolean>(false);
  twoFactorSecret = signal<string>('TOTP987654');
  qrCodeUrl = signal<string>('');

  activeSessions = signal<ActiveSessionItem[]>([
    { id: 'sess_1', browser: 'Chrome 122', os: 'Windows 11', ip: '182.73.18.94', location: 'New Delhi, India', lastActive: 'Current Session', isCurrent: true },
    { id: 'sess_2', browser: 'Safari Mobile', os: 'iOS 17', ip: '49.36.210.12', location: 'Mumbai, India', lastActive: '3 hours ago', isCurrent: false }
  ]);

  // Notifications Prefs
  notifPrefs = {
    webhookAlerts: true,
    campaignAlerts: true,
    dailyDigest: false
  };

  ngOnInit() {
    this.fetch2FAStatus();
  }

  selectTeamTab() {
    this.activeTab.set('team');
    this.fetchTeamSeats();
  }

  selectSecurityTab() {
    this.activeTab.set('security');
    this.fetch2FAStatus();
  }

  fetchTeamSeats() {
    this.api.get<any>('team/seats').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.seatInfo.set({
            tierName: res.tierName || 'STANDARD',
            maxSeats: res.maxSeats || 5,
            allocatedSeats: res.allocatedSeats || 2,
            availableSeats: res.availableSeats || 3
          });
          if (res.teamMembers && Array.isArray(res.teamMembers)) {
            const mapped = res.teamMembers.map((u: any) => ({
              id: u.id,
              name: u.name || 'Agent',
              email: u.email,
              role: u.roleId === 1 ? 'AGENCY_OWNER' : 'SUPPORT_AGENT',
              status: u.isActive ? 'ACTIVE' : 'INVITED',
              lastActive: 'Active'
            }));
            this.teamMembers.set(mapped);
          }
        }
      },
      error: (err) => console.warn('Fetch team seats info error', err)
    });
  }

  sendInvite() {
    if (!this.inviteForm.email) {
      Swal.fire('Error', 'Please enter an email address to send invitation.', 'error');
      return;
    }

    this.isSendingInvite.set(true);
    this.api.post<any>('team/invite', this.inviteForm).subscribe({
      next: (res) => {
        this.isSendingInvite.set(false);
        this.showInviteModal.set(false);
        Swal.fire('Invitation Sent!', res.message || 'Seat allocated and email dispatched via AWS SES.', 'success');
        this.fetchTeamSeats();
      },
      error: (err) => {
        this.isSendingInvite.set(false);
        Swal.fire('Error', err.error?.error || err.message || 'Failed to dispatch invitation', 'error');
      }
    });
  }

  saveAgencySettings() {
    Swal.fire({
      title: 'Agency Profile Saved',
      text: 'Legal entity details, currency, and timezone updated successfully.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
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

  revokeUser(member: TeamMemberItem) {
    Swal.fire({
      title: 'Revoke Access?',
      text: `Are you sure you want to revoke access for ${member.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Revoke'
    }).then((res) => {
      if (res.isConfirmed) {
        Swal.fire('Revoked', 'User access revoked successfully.', 'success');
        this.teamMembers.update(list => list.filter(m => m.id !== member.id));
      }
    });
  }

  revokeSession(sessionId: string) {
    this.activeSessions.update(list => list.filter(s => s.id !== sessionId));
    Swal.fire('Session Terminated', 'Selected device login session has been signed out.', 'info');
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
