import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface CannedResponseItem {
  id: number;
  shortcut: string;
  category: string;
  content: string;
  isActive: boolean;
}

@Component({
  selector: 'app-canned-responses-crud-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './canned-responses-crud-view.html',
  styleUrl: './canned-responses-crud-view.scss'
})
export class CannedResponsesCrudView implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  responses = signal<CannedResponseItem[]>([
    { id: 1, shortcut: '/welcome', category: 'GREETING', content: 'Hello {{contact_name}}! Welcome to Pace Travels. How can we assist with your itinerary today?', isActive: true },
    { id: 2, shortcut: '/pricing', category: 'PRICING', content: 'Here is our detailed package breakdown: {{package_details}}. Let us know if you have questions!', isActive: true },
    { id: 3, shortcut: '/thanks', category: 'CLOSING', content: 'Thank you for choosing Pace Travels! Have a wonderful trip.', isActive: true }
  ]);

  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId = signal<number | null>(null);
  cannedForm: FormGroup;

  filteredList = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.responses();
    return this.responses().filter(r => 
      r.shortcut.toLowerCase().includes(q) || 
      r.category.toLowerCase().includes(q) || 
      r.content.toLowerCase().includes(q)
    );
  });

  constructor() {
    this.cannedForm = this.fb.group({
      shortcut: ['', [Validators.required]],
      category: ['GREETING', [Validators.required]],
      content: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {}

  openModal(item?: CannedResponseItem): void {
    if (item) {
      this.isEditing.set(true);
      this.editingId.set(item.id);
      this.cannedForm.patchValue(item);
    } else {
      this.isEditing.set(false);
      this.editingId.set(null);
      this.cannedForm.reset({ category: 'GREETING' });
    }
    this.showModal.set(true);
  }

  saveResponse(): void {
    if (this.cannedForm.invalid) return;
    const val = this.cannedForm.value;
    if (!val.shortcut.startsWith('/')) {
      val.shortcut = '/' + val.shortcut.trim();
    }

    if (this.isEditing() && this.editingId()) {
      this.responses.set(this.responses().map(r => r.id === this.editingId() ? { ...r, ...val } : r));
      Swal.fire('Updated!', 'Quick canned response updated.', 'success');
    } else {
      const newItem: CannedResponseItem = { id: Date.now(), ...val, isActive: true };
      this.responses.set([newItem, ...this.responses()]);
      Swal.fire('Created!', 'New quick canned response added.', 'success');
    }
    this.showModal.set(false);
  }

  deleteResponse(item: CannedResponseItem): void {
    Swal.fire({
      title: 'Delete Shortcut?',
      text: `Delete shortcut ${item.shortcut}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    }).then((res) => {
      if (res.isConfirmed) {
        this.responses.set(this.responses().filter(r => r.id !== item.id));
        Swal.fire('Deleted!', 'Shortcut deleted.', 'success');
      }
    });
  }
}
