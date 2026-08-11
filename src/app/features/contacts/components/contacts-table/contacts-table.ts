import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService, Contact } from '../../services/contact.service';
import { ApiService } from '../../../../shared/services/api.service';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input';
import Swal from 'sweetalert2';
import { ViewChild, ElementRef } from '@angular/core';
@Component({
  selector: 'app-contacts-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PhoneInputComponent],
  templateUrl: './contacts-table.html',
  styleUrl: './contacts-table.scss',
})
export class ContactsTable implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  contactService = inject(ContactService);
  private fb = inject(FormBuilder);
  private api = inject(ApiService);

  // Modal states
  showAddContactModal = signal(false);
  showImportModal = signal(false);
  showCreateGroupModal = signal(false);
  showSendMessageModal = signal(false);
  showFilterPanel = signal(false);

  // Editing state
  editingContactId = signal<number | null>(null);

  // Datatable Search, Filter & Pagination State
  searchQuery = signal('');
  filterLocation = signal('');
  filterSource = signal('');
  sortColumn = signal<string>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');
  
  currentPage = signal(1);
  pageSize = signal(10);

  // Single Send Message States
  activeSendMode = signal<'TEXT' | 'TEMPLATE'>('TEXT');
  messageText = signal('');
  selectedContactForMessage = signal<any>(null);
  approvedTemplates = signal<any[]>([]);
  selectedMessageTemplate = signal<any>(null);
  messageTemplateParams = signal<any>({});

  // Preview Mode
  isPreviewMode = signal(false);
  previewContacts = signal<any[]>([]);

  // Dropdown states
  showRunAdDropdown = signal(false);
  showImportDropdown = signal(false);

  // Group Form
  groupName = signal('');
  groupDescription = signal('');

  // Form
  contactForm: FormGroup;

  // Selection
  selectedIds = signal<number[]>([]);
  isBroadcastActive = computed(() => this.selectedIds().length > 0);
  
  isAllSelected = computed(() => {
    const list = this.paginatedContacts();
    return list.length > 0 && list.every(c => c.id !== undefined && this.selectedIds().includes(c.id));
  });

  constructor() {
    this.contactForm = this.fb.group({
      agencyName: [''],
      name: ['', Validators.required],
      location: [''],
      phone: ['', Validators.required],
      phone2: [''],
      email: [''],
      email2: [''],
      userName: [''],
      tags: [''],
      source: ['ORGANIC']
    });
  }

  ngOnInit() {
    this.contactService.fetchContacts();
  }

  // Filtered & Sorted Contacts computation
  processedContacts = computed(() => {
    let list = this.contactService.filteredContacts();
    const query = this.searchQuery().trim().toLowerCase();
    const loc = this.filterLocation().trim().toLowerCase();
    const src = this.filterSource().trim().toLowerCase();

    // 1. Search Query Filter
    if (query) {
      list = list.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.agencyName && c.agencyName.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query)) ||
        (c.phone2 && c.phone2.includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.location && c.location.toLowerCase().includes(query))
      );
    }

    // 2. Specific Location Filter
    if (loc) {
      list = list.filter(c => c.location && c.location.toLowerCase().includes(loc));
    }

    // 3. Source Filter
    if (src) {
      list = list.filter(c => c.source && c.source.toLowerCase().includes(src));
    }

    // 4. Sorting
    const col = this.sortColumn();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;

    list = [...list].sort((a: any, b: any) => {
      const valA = (a[col] || '').toString().toLowerCase();
      const valB = (b[col] || '').toString().toLowerCase();
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });

    return list;
  });

  // Pagination computation
  paginatedContacts = computed(() => {
    const list = this.processedContacts();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.processedContacts().length / this.pageSize()) || 1);

  changeSort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  toggleImportDropdown() { this.showImportDropdown.set(!this.showImportDropdown()); }
  closeDropdowns() { this.showImportDropdown.set(false); }

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      const pageIds = this.paginatedContacts().map(c => c.id!).filter(id => id !== undefined);
      const combined = Array.from(new Set([...this.selectedIds(), ...pageIds]));
      this.selectedIds.set(combined);
    } else {
      const pageIds = this.paginatedContacts().map(c => c.id!);
      this.selectedIds.set(this.selectedIds().filter(id => !pageIds.includes(id)));
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
    this.editingContactId.set(null);
    this.contactForm.reset({ source: 'ORGANIC' });
    this.showAddContactModal.set(true);
  }

  openEditContact(contact: Contact, event: Event) {
    event.stopPropagation();
    this.editingContactId.set(contact.id || null);
    this.contactForm.patchValue({
      agencyName: contact.agencyName || '',
      name: contact.name,
      location: contact.location || '',
      phone: contact.phone,
      phone2: contact.phone2 || '',
      email: contact.email || '',
      email2: contact.email2 || '',
      userName: contact.userName || '',
      tags: contact.tags ? contact.tags.join(', ') : '',
      source: contact.source || 'ORGANIC'
    });
    this.showAddContactModal.set(true);
  }

  closeAddContact() {
    this.showAddContactModal.set(false);
    this.editingContactId.set(null);
  }

  onAddContactSubmit() {
    if (this.contactForm.invalid) {
      Swal.fire('Error', 'Please enter required fields (Name and Phone Number)', 'error');
      return;
    }

    const val = this.contactForm.value;
    const payload = {
      type: this.contactService.activeType(),
      agencyName: val.agencyName || null,
      name: val.name,
      location: val.location || null,
      phone: val.phone,
      phone2: val.phone2 || null,
      email: val.email || null,
      email2: val.email2 || null,
      userName: val.userName || null,
      tags: val.tags ? val.tags.split(',').map((t: string) => t.trim()) : [],
      source: val.source,
      leadStage: 'New'
    };
    
    const editId = this.editingContactId();
    if (editId) {
      this.contactService.updateContact(editId, payload).subscribe({
        next: () => {
          this.closeAddContact();
          this.contactService.fetchContacts();
          Swal.fire('Success', 'Contact details updated successfully!', 'success');
        },
        error: (err: any) => Swal.fire('Error', err.error?.message || 'Failed to update contact', 'error')
      });
    } else {
      this.contactService.addContact(payload).subscribe({
        next: () => {
          this.closeAddContact();
          this.contactService.fetchContacts();
          Swal.fire('Success', 'New contact added successfully!', 'success');
        },
        error: (err: any) => Swal.fire('Error', err.error?.message || 'Failed to add contact', 'error')
      });
    }
  }

  deleteContact(contact: Contact, event: Event) {
    event.stopPropagation();
    if (!contact.id) return;

    Swal.fire({
      title: 'Delete Contact?',
      text: `Are you sure you want to delete ${contact.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    }).then((res) => {
      if (res.isConfirmed) {
        this.contactService.deleteContact(contact.id!).subscribe({
          next: () => {
            this.contactService.fetchContacts();
            Swal.fire('Deleted!', 'Contact removed successfully.', 'success');
          },
          error: (err: any) => Swal.fire('Error', err.error?.message || 'Failed to delete contact', 'error')
        });
      }
    });
  }

  openImportModal() {
   this.showImportDropdown.set(false);
        this.fileInput.nativeElement.click(); // Trigger the hidden file input
  }

  closeImportModal() {
    this.showImportModal.set(false);
  }

  onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: any) => {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const result = [];
            
            // Basic CSV parsing (assuming headers: Name, Phone, Email, Location, AgencyName)
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const currentline = lines[i].split(',');
                
                // Construct preview object based on standard columns
                result.push({
                    name: currentline[0]?.trim(),
                    phone: currentline[1]?.trim(),
                    email: currentline[2]?.trim() || '',
                    location: currentline[3]?.trim() || '',
                    agencyName: currentline[4]?.trim() || '',
                    type: this.contactService.activeType(),
                    source: 'IMPORT'
                });
            }
            
            this.previewContacts.set(result);
            this.isPreviewMode.set(true); // Switches UI to the green preview top bar
            this.fileInput.nativeElement.value = ''; // Reset input
        };
        reader.readAsText(file);
    }
cancelImport() {
        this.isPreviewMode.set(false);
        this.previewContacts.set([]);
    }
  approveImport() {
        const payload = { contacts: this.previewContacts() };
        
        // Hit your backend bulk import route
        this.api.post('/contacts/bulk', payload).subscribe({
            next: () => {
                Swal.fire('Imported!', `${this.previewContacts().length} contacts imported successfully.`, 'success');
                this.isPreviewMode.set(false);
                this.previewContacts.set([]);
                // Refresh the table
                this.contactService.fetchContacts(); 
            },
            error: (err) => Swal.fire('Import Failed', err.error?.error || 'Failed to import sheet', 'error')
        });
    }

  cancelPreview() {
    this.isPreviewMode.set(false);
    this.previewContacts.set([]);
  }

  downloadSample() {
    const activeType = this.contactService.activeType();
    let csvContent = "";
    let filename = "";

    if (activeType === 'B2B') {
      csvContent = "Serial number,Agency Name,Agent Name,Location,Phone Number 1,Phone Number 2,Mail id 1,Mail id 2\n1,Pace Tourism,John Doe,New York,+919876543210,+919876543211,john@pace.com,doe@pace.com";
      filename = "b2b_contacts_sample.csv";
    } else {
      csvContent = "Serial number,Customer Name,Location,Number 1,Number 2,Mail 1,Mail 2\n1,Alice Smith,London,+919876543210,+919876543211,alice@gmail.com,alice2@gmail.com";
      filename = "b2c_contacts_sample.csv";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

openCreateGroup() {
    const ids = this.selectedIds();
    if (ids.length === 0) return;

    Swal.fire({
        title: `Create ${this.contactService.activeType()} Group`,
        html: `
            <input id="swal-group-name" class="swal2-input" placeholder="Group Name (e.g. VIP Dubai)">
            <input id="swal-group-desc" class="swal2-input" placeholder="Description (Optional)">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Create Group',
        confirmButtonColor: '#0f172a',
        preConfirm: () => {
            const name = (document.getElementById('swal-group-name') as HTMLInputElement).value;
            if (!name) Swal.showValidationMessage('Group Name is required');
            return {
                name,
                desc: (document.getElementById('swal-group-desc') as HTMLInputElement).value
            };
        }
    }).then((result) => {
        if (result.isConfirmed && result.value?.name) {
            // Pass the selected IDs array as the 4th parameter
            this.contactService.createGroup(result.value.name, result.value.desc, this.contactService.activeType(), ids).subscribe({
                next: () => {
                    this.selectedIds.set([]); // Clear selection
                    this.contactService.fetchGroups(); // Refresh sidebar groups
                    Swal.fire('Created', `Group created with ${ids.length} contacts!`, 'success');
                },
                error: (err) => Swal.fire('Error', 'Failed to create group', 'error')
            });
        }
    });
}

  closeCreateGroup() {
    this.showCreateGroupModal.set(false);
  }

  submitCreateGroup() {
    if (!this.groupName()) {
      Swal.fire("Error", "Group name is required", 'error');
      return;
    }
    this.contactService.createGroup(
      this.groupName(),
      this.groupDescription(),
      this.contactService.activeType(),
      this.selectedIds()
    ).subscribe({
      next: () => {
        this.closeCreateGroup();
        this.selectedIds.set([]);
        this.contactService.fetchGroups();
        Swal.fire("Success", "Contact Group created successfully!", 'success');
      },
      error: (err: any) => {
        Swal.fire("Error", err.message, 'error');
      }
    });
  }

openSendMessage(contact: any, event: Event) {
    event.stopPropagation();
    
    Swal.fire({
        title: `Message ${contact.name}`,
        input: 'textarea',
        inputPlaceholder: 'Type your WhatsApp message here...',
        showCancelButton: true,
        confirmButtonText: 'Send <i class="fa-solid fa-paper-plane"></i>',
        confirmButtonColor: '#10b981'
    }).then(res => {
        if (res.isConfirmed && res.value) {
            // Hit your message.controller.js sendOutbound endpoint
            this.api.post('/messages/send-outbound', {
                contactId: contact.id,
                phone: contact.phone,
                textContent: res.value
            }).subscribe({
                next: () => Swal.fire('Sent!', 'Message delivered successfully.', 'success'),
                error: (err) => Swal.fire('Error', err.error?.error || 'Failed to send', 'error')
            });
        }
    });
}

  closeSendMessage() {
    this.showSendMessageModal.set(false);
    this.selectedContactForMessage.set(null);
  }

  selectMessageTemplate(tpl: any) {
    this.selectedMessageTemplate.set(tpl);
    const matches = tpl.templateBody.match(/\{\{\d+\}\}/g) || [];
    const paramsMap: any = {};
    matches.forEach((match: string) => {
      const num = match.replace(/[\{\}]/g, '');
      paramsMap[num] = '';
    });
    this.messageTemplateParams.set(paramsMap);
  }

  getTemplateParamKeys() {
    return Object.keys(this.messageTemplateParams());
  }

  onParamChange(key: string, event: any) {
    const current = { ...this.messageTemplateParams() };
    current[key] = event.target.value;
    this.messageTemplateParams.set(current);
  }

  dispatchSingleMessage() {
    const contact = this.selectedContactForMessage();
    if (!contact) return;

    if (this.activeSendMode() === 'TEXT') {
      if (!this.messageText()) {
        Swal.fire("Error", "Please enter message text", 'error');
        return;
      }
      this.api.post('/messages/send', {
        recipientPhone: contact.phone,
        textContent: this.messageText()
      }).subscribe({
        next: () => {
          this.closeSendMessage();
          Swal.fire("Message Sent", `WhatsApp message sent to ${contact.name}`, 'success');
        },
        error: (err: any) => Swal.fire("Delivery Failed", err.error?.error || err.message, 'error')
      });
    } else {
      if (!this.selectedMessageTemplate()) {
        Swal.fire("Error", "Please select a message template", 'error');
        return;
      }
      const payload = {
        templateId: this.selectedMessageTemplate().id,
        phone: contact.phone,
        parameters: this.messageTemplateParams()
      };
      this.api.post('/campaigns/send-test', payload).subscribe({
        next: () => {
          this.closeSendMessage();
          Swal.fire("Template Sent", `Template message delivered to ${contact.name}`, 'success');
        },
        error: (err: any) => Swal.fire("Delivery Failed", err.error?.error || err.message, 'error')
      });
    }
  }
}
