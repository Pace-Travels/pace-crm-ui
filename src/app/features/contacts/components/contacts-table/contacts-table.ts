import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService, Contact } from '../../services/contact.service';
import { ApiService } from '../../../../shared/services/api.service';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input';
import Swal from 'sweetalert2';
import { ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

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
  private router = inject(Router);

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

  // Bulk Send States
  isBulkSendMode = signal(false);
  showBulkSummaryModal = signal(false);
  bulkSendResults = signal<any[]>([]);
  bulkSummaryStats = signal<{ total: number; success: number; failed: number } | null>(null);
  isSendingBulk = signal(false);
  bulkProgress = signal<number>(0);

  // Preview & Verification Mode
  isPreviewMode = signal(false);
  previewContacts = signal<any[]>([]);
  verificationSummary = signal<any>(null);

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
  selectedPreviewSerials = signal<number[]>([]);
  isBroadcastActive = computed(() => this.selectedIds().length > 0);
  
  isAllSelected = computed(() => {
    const list = this.paginatedContacts();
    return list.length > 0 && list.every(c => c.id !== undefined && this.selectedIds().includes(c.id));
  });

  isAllPreviewSelected = computed(() => {
    const list = this.paginatedContacts();
    return list.length > 0 && list.every(c => c.serialNumber !== undefined && this.selectedPreviewSerials().includes(c.serialNumber));
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
    let list = this.isPreviewMode() ? this.previewContacts() : this.contactService.filteredContacts();
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

    let parsedTags = '';
    if (contact.tags) {
      if (Array.isArray(contact.tags)) {
        parsedTags = contact.tags.join(', ');
      } else if (typeof contact.tags === 'string') {
        try {
          const parsed = JSON.parse(contact.tags);
          if (Array.isArray(parsed)) {
            parsedTags = parsed.join(', ');
          } else {
            parsedTags = contact.tags;
          }
        } catch (e) {
          parsedTags = contact.tags;
        }
      }
    }

    this.contactForm.patchValue({
      agencyName: contact.agencyName || '',
      name: contact.name,
      location: contact.location || '',
      phone: contact.phone,
      phone2: contact.phone2 || '',
      email: contact.email || '',
      email2: contact.email2 || '',
      userName: contact.userName || '',
      tags: parsedTags,
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
        error: (err: any) => Swal.fire('Error', err.error?.error || err.error?.message || 'Failed to update contact', 'error')
      });
    } else {
      this.contactService.addContact(payload).subscribe({
        next: () => {
          this.closeAddContact();
          this.contactService.fetchContacts();
          Swal.fire('Success', 'New contact added successfully!', 'success');
        },
        error: (err: any) => Swal.fire('Error', err.error?.error || err.error?.message || 'Failed to add contact', 'error')
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
      const lines = csv.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
      if (lines.length <= 1) {
        Swal.fire('Error', 'Uploaded CSV file contains no data rows.', 'error');
        this.fileInput.nativeElement.value = '';
        return;
      }

      // Robust CSV line parser handling quotes, commas, and Excel formula formulas like ="'+91987..."
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headers = parseCsvLine(lines[0]).map((h: string) => h.trim().toLowerCase());
      const rawRows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const rowObj: any = {};
        headers.forEach((h: string, idx: number) => {
          let val = values[idx] || '';
          // Strip outer quotes and Excel formula wrapper (e.g., ="'+91987..." -> +91987...)
          val = val.replace(/^=\s*['"]?|['"]$/g, '').trim();
          rowObj[h] = val;
        });
        rawRows.push(rowObj);
      }

      // Call Verification & Validation Service
      this.api.post<any>('/whatsappcontacts/verify-import', {
        contacts: rawRows,
        type: this.contactService.activeType()
      }).subscribe({
        next: (res) => {
          if (res.success) {
            this.previewContacts.set(res.rows || []);
            this.verificationSummary.set(res.summary || null);
            
            // Default select VALID and WARNING rows
            const validSerials = (res.rows || [])
              .filter((r: any) => r.verificationStatus === 'VALID' || r.verificationStatus === 'WARNING')
              .map((r: any) => r.serialNumber);
            this.selectedPreviewSerials.set(validSerials);

            this.isPreviewMode.set(true);
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: `WhatsApp Verification Complete: ${res.summary?.validCount || 0} Valid Numbers`,
              timer: 3000,
              showConfirmButton: false
            });
          }
          this.fileInput.nativeElement.value = '';
        },
        error: (err) => {
          Swal.fire('Verification Failed', err.error?.error || err.message || 'Failed to verify upload data', 'error');
          this.fileInput.nativeElement.value = '';
        }
      });
    };
    reader.readAsText(file);
  }

  cancelImport() {
    this.isPreviewMode.set(false);
    this.previewContacts.set([]);
    this.selectedPreviewSerials.set([]);
  }

  approveImport() {
    const selectedSerials = new Set(this.selectedPreviewSerials());
    const contactsToSave = this.previewContacts().filter((c: any) => selectedSerials.has(c.serialNumber));
    
    if (contactsToSave.length === 0) {
      Swal.fire('Error', 'Please select at least one contact to import.', 'error');
      return;
    }

    const payload = { contacts: contactsToSave };
    
    this.api.post('/whatsappcontacts/bulk-save', payload).subscribe({
      next: () => {
        Swal.fire('Imported!', `${contactsToSave.length} contacts imported successfully.`, 'success');
        this.isPreviewMode.set(false);
        this.previewContacts.set([]);
        this.selectedPreviewSerials.set([]);
        this.contactService.fetchContacts(); 
      },
      error: (err) => Swal.fire('Import Failed', err.error?.error || err.message || 'Failed to import sheet', 'error')
    });
  }

  cancelPreview() {
    this.isPreviewMode.set(false);
    this.previewContacts.set([]);
    this.selectedPreviewSerials.set([]);
  }

  togglePreviewSelect(serialNumber: number | undefined) {
    if (serialNumber === undefined) return;
    if (this.selectedPreviewSerials().includes(serialNumber)) {
      this.selectedPreviewSerials.set(this.selectedPreviewSerials().filter(x => x !== serialNumber));
    } else {
      this.selectedPreviewSerials.set([...this.selectedPreviewSerials(), serialNumber]);
    }
  }

  togglePreviewSelectAll(event: any) {
    if (event.target.checked) {
      const pageSerials = this.paginatedContacts().map(c => c.serialNumber).filter((s): s is number => s !== undefined);
      const combined = Array.from(new Set([...this.selectedPreviewSerials(), ...pageSerials]));
      this.selectedPreviewSerials.set(combined);
    } else {
      const pageSerials = this.paginatedContacts().map(c => c.serialNumber);
      this.selectedPreviewSerials.set(this.selectedPreviewSerials().filter(s => !pageSerials.includes(s)));
    }
  }

  isPreviewSelected(serialNumber: number | undefined) {
    return serialNumber !== undefined && this.selectedPreviewSerials().includes(serialNumber);
  }

  goToLiveChat(contact: any, event?: Event) {
    if (event) event.stopPropagation();
    if (!contact || !contact.phone) return;
    this.router.navigate(['/chat'], { queryParams: { phone: contact.phone, name: contact.name } });
  }

  downloadSample() {
    const activeType = this.contactService.activeType();
    let csvContent = "";
    let filename = "";

    if (activeType === 'B2B') {
      csvContent = "Serial number,Agency Name,Agent Name,Location,Phone Number 1,Phone Number 2,Mail id 1,Mail id 2,Agent Username,Tags,Lead Source\n1,Pace Tourism,John Doe,New York,=\"'+919876543210\",=\"'+919876543211\",john@pace.com,doe@pace.com,johndoe,\"VIP, Active\",IMPORT";
      filename = "b2b_contacts_sample.csv";
    } else {
      csvContent = "Serial number,Customer Name,Location,Number 1,Number 2,Mail 1,Mail 2,Tags,Lead Source\n1,Alice Smith,London,=\"'+919876543210\",=\"'+919876543211\",alice@gmail.com,alice2@gmail.com,\"Prospect\",IMPORT";
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

  exportContacts() {
    const activeType = this.contactService.activeType();
    const contacts = this.processedContacts();
    if (!contacts || contacts.length === 0) {
      Swal.fire('Info', `No ${activeType} contacts available to export.`, 'info');
      return;
    }

    const formatPhoneForExcel = (phone: string) => {
      if (!phone) return '""';
      const clean = phone.replace(/^=\s*['"]?|['"]$/g, '').trim();
      return clean ? `="'+${clean.replace(/^\+/, '')}"` : '""';
    };

    let csv = '';
    if (activeType === 'B2B') {
      csv = 'Serial number,Agency Name,Agent Name,Location,Phone Number 1,Phone Number 2,Mail id 1,Mail id 2,Agent Username,Tags,Lead Source\n';
      contacts.forEach((c: any, idx: number) => {
        const agency = (c.agencyName || '').replace(/"/g, '""');
        const name = (c.name || '').replace(/"/g, '""');
        const loc = (c.location || '').replace(/"/g, '""');
        const p1 = formatPhoneForExcel(c.phone);
        const p2 = formatPhoneForExcel(c.phone2);
        const e1 = (c.email || '').replace(/"/g, '""');
        const e2 = (c.email2 || '').replace(/"/g, '""');
        const uname = (c.userName || '').replace(/"/g, '""');
        const tagsList = Array.isArray(c.tags) ? c.tags.join(', ') : (c.tags || '');
        const tgs = tagsList.replace(/"/g, '""');
        const src = (c.source || 'ORGANIC').replace(/"/g, '""');
        csv += `${idx + 1},"${agency}","${name}","${loc}",${p1},${p2},"${e1}","${e2}","${uname}","${tgs}","${src}"\n`;
      });
    } else {
      csv = 'Serial number,Customer Name,Location,Number 1,Number 2,Mail 1,Mail 2,Tags,Lead Source\n';
      contacts.forEach((c: any, idx: number) => {
        const name = (c.name || '').replace(/"/g, '""');
        const loc = (c.location || '').replace(/"/g, '""');
        const p1 = formatPhoneForExcel(c.phone);
        const p2 = formatPhoneForExcel(c.phone2);
        const e1 = (c.email || '').replace(/"/g, '""');
        const e2 = (c.email2 || '').replace(/"/g, '""');
        const tagsList = Array.isArray(c.tags) ? c.tags.join(', ') : (c.tags || '');
        const tgs = tagsList.replace(/"/g, '""');
        const src = (c.source || 'ORGANIC').replace(/"/g, '""');
        csv += `${idx + 1},"${name}","${loc}",${p1},${p2},"${e1}","${e2}","${tgs}","${src}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeType.toLowerCase()}_contacts_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('Export Complete', `${contacts.length} ${activeType} contacts exported successfully!`, 'success');
  }

openCreateGroup() {
    const ids = this.selectedIds();
    if (ids.length === 0) return;

    const activeType = this.contactService.activeType();
    const existingGroups = this.contactService.groups().filter(g => g.contactType === activeType);

    let htmlContent = `
        <div style="margin-bottom: 16px; text-align: left;">
            <label style="font-weight: 700; font-size: 13.5px; color: #334155; display: block; margin-bottom: 6px;">Choose Action:</label>
            <select id="swal-action-type" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 14px;">
                <option value="NEW">Create New Group</option>
                ${existingGroups.length > 0 ? '<option value="EXISTING">Add to Existing Group</option>' : ''}
            </select>
        </div>

        <div id="swal-new-group-fields" style="display: block;">
            <input id="swal-group-name" class="swal2-input" placeholder="Group Name (e.g. VIP Dubai)" style="width: 100%; margin: 8px 0; box-sizing: border-box;">
            <input id="swal-group-desc" class="swal2-input" placeholder="Description (Optional)" style="width: 100%; margin: 8px 0; box-sizing: border-box;">
            <select id="swal-group-icon" class="swal2-input" style="width: 100%; margin: 8px 0; box-sizing: border-box;">
                <option value="fa-layer-group">Default Icon</option>
                <option value="fa-users">People</option>
                <option value="fa-building">Company</option>
                <option value="fa-star">Star</option>
                <option value="fa-heart">Favorite</option>
                <option value="fa-tag">Tag</option>
                <option value="fa-award">VIP</option>
                <option value="fa-crown">Premium</option>
                <option value="fa-rocket">Active</option>
                <option value="fa-briefcase">Work</option>
                <option value="fa-compass">Explorer</option>
                <option value="fa-plane">Traveler</option>
                <option value="fa-globe">Global</option>
            </select>
        </div>
    `;

    if (existingGroups.length > 0) {
        htmlContent += `
            <div id="swal-existing-group-fields" style="display: none; text-align: left; margin-top: 10px;">
                <label style="font-weight: 700; font-size: 13.5px; color: #334155; display: block; margin-bottom: 6px;">Select Group:</label>
                <select id="swal-existing-group-id" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; font-size: 14px;">
                    ${existingGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                </select>
            </div>
        `;
    }

    Swal.fire({
        title: `Group Management`,
        html: htmlContent,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Submit',
        confirmButtonColor: '#0b494d',
        didOpen: () => {
            const actionTypeSelect = document.getElementById('swal-action-type') as HTMLSelectElement;
            const newGroupFields = document.getElementById('swal-new-group-fields');
            const existingGroupFields = document.getElementById('swal-existing-group-fields');

            actionTypeSelect?.addEventListener('change', () => {
                if (actionTypeSelect.value === 'NEW') {
                    if (newGroupFields) newGroupFields.style.display = 'block';
                    if (existingGroupFields) existingGroupFields.style.display = 'none';
                } else {
                    if (newGroupFields) newGroupFields.style.display = 'none';
                    if (existingGroupFields) existingGroupFields.style.display = 'block';
                }
            });
        },
        preConfirm: () => {
            const action = (document.getElementById('swal-action-type') as HTMLSelectElement).value;
            if (action === 'NEW') {
                const name = (document.getElementById('swal-group-name') as HTMLInputElement).value;
                if (!name) {
                    Swal.showValidationMessage('Group Name is required');
                    return false;
                }
                return {
                    action,
                    name,
                    desc: (document.getElementById('swal-group-desc') as HTMLInputElement).value,
                    icon: (document.getElementById('swal-group-icon') as HTMLSelectElement).value
                };
            } else {
                const groupId = (document.getElementById('swal-existing-group-id') as HTMLSelectElement).value;
                return {
                    action,
                    groupId: parseInt(groupId, 10)
                };
            }
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            const val = result.value;
            if (val.action === 'NEW') {
                this.contactService.createGroup(val.name, val.desc, activeType, ids, val.icon).subscribe({
                    next: () => {
                        this.selectedIds.set([]); // Clear selection
                        this.contactService.fetchGroups(); // Refresh sidebar groups
                        Swal.fire('Created', `Group created with ${ids.length} contacts!`, 'success');
                    },
                    error: () => Swal.fire('Error', 'Failed to create group', 'error')
                });
            } else {
                this.contactService.addContactsToGroup(val.groupId, ids).subscribe({
                    next: (res: any) => {
                        this.selectedIds.set([]); // Clear selection
                        // If they are currently viewing the group that they added contacts to, refresh the view
                        if (this.contactService.selectedGroup()?.id === val.groupId) {
                            this.contactService.refreshActiveGroupMembers();
                        }
                        Swal.fire('Contacts Added!', `Added ${ids.length} contacts to the group successfully.`, 'success');
                    },
                    error: () => Swal.fire('Error', 'Failed to add contacts to group', 'error')
                });
            }
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
    this.isBulkSendMode.set(false);
    this.selectedContactForMessage.set(contact);
    this.messageText.set('');
    this.activeSendMode.set('TEXT');
    this.selectedMessageTemplate.set(null);
    this.messageTemplateParams.set({});

    this.api.get<any>('/messagetemplates/list').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.approvedTemplates.set(res.data.filter((t: any) => t.status === 'APPROVED' || t.status === 'ACTIVE'));
        }
      }
    });

    this.showSendMessageModal.set(true);
  }

  openBulkSend() {
    if (this.selectedIds().length === 0) {
      Swal.fire("Error", "Please select one or more contacts to send a message.", 'error');
      return;
    }
    this.isBulkSendMode.set(true);
    this.selectedContactForMessage.set(null);
    this.messageText.set('');
    this.activeSendMode.set('TEXT');
    this.selectedMessageTemplate.set(null);
    this.messageTemplateParams.set({});

    this.api.get<any>('/messagetemplates/list').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.approvedTemplates.set(res.data.filter((t: any) => t.status === 'APPROVED' || t.status === 'ACTIVE'));
        }
      }
    });

    this.showSendMessageModal.set(true);
  }

  closeSendMessage() {
    this.showSendMessageModal.set(false);
    this.selectedContactForMessage.set(null);
    this.isBulkSendMode.set(false);
  }

  closeBulkSummary() {
    this.showBulkSummaryModal.set(false);
    this.bulkSendResults.set([]);
    this.bulkSummaryStats.set(null);
  }

  selectMessageTemplate(tpl: any) {
    this.selectedMessageTemplate.set(tpl);
    if (!tpl) {
      this.messageTemplateParams.set({});
      return;
    }
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

  dispatchSendMessage() {
    if (this.isBulkSendMode()) {
      this.dispatchBulkMessages();
    } else {
      this.dispatchSingleMessage();
    }
  }

  async dispatchBulkMessages() {
    const selectedIds = this.selectedIds();
    if (selectedIds.length === 0) {
      Swal.fire("Error", "No contacts selected", "error");
      return;
    }

    if (this.activeSendMode() === 'TEXT' && !this.messageText().trim()) {
      Swal.fire("Error", "Please enter message text", "error");
      return;
    }

    if (this.activeSendMode() === 'TEMPLATE' && !this.selectedMessageTemplate()) {
      Swal.fire("Error", "Please select a message template", "error");
      return;
    }

    this.isSendingBulk.set(true);
    this.bulkProgress.set(0);
    this.bulkSendResults.set([]);
    this.bulkSummaryStats.set(null);

    const contactsList = this.contactService.contacts();
    const selectedContacts = contactsList.filter(c => c.id !== undefined && selectedIds.includes(c.id));
    const total = selectedContacts.length;

    let success = 0;
    let failed = 0;
    const results: any[] = [];

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < total; i++) {
      const contact = selectedContacts[i];
      const phone = contact.phone;
      const name = contact.name || "Customer";

      try {
        if (this.activeSendMode() === 'TEXT') {
          await firstValueFrom(this.api.post('/messages/send-outbound', {
            contactId: contact.id,
            phone: phone,
            textContent: this.messageText()
          }));
        } else {
          // Meta compliance & personalization: automatically replace variable 1 (typically name) with the contact's actual name.
          const params = { ...this.messageTemplateParams() };
          if (params['1'] !== undefined && (!params['1'] || params['1'].trim() === '')) {
            params['1'] = name;
          }
          if (params['name'] !== undefined && (!params['name'] || params['name'].trim() === '')) {
            params['name'] = name;
          }

          const payload = {
            templateId: this.selectedMessageTemplate().id,
            phone: phone,
            parameters: params
          };
          await firstValueFrom(this.api.post('/campaigns/send-test', payload));
        }

        success++;
        results.push({
          name: name,
          phone: phone,
          status: 'SUCCESS',
          details: 'Sent successfully'
        });
      } catch (err: any) {
        failed++;
        const errMsg = err.error?.error || err.message || 'Meta API error or connection failure';
        results.push({
          name: name,
          phone: phone,
          status: 'FAILED',
          details: errMsg
        });
      }

      this.bulkProgress.set(Math.round(((i + 1) / total) * 100));
      // Meta compliance: Introduce 500ms delay between sending to avoid spike/rate-limits
      await delay(500);
    }

    this.isSendingBulk.set(false);
    this.closeSendMessage();
    this.selectedIds.set([]); // clear selection after sending
    this.bulkSendResults.set(results);
    this.bulkSummaryStats.set({ total, success, failed });
    this.showBulkSummaryModal.set(true);

    if (failed === 0) {
      Swal.fire("Bulk Send Complete", `All ${success} messages sent successfully.`, 'success');
    } else {
      Swal.fire("Bulk Send Complete", `${success} sent successfully, ${failed} failed. See details below.`, 'warning');
    }
  }

  dispatchSingleMessage() {
    const contact = this.selectedContactForMessage();
    if (!contact) return;

    if (this.activeSendMode() === 'TEXT') {
      if (!this.messageText()) {
        Swal.fire("Error", "Please enter message text", 'error');
        return;
      }
      this.api.post('/messages/send-outbound', {
        contactId: contact.id,
        phone: contact.phone,
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
