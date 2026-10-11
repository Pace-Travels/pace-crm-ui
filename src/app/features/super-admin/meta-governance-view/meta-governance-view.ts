import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MetaGovernanceFrontendService } from '../services/meta-governance.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-meta-governance-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './meta-governance-view.html',
  styleUrl: './meta-governance-view.scss'
})
export class MetaGovernanceView implements OnInit {
  private metaService = inject(MetaGovernanceFrontendService);

  isLoading = signal<boolean>(true);
  platformRadar = signal<any>(null);
  tenantsHealth = signal<any[]>([]);

  // Restrict modal
  showRestrictModal = signal<boolean>(false);
  selectedTenant = signal<any>(null);
  restrictReason = signal<string>('High error rate / Phone number quality rating dropped.');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.metaService.getPlatformRadar().subscribe({
      next: (res) => {
        if (res && res.radar) {
          this.platformRadar.set(res.radar);
        }
      }
    });

    this.metaService.getTenantsHealth().subscribe({
      next: (res) => {
        if (res && res.reports) {
          this.tenantsHealth.set(res.reports);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        Swal.fire('Error', err.error?.message || 'Failed to load tenant Meta health reports.', 'error');
      }
    });
  }

  openRestrictModal(tenant: any): void {
    this.selectedTenant.set(tenant);
    this.showRestrictModal.set(true);
  }

  closeRestrictModal(): void {
    this.showRestrictModal.set(false);
    this.selectedTenant.set(null);
  }

  confirmToggleRestriction(allow: boolean): void {
    const tenant = this.selectedTenant();
    if (!tenant) return;

    this.metaService.restrictTenant(tenant.agencyId, allow, this.restrictReason()).subscribe({
      next: () => {
        Swal.fire(
          allow ? 'Restored!' : 'Restricted!',
          `Tenant broadcast status updated to ${allow ? 'ALLOWED' : 'RESTRICTED'}.`,
          allow ? 'success' : 'warning'
        );
        this.closeRestrictModal();
        this.loadData();
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'Failed to update tenant restriction', 'error');
      }
    });
  }
}
