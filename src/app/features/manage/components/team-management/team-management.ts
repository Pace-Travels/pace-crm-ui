import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role?: string;
  roleId?: number;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './team-management.html',
  styleUrl: './team-management.scss',
})
export class TeamManagement implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  tierName = signal<string>('STANDARD');
  maxSeats = signal<number>(2);
  allocatedSeats = signal<number>(1);
  availableSeats = signal<number>(1);
  teamMembers = signal<TeamMember[]>([]);

  showInviteModal = signal<boolean>(false);
  isInviting = signal<boolean>(false);

  inviteForm: FormGroup;

  constructor() {
    this.inviteForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      rbacRole: ['Sales Agent', Validators.required],
      initialStatus: ['Allocated (Active Seat Access)', Validators.required]
    });
  }

  ngOnInit(): void {
    this.fetchSeatAllocation();
  }

  fetchSeatAllocation(): void {
    this.api.get<any>('team/seats').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.tierName.set(res.tierName || 'STANDARD');
          this.maxSeats.set(res.maxSeats || 2);
          this.allocatedSeats.set(res.allocatedSeats || 1);
          this.availableSeats.set(res.availableSeats || 1);
          this.teamMembers.set(res.teamMembers || []);
        }
      },
      error: (err) => console.warn('Failed to load team seat allocation', err)
    });
  }

  get allocationPercentage(): number {
    const max = this.maxSeats() || 1;
    const allocated = this.allocatedSeats() || 0;
    return Math.min(100, Math.round((allocated / max) * 100));
  }

  openInviteModal(): void {
    if (this.availableSeats() <= 0) {
      Swal.fire({
        title: 'Seat Allocation Limit Reached',
        html: `<p>Your active <b>${this.tierName()}</b> plan limit is <b>${this.maxSeats()} seats</b>.</p>
               <p style="font-size: 13px; color: #64748b;">Upgrade your QuoteDesks plan to allocate additional user licenses for your staff.</p>`,
        icon: 'warning',
        confirmButtonText: 'Upgrade Plan Tier',
        confirmButtonColor: '#7c3aed'
      });
      return;
    }
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
  }

  submitInvite(): void {
    if (this.inviteForm.invalid || this.isInviting()) {
      Swal.fire('Required Fields', 'Please fill in all details with a valid email address.', 'warning');
      return;
    }

    this.isInviting.set(true);
    const formVal = this.inviteForm.value;

    this.api.post<any>('team/invite', formVal).subscribe({
      next: (res) => {
        this.isInviting.set(false);
        this.closeInviteModal();
        this.inviteForm.reset({
          rbacRole: 'Sales Agent',
          initialStatus: 'Allocated (Active Seat Access)'
        });
        this.fetchSeatAllocation();

        Swal.fire({
          title: 'Invitation Sent & Seat Allocated!',
          html: `<p>An activation email has been dispatched via <b>AWS SES</b> to <b>${formVal.email}</b>.</p>
                 <p style="font-size: 12px; color: #64748b;"><b>Sender:</b> admin@quotedesks.com</p>`,
          icon: 'success'
        });
      },
      error: (err) => {
        this.isInviting.set(false);
        const msg = err.error?.error || err.message || 'Failed to allocate seat and send invitation';
        Swal.fire('Allocation Failed', msg, 'error');
      }
    });
  }
}
