import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface NetworkItem {
  id: number;
  name: string;
  agencyName?: string;
  chapter?: string;
  categories?: string;
  website?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  email2?: string;
  networkStateId?: number;
  networkCityId?: number;
  location?: string;
  remarks?: string;
  callStatus?: string;
  mailStatus?: string;
  whatsappStatus?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-network-crud-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './network-crud-view.html',
  styleUrl: './network-crud-view.scss'
})
export class NetworkCrudView implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  isLoading = signal<boolean>(false);
  networks = signal<NetworkItem[]>([
    {
      id: 1,
      name: "Rajesh Sharma",
      agencyName: "Pace Travels BLR",
      chapter: "BNI Champions Bengaluru",
      categories: "Outbound Tours, Flight Ticketing",
      website: "https://pacetravels.com",
      phone: "+919876543210",
      phone2: "+919876543211",
      email: "rajesh@pacetravels.com",
      location: "Bengaluru",
      remarks: "Key B2B Partner for South India",
      callStatus: "CONNECTED",
      mailStatus: "SENT",
      whatsappStatus: "BROADCASTED",
      isActive: true
    },
    {
      id: 2,
      name: "Anita Verma",
      agencyName: "Apex Travels Delhi",
      chapter: "BNI Dynamic Delhi",
      categories: "Corporate Travel, MICE",
      website: "https://apextravels.in",
      phone: "+919811122233",
      email: "anita@apextravels.in",
      location: "New Delhi",
      remarks: "Corporate Travel Specialist",
      callStatus: "BUSY",
      mailStatus: "DELIVERED",
      whatsappStatus: "READ",
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
  networkForm: FormGroup;

  // Filtered & Paginated Computed List
  filteredList = computed(() => {
    let list = [...this.networks()];
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.agencyName && item.agencyName.toLowerCase().includes(query)) ||
        (item.chapter && item.chapter.toLowerCase().includes(query)) ||
        (item.categories && item.categories.toLowerCase().includes(query)) ||
        (item.phone && item.phone.toLowerCase().includes(query)) ||
        (item.email && item.email.toLowerCase().includes(query)) ||
        (item.location && item.location.toLowerCase().includes(query))
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
    this.networkForm = this.fb.group({
      name: ['', [Validators.required]],
      agencyName: [''],
      chapter: [''],
      categories: [''],
      website: [''],
      phone: ['', [Validators.required]],
      phone2: [''],
      email: [''],
      email2: [''],
      location: [''],
      remarks: [''],
      callStatus: ['CONNECTED'],
      mailStatus: ['SENT'],
      whatsappStatus: ['READY']
    });
  }

  ngOnInit(): void {
    this.fetchNetworks();
  }

  fetchNetworks(): void {
    // In production, fetch via API endpoint: GET /api/v1/networks
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
    this.networkForm.reset({
      callStatus: 'CONNECTED',
      mailStatus: 'SENT',
      whatsappStatus: 'READY'
    });
    this.showFormModal.set(true);
  }

  openEditModal(item: NetworkItem): void {
    this.isEditing.set(true);
    this.editingId.set(item.id);
    this.networkForm.patchValue(item);
    this.showFormModal.set(true);
  }

  closeModal(): void {
    this.showFormModal.set(false);
  }

  saveNetwork(): void {
    if (this.networkForm.invalid) return;

    const val = this.networkForm.value;

    if (this.isEditing() && this.editingId()) {
      // Update
      const updated = this.networks().map(n => n.id === this.editingId() ? { ...n, ...val } : n);
      this.networks.set(updated);
      Swal.fire('Updated!', 'B2B Network partner updated successfully.', 'success');
    } else {
      // Create
      const newItem: NetworkItem = {
        id: Date.now(),
        ...val,
        isActive: true
      };
      this.networks.set([newItem, ...this.networks()]);
      Swal.fire('Created!', 'B2B Network partner added successfully.', 'success');
    }

    this.closeModal();
  }

  deleteNetwork(item: NetworkItem): void {
    Swal.fire({
      title: 'Delete Network Partner?',
      text: `Are you sure you want to delete ${item.name} (${item.agencyName || 'Partner'})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.networks.set(this.networks().filter(n => n.id !== item.id));
        Swal.fire('Deleted!', 'Network partner record removed.', 'success');
      }
    });
  }

  // DataTable Export Functions (CSV & Excel)
  exportCSV(): void {
    const list = this.filteredList();
    if (list.length === 0) return;

    const headers = ['ID', 'Name', 'Agency Name', 'Chapter', 'Categories', 'Phone', 'Email', 'Location', 'Call Status', 'WhatsApp Status'];
    const rows = list.map(item => [
      item.id,
      `"${item.name || ''}"`,
      `"${item.agencyName || ''}"`,
      `"${item.chapter || ''}"`,
      `"${item.categories || ''}"`,
      `"${item.phone || ''}"`,
      `"${item.email || ''}"`,
      `"${item.location || ''}"`,
      `"${item.callStatus || ''}"`,
      `"${item.whatsappStatus || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `B2B_Network_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
