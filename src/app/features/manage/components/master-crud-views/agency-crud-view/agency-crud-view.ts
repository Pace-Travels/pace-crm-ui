import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface AgencyItem {
  id: number;
  name: string;
  gstNumber?: string;
  panNumber?: string;
  creditLimit?: number;
  preferredDestination?: string;
  assignedSalesPersonId?: number;
  maxSeats: number;
  subscriptionPlan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  isActive: boolean;
}

@Component({
  selector: 'app-agency-crud-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agency-crud-view.html',
  styleUrl: './agency-crud-view.scss'
})
export class AgencyCrudView implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  isLoading = signal<boolean>(false);
  agencies = signal<AgencyItem[]>([
    {
      id: 50,
      name: "Pace Travels & Tours",
      gstNumber: "29AAAAA0000A1Z5",
      panNumber: "AAAAA0000A",
      creditLimit: 500000,
      preferredDestination: "Europe, Bali, Dubai",
      maxSeats: 10,
      subscriptionPlan: "PRO",
      isActive: true
    },
    {
      id: 51,
      name: "Apex Global Holidays",
      gstNumber: "07BBBBB1111B1Z2",
      panNumber: "BBBBB1111B",
      creditLimit: 250000,
      preferredDestination: "Thailand, Maldives",
      maxSeats: 5,
      subscriptionPlan: "BASIC",
      isActive: true
    }
  ]);

  // DataTables Pagination, Search & Sorting State
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  sortColumn = signal<string>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Modal & Form State
  showFormModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId = signal<number | null>(null);
  agencyForm: FormGroup;

  // Filtered & Paginated Computed List
  filteredList = computed(() => {
    let list = [...this.agencies()];
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.gstNumber && item.gstNumber.toLowerCase().includes(query)) ||
        (item.panNumber && item.panNumber.toLowerCase().includes(query)) ||
        (item.preferredDestination && item.preferredDestination.toLowerCase().includes(query)) ||
        (item.subscriptionPlan && item.subscriptionPlan.toLowerCase().includes(query))
      );
    }

    // Sort
    const col = this.sortColumn();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    list.sort((a: any, b: any) => {
      const valA = (a[col] || '').toString().toLowerCase();
      const valB = (b[col] || '').toString().toLowerCase();
      return valA.localeCompare(valB) * dir;
    });

    return list;
  });

  paginatedList = computed(() => {
    const list = this.filteredList();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredList().length / this.pageSize()) || 1);

  constructor() {
    this.agencyForm = this.fb.group({
      name: ['', [Validators.required]],
      gstNumber: [''],
      panNumber: [''],
      creditLimit: [100000, [Validators.required, Validators.min(0)]],
      preferredDestination: [''],
      maxSeats: [5, [Validators.required, Validators.min(1)]],
      subscriptionPlan: ['PRO', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.fetchAgencies();
  }

  fetchAgencies(): void {
    // In production, fetch via API GET /api/v1/agencies
  }

  sortBy(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.agencyForm.reset({
      creditLimit: 100000,
      maxSeats: 5,
      subscriptionPlan: 'PRO'
    });
    this.showFormModal.set(true);
  }

  openEditModal(item: AgencyItem): void {
    this.isEditing.set(true);
    this.editingId.set(item.id);
    this.agencyForm.patchValue(item);
    this.showFormModal.set(true);
  }

  closeModal(): void {
    this.showFormModal.set(false);
  }

  saveAgency(): void {
    if (this.agencyForm.invalid) return;

    const val = this.agencyForm.value;

    if (this.isEditing() && this.editingId()) {
      const updated = this.agencies().map(a => a.id === this.editingId() ? { ...a, ...val } : a);
      this.agencies.set(updated);
      Swal.fire('Updated!', 'Agency record updated successfully.', 'success');
    } else {
      const newItem: AgencyItem = {
        id: Date.now(),
        ...val,
        isActive: true
      };
      this.agencies.set([newItem, ...this.agencies()]);
      Swal.fire('Created!', 'New Agency provisioned successfully.', 'success');
    }

    this.closeModal();
  }

  deleteAgency(item: AgencyItem): void {
    Swal.fire({
      title: 'Delete Agency?',
      text: `Are you sure you want to delete agency ${item.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.agencies.set(this.agencies().filter(a => a.id !== item.id));
        Swal.fire('Deleted!', 'Agency deleted successfully.', 'success');
      }
    });
  }

  exportCSV(): void {
    const list = this.filteredList();
    if (list.length === 0) return;

    const headers = ['ID', 'Agency Name', 'GST Number', 'PAN Number', 'Credit Limit', 'Preferred Destinations', 'Plan', 'Max Seats'];
    const rows = list.map(item => [
      item.id,
      `"${item.name || ''}"`,
      `"${item.gstNumber || ''}"`,
      `"${item.panNumber || ''}"`,
      item.creditLimit || 0,
      `"${item.preferredDestination || ''}"`,
      `"${item.subscriptionPlan || ''}"`,
      item.maxSeats
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Agencies_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
