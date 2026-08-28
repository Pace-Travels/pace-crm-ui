import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-opt-in-management-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './opt-in-management-view.html',
  styleUrl: './opt-in-management-view.scss'
})
export class OptInManagementView implements OnInit {
  // Opt-out Settings State
  optOutKeywords = signal<string[]>(['Stop', 'Unsubscribe', 'Cancel']);
  newOptOutKeyword = signal<string>('');
  optOutAutoReplyEnabled = signal<boolean>(false);
  optOutResponseText = signal<string>('You have been opted-out of your future communications');

  // Opt-in Settings State
  optInKeywords = signal<string[]>(['Allow', 'Start', 'Subscribe']);
  newOptInKeyword = signal<string>('');
  optInAutoReplyEnabled = signal<boolean>(false);
  optInResponseText = signal<string>('Thanks. You have been opted-in of your future communications');

  // Modal Configure States
  showConfigureOptOutModal = signal<boolean>(false);
  showConfigureOptInModal = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.fetchSettings();
  }

  fetchSettings(): void {
    this.isLoading.set(true);
    this.api.get('/optin/settings').subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res && res.settings) {
          const s = res.settings;
          if (s.optOutKeywords) this.optOutKeywords.set(s.optOutKeywords);
          if (s.optOutAutoReplyEnabled !== undefined) this.optOutAutoReplyEnabled.set(s.optOutAutoReplyEnabled);
          if (s.optOutResponseText) this.optOutResponseText.set(s.optOutResponseText);

          if (s.optInKeywords) this.optInKeywords.set(s.optInKeywords);
          if (s.optInAutoReplyEnabled !== undefined) this.optInAutoReplyEnabled.set(s.optInAutoReplyEnabled);
          if (s.optInResponseText) this.optInResponseText.set(s.optInResponseText);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Keyword Chip Handlers
  addOptOutKeyword(): void {
    const val = this.newOptOutKeyword().trim();
    if (val && !this.optOutKeywords().includes(val)) {
      this.optOutKeywords.set([...this.optOutKeywords(), val]);
      this.newOptOutKeyword.set('');
    }
  }

  removeOptOutKeyword(index: number): void {
    const list = [...this.optOutKeywords()];
    list.splice(index, 1);
    this.optOutKeywords.set(list);
  }

  addOptInKeyword(): void {
    const val = this.newOptInKeyword().trim();
    if (val && !this.optInKeywords().includes(val)) {
      this.optInKeywords.set([...this.optInKeywords(), val]);
      this.newOptInKeyword.set('');
    }
  }

  removeOptInKeyword(index: number): void {
    const list = [...this.optInKeywords()];
    list.splice(index, 1);
    this.optInKeywords.set(list);
  }

  // Save Handlers
  saveOptOutSettings(): void {
    const payload = {
      optOutKeywords: this.optOutKeywords(),
      optOutAutoReplyEnabled: this.optOutAutoReplyEnabled(),
      optOutResponseText: this.optOutResponseText()
    };
    this.api.post('/optin/settings', payload).subscribe({
      next: () => {
        Swal.fire('Settings Saved', 'Opt-out management keywords & configuration saved.', 'success');
      },
      error: () => Swal.fire('Error', 'Failed to save opt-out settings.', 'error')
    });
  }

  saveOptInSettings(): void {
    const payload = {
      optInKeywords: this.optInKeywords(),
      optInAutoReplyEnabled: this.optInAutoReplyEnabled(),
      optInResponseText: this.optInResponseText()
    };
    this.api.post('/optin/settings', payload).subscribe({
      next: () => {
        Swal.fire('Settings Saved', 'Opt-in management keywords & configuration saved.', 'success');
      },
      error: () => Swal.fire('Error', 'Failed to save opt-in settings.', 'error')
    });
  }

  downloadReport(): void {
    Swal.fire({
      title: 'Opt-in / Opt-out Report',
      text: 'Downloading Opt-in & Opt-out contact audit log report (.csv)...',
      icon: 'info',
      timer: 2000,
      showConfirmButton: false
    });
  }
}
