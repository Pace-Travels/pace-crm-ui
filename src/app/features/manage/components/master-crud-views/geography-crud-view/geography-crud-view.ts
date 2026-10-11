import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface NetworkStateItem {
  id: number;
  name: string;
  code?: string;
  country: string;
  isActive: boolean;
}

export interface NetworkCityItem {
  id: number;
  networkStateId?: number;
  stateName?: string;
  name: string;
  code?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-geography-crud-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './geography-crud-view.html',
  styleUrl: './geography-crud-view.scss'
})
export class GeographyCrudView implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  activeTab = signal<'STATE' | 'CITY'>('STATE');

  states = signal<NetworkStateItem[]>([
    { id: 1, name: 'Karnataka', code: 'KA', country: 'India', isActive: true },
    { id: 2, name: 'Maharashtra', code: 'MH', country: 'India', isActive: true },
    { id: 3, name: 'Delhi NCR', code: 'DL', country: 'India', isActive: true }
  ]);

  cities = signal<NetworkCityItem[]>([
    { id: 10, networkStateId: 1, stateName: 'Karnataka', name: 'Bengaluru', code: 'BLR', isActive: true },
    { id: 11, networkStateId: 1, stateName: 'Karnataka', name: 'Mysuru', code: 'MYQ', isActive: true },
    { id: 12, networkStateId: 2, stateName: 'Maharashtra', name: 'Mumbai', code: 'BOM', isActive: true }
  ]);

  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Modals
  showStateModal = signal<boolean>(false);
  showCityModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId = signal<number | null>(null);

  stateForm: FormGroup;
  cityForm: FormGroup;

  filteredStates = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.states();
    return this.states().filter(s => s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q)));
  });

  filteredCities = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.cities();
    return this.cities().filter(c => c.name.toLowerCase().includes(q) || (c.stateName && c.stateName.toLowerCase().includes(q)));
  });

  constructor() {
    this.stateForm = this.fb.group({
      name: ['', [Validators.required]],
      code: [''],
      country: ['India', [Validators.required]]
    });

    this.cityForm = this.fb.group({
      networkStateId: ['', [Validators.required]],
      name: ['', [Validators.required]],
      code: ['']
    });
  }

  ngOnInit(): void {}

  openStateModal(item?: NetworkStateItem): void {
    if (item) {
      this.isEditing.set(true);
      this.editingId.set(item.id);
      this.stateForm.patchValue(item);
    } else {
      this.isEditing.set(false);
      this.editingId.set(null);
      this.stateForm.reset({ country: 'India' });
    }
    this.showStateModal.set(true);
  }

  openCityModal(item?: NetworkCityItem): void {
    if (item) {
      this.isEditing.set(true);
      this.editingId.set(item.id);
      this.cityForm.patchValue(item);
    } else {
      this.isEditing.set(false);
      this.editingId.set(null);
      this.cityForm.reset();
    }
    this.showCityModal.set(true);
  }

  saveState(): void {
    if (this.stateForm.invalid) return;
    const val = this.stateForm.value;

    if (this.isEditing() && this.editingId()) {
      this.states.set(this.states().map(s => s.id === this.editingId() ? { ...s, ...val } : s));
      Swal.fire('Updated!', 'State updated successfully.', 'success');
    } else {
      const newSt: NetworkStateItem = { id: Date.now(), ...val, isActive: true };
      this.states.set([...this.states(), newSt]);
      Swal.fire('Created!', 'New State created.', 'success');
    }
    this.showStateModal.set(false);
  }

  saveCity(): void {
    if (this.cityForm.invalid) return;
    const val = this.cityForm.value;
    const parentState = this.states().find(s => s.id === +val.networkStateId);

    if (this.isEditing() && this.editingId()) {
      this.cities.set(this.cities().map(c => c.id === this.editingId() ? { ...c, ...val, stateName: parentState?.name } : c));
      Swal.fire('Updated!', 'City updated successfully.', 'success');
    } else {
      const newCity: NetworkCityItem = { id: Date.now(), ...val, stateName: parentState?.name, isActive: true };
      this.cities.set([...this.cities(), newCity]);
      Swal.fire('Created!', 'New City created.', 'success');
    }
    this.showCityModal.set(false);
  }
}
