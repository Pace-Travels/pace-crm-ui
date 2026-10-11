import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface BusinessNetworkItem {
  id: number;
  name: string;
  agencyName?: string;
  organizationType: 'BNI' | 'ROTARY' | 'LIONS_CLUB' | 'TIE' | 'YPO' | 'SPECIAL_GROUP' | 'OTHER';
  level: 'LOCAL' | 'DISTRICT' | 'STATE' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL';
  chapter?: string;
  districtName?: string;
  regionName?: string;
  specialGroupTag?: string;
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
  networks = signal<BusinessNetworkItem[]>([
    {
      id: 1,
      name: "Rajesh Sharma",
      agencyName: "Pace Travels BLR",
      organizationType: "BNI",
      level: "LOCAL",
      chapter: "BNI Champions Bengaluru",
      districtName: "Bengaluru South District",
      regionName: "Karnataka Region",
      specialGroupTag: "Outbound Travel Focus",
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
      organizationType: "ROTARY",
      level: "DISTRICT",
      chapter: "Rotary Midtown Delhi",
      districtName: "District 3011",
      regionName: "North India Region",
      specialGroupTag: "Women Entrepreneurs Forum",
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
  selectedOrgFilter = signal<string>('ALL');
  selectedLevelFilter = signal<string>('ALL');
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
    const org = this.selectedOrgFilter();
    const level = this.selectedLevelFilter();

    if (org !== 'ALL') {
      list = list.filter(item => item.organizationType === org);
    }

    if (level !== 'ALL') {
      list = list.filter(item => item.level === level);
    }

    if (query) {
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.agencyName && item.agencyName.toLowerCase().includes(query)) ||
        (item.chapter && item.chapter.toLowerCase().includes(query)) ||
        (item.districtName && item.districtName.toLowerCase().includes(query)) ||
        (item.specialGroupTag && item.specialGroupTag.toLowerCase().includes(query)) ||
        (item.phone && item.phone.toLowerCase().includes(query)) ||
        (item.email && item.email.toLowerCase().includes(query))
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
      organizationType: ['BNI', [Validators.required]],
      level: ['LOCAL', [Validators.required]],
      chapter: [''],
      districtName: [''],
      regionName: [''],
      specialGroupTag: [''],
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
    this.api.get<any>('businessnetworks/list').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.networks.set(res.data);
        }
      },
      error: () => {}
    });
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
      organizationType: 'BNI',
      level: 'LOCAL',
      callStatus: 'CONNECTED',
      mailStatus: 'SENT',
      whatsappStatus: 'READY'
    });
    this.showFormModal.set(true);
  }

  openEditModal(item: BusinessNetworkItem): void {
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
      const updated = this.networks().map(n => n.id === this.editingId() ? { ...n, ...val } : n);
      this.networks.set(updated);
      Swal.fire('Updated!', 'Business Network record updated successfully.', 'success');
    } else {
      const newItem: BusinessNetworkItem = {
        id: Date.now(),
        ...val,
        isActive: true
      };
      this.networks.set([newItem, ...this.networks()]);
      Swal.fire('Created!', 'Business Network record added successfully.', 'success');
    }

    this.closeModal();
  }

  deleteNetwork(item: BusinessNetworkItem): void {
    Swal.fire({
      title: 'Delete Business Network?',
      text: `Are you sure you want to delete ${item.name} (${item.agencyName || item.organizationType})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.networks.set(this.networks().filter(n => n.id !== item.id));
        Swal.fire('Deleted!', 'Business Network record removed.', 'success');
      }
    });
  }

  exportCSV(): void {
    const list = this.filteredList();
    if (list.length === 0) return;

    const headers = ['ID', 'Name', 'Agency Name', 'Org Type', 'Level', 'Chapter', 'District', 'Region', 'Special Group', 'Phone', 'Email', 'Location'];
    const rows = list.map(item => [
      item.id,
      `"${item.name || ''}"`,
      `"${item.agencyName || ''}"`,
      `"${item.organizationType || ''}"`,
      `"${item.level || ''}"`,
      `"${item.chapter || ''}"`,
      `"${item.districtName || ''}"`,
      `"${item.regionName || ''}"`,
      `"${item.specialGroupTag || ''}"`,
      `"${item.phone || ''}"`,
      `"${item.email || ''}"`,
      `"${item.location || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Business_Networks_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
