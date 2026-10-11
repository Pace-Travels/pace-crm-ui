import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LicenseAdminService, SaaSProvisionPayload } from '../services/license-admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-super-admin-license-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './super-admin-license-view.html',
  styleUrl: './super-admin-license-view.scss'
})
export class SuperAdminLicenseView implements OnInit {
  private licenseAdminService = inject(LicenseAdminService);
  private fb = inject(FormBuilder);

  isLoading = signal<boolean>(true);
  summary = signal<any>({ totalAgencies: 0, activeLicenses: 0, suspendedLicenses: 0, terminatedLicenses: 0 });
  tenants = signal<any[]>([]);

  // Filter & Search
  searchQuery = signal<string>('');
  selectedStatusFilter = signal<string>('ALL');

  // Modals
  showProvisionModal = signal<boolean>(false);
  showTerminateModal = signal<boolean>(false);
  selectedTenantForAction = signal<any>(null);

  // Forms
  provisionForm: FormGroup;
  terminationReason = signal<string>('');

  filteredTenants = computed(() => {
    let list = this.tenants();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatusFilter();

    if (query) {
      list = list.filter(t => 
        (t.agencyName && t.agencyName.toLowerCase().includes(query)) ||
        (t.licenseKey && t.licenseKey.toLowerCase().includes(query)) ||
        (t.plan && t.plan.toLowerCase().includes(query))
      );
    }

    if (status !== 'ALL') {
      list = list.filter(t => t.licenseStatus === status);
    }

    return list;
  });

  constructor() {
    this.provisionForm = this.fb.group({
      agencyId: ['', [Validators.required, Validators.min(1)]],
      planType: ['PRO', Validators.required],
      maxSeats: [5, [Validators.required, Validators.min(1)]],
      maxContacts: [10000, [Validators.required, Validators.min(100)]],
      maxMessagesPerMonth: [50000, [Validators.required, Validators.min(1000)]],
      validityDays: [365, [Validators.required, Validators.min(1)]],
      autoRenew: [true]
    });
  }

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.isLoading.set(true);
    this.licenseAdminService.getAdminOverview().subscribe({
      next: (res) => {
        if (res && res.overview) {
          this.summary.set(res.overview.summary || {});
          this.tenants.set(res.overview.tenants || []);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        Swal.fire('Error', err.error?.message || 'Failed to load license overview.', 'error');
      }
    });
  }

  openProvisionModal(): void {
    this.provisionForm.reset({
      agencyId: '',
      planType: 'PRO',
      maxSeats: 5,
      maxContacts: 10000,
      maxMessagesPerMonth: 50000,
      validityDays: 365,
      autoRenew: true
    });
    this.showProvisionModal.set(true);
  }

  closeProvisionModal(): void {
    this.showProvisionModal.set(false);
  }

  onProvisionSubmit(): void {
    if (this.provisionForm.invalid) return;

    const payload: SaaSProvisionPayload = this.provisionForm.value;
    this.licenseAdminService.provisionLicense(payload).subscribe({
      next: (res) => {
        Swal.fire('Provisioned!', `License Key Generated: ${res.license?.licenseKey}`, 'success');
        this.closeProvisionModal();
        this.loadOverview();
      },
      error: (err) => {
        Swal.fire('Provisioning Failed', err.error?.message || 'Error creating license', 'error');
      }
    });
  }

  openTerminateModal(tenant: any): void {
    this.selectedTenantForAction.set(tenant);
    this.terminationReason.set('Non-payment of subscription invoice after grace period.');
    this.showTerminateModal.set(true);
  }

  closeTerminateModal(): void {
    this.showTerminateModal.set(false);
    this.selectedTenantForAction.set(null);
  }

  confirmTerminate(): void {
    const tenant = this.selectedTenantForAction();
    if (!tenant) return;

    this.licenseAdminService.terminateLicense(tenant.agencyId, this.terminationReason()).subscribe({
      next: () => {
        Swal.fire('Terminated!', `Agency ${tenant.agencyName} license has been revoked.`, 'warning');
        this.closeTerminateModal();
        this.loadOverview();
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Failed to terminate license', 'error');
      }
    });
  }

  reactivateTenant(tenant: any): void {
    Swal.fire({
      title: `Reactivate License?`,
      text: `Reactivate subscription for ${tenant.agencyName} for another 30 days?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reactivate',
      confirmButtonColor: '#10b981'
    }).then((result) => {
      if (result.isConfirmed) {
        this.licenseAdminService.reactivateLicense(tenant.agencyId, 30).subscribe({
          next: () => {
            Swal.fire('Reactivated!', 'Subscription is now ACTIVE.', 'success');
            this.loadOverview();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'Failed to reactivate', 'error');
          }
        });
      }
    });
  }
}
