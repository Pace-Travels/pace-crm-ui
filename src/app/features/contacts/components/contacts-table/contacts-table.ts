import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService, Contact } from '../../services/contact.service';

@Component({
  selector: 'app-contacts-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './contacts-table.html',
  styleUrl: './contacts-table.scss',
})
export class ContactsTable implements OnInit {
  // Modal states
  showAddContactModal = signal(false);
  showImportModal = signal(false);

  // Dropdown states
  showRunAdDropdown = signal(false);
  showImportDropdown = signal(false);
  showActionsDropdown = signal(false);

  // Form
  contactForm: FormGroup;

  // Selection
  selectedIds = signal<number[]>([]);
  isBroadcastActive = computed(() => this.selectedIds().length > 0);
  isAllSelected = computed(() => {
    const contacts = this.contactService.contacts();
    return contacts.length > 0 && this.selectedIds().length === contacts.length;
  });

  constructor(
    public contactService: ContactService,
    private fb: FormBuilder
  ) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      userName: [''],
      countryCode: ['+91'],
      phone: ['', Validators.required],
      tags: [''],
      source: ['ORGANIC']
    });
  }

  ngOnInit() {
    this.contactService.fetchContacts();
  }

  toggleRunAdDropdown() { this.showRunAdDropdown.set(!this.showRunAdDropdown()); this.showImportDropdown.set(false); this.showActionsDropdown.set(false); }
  toggleImportDropdown() { this.showImportDropdown.set(!this.showImportDropdown()); this.showRunAdDropdown.set(false); this.showActionsDropdown.set(false); }
  toggleActionsDropdown() { this.showActionsDropdown.set(!this.showActionsDropdown()); this.showRunAdDropdown.set(false); this.showImportDropdown.set(false); }

  closeDropdowns() {
    this.showRunAdDropdown.set(false);
    this.showImportDropdown.set(false);
    this.showActionsDropdown.set(false);
  }

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      const allIds = this.contactService.contacts().map(c => c.id!).filter(id => id !== undefined);
      this.selectedIds.set(allIds);
    } else {
      this.selectedIds.set([]);
    }
  }

  toggleSelect(id: number | undefined) {
    if (id === undefined) return;
    const current = this.selectedIds();
    if (current.includes(id)) {
      this.selectedIds.set(current.filter(i => i !== id));
    } else {
      this.selectedIds.set([...current, id]);
    }
  }

  isSelected(id: number | undefined) {
    return id !== undefined && this.selectedIds().includes(id);
  }

  openAddContact() {
    this.contactForm.reset({ countryCode: '+91', source: 'ORGANIC' });
    this.showAddContactModal.set(true);
  }

  closeAddContact() {
    this.showAddContactModal.set(false);
  }

  onAddContactSubmit() {
    if (this.contactForm.valid) {
      const val = this.contactForm.value;
      const payload = {
        name: val.name,
        userName: val.userName,
        phone: val.phone,
        tags: val.tags ? [val.tags] : [], // Simplistic array conversion for demo
        source: val.source,
        leadStage: 'New'
      };
      
      this.contactService.addContact(payload).subscribe({
        next: () => {
          this.closeAddContact();
          this.contactService.fetchContacts();
        }
      });
    }
  }

  openImportModal() {
    this.closeDropdowns();
    this.showImportModal.set(true);
  }

  closeImportModal() {
    this.showImportModal.set(false);
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.contactService.importCsv(file).subscribe({
        next: () => {
          this.closeImportModal();
          this.contactService.fetchContacts();
        }
      });
    }
  }
}
