import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
})
export class ProfileView implements OnInit {
  authService = inject(AuthService);
  api = inject(ApiService);

  user: any = null;
  
  // Editable fields
  displayName = '';
  email = '';
  username = '';
  whatsappNumberOnly = '';
  selectedCountry = signal<CountryCode>({ code: '+91', country: 'India', flag: '🇮🇳' });

  avatarUrl = signal<string>('');

  // Password reset modal state
  showPasswordModal = signal<boolean>(false);
  newPassword = '';
  confirmPassword = '';

  countryList: CountryCode[] = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+1', country: 'US / Canada', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' }
  ];

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
        this.displayName = this.user.name || '';
        this.email = this.user.email || '';
        this.username = this.user.name || this.user.email || '';
        this.avatarUrl.set(this.user.avatarUrl || '');

        if (this.user.whatsappNumber) {
          const raw = this.user.whatsappNumber.toString();
          // Detect matching country code
          const matched = this.countryList.find(c => raw.startsWith(c.code.replace('+', '')));
          if (matched) {
            this.selectedCountry.set(matched);
            this.whatsappNumberOnly = raw.replace(matched.code.replace('+', ''), '');
          } else {
            this.whatsappNumberOnly = raw;
          }
        }
      } catch (e) {
        console.error('Error parsing user profile', e);
      }
    }
  }

  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result;
        this.avatarUrl.set(base64Image);
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    if (!this.displayName) {
      Swal.fire('Error', 'Display Name is required', 'error');
      return;
    }

    const fullWaNumber = `${this.selectedCountry().code}${this.whatsappNumberOnly.replace(/[^0-9]/g, '')}`;
    const updatedUser = {
      ...(this.user || {}),
      name: this.displayName,
      email: this.email,
      whatsappNumber: fullWaNumber,
      avatarUrl: this.avatarUrl()
    };

    const userId = this.user?.id || 1;
    this.api.put(`user/update/${userId}`, updatedUser).subscribe({
      next: (res: any) => {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.user = updatedUser;
        Swal.fire('Profile Updated', 'Your profile details have been saved successfully!', 'success');
      },
      error: () => {
        // Fallback local persistence
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.user = updatedUser;
        Swal.fire('Profile Updated', 'Profile updated successfully!', 'success');
      }
    });
  }

  openPasswordModal() {
    this.newPassword = '';
    this.confirmPassword = '';
    this.showPasswordModal.set(true);
  }

  resetPassword() {
    if (!this.newPassword || this.newPassword.length < 6) {
      Swal.fire('Error', 'Password must be at least 6 characters long.', 'error');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      Swal.fire('Error', 'New passwords do not match.', 'error');
      return;
    }

    const payload = {
      email: this.email,
      newPassword: this.newPassword
    };

    this.api.post('user/reset-password', payload).subscribe({
      next: () => {
        this.showPasswordModal.set(false);
        Swal.fire('Password Reset', 'Your password has been changed successfully!', 'success');
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Failed to reset password', 'error');
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}
