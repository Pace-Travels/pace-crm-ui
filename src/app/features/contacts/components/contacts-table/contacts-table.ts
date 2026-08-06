import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService, Contact } from '../../services/contact.service';
import { ApiService } from '../../../../shared/services/api.service';

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
  showCreateGroupModal = signal(false);
  showSendMessageModal = signal(false);

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
  showActionsDropdown = signal(false);

  // Group Form
  groupName = signal('');
  groupDescription = signal('');

  // Form
  contactForm: FormGroup;

  // Selection
  selectedIds = signal<number[]>([]);
  isBroadcastActive = computed(() => this.selectedIds().length > 0);
  isAllSelected = computed(() => {
    const contacts = this.contactService.filteredContacts();
    return contacts.length > 0 && this.selectedIds().length === contacts.length;
  });

  constructor(
    public contactService: ContactService,
    private fb: FormBuilder,
    private api: ApiService
  ) {
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
      const allIds = this.contactService.filteredContacts().map(c => c.id!).filter(id => id !== undefined);
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
    this.contactForm.reset({ source: 'ORGANIC' });
    this.showAddContactModal.set(true);
  }

  closeAddContact() {
    this.showAddContactModal.set(false);
  }

  onAddContactSubmit() {
    if (this.contactForm.valid) {
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
        tags: val.tags ? [val.tags] : [],
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
      this.contactService.importCsv(file, this.contactService.activeType()).subscribe({
        next: (res: any) => {
          this.closeImportModal();
          this.previewContacts.set(res.data || []);
          this.isPreviewMode.set(true);
        },
        error: (err: any) => {
          alert("Error importing file: " + (err.error?.error || err.message));
        }
      });
    }
  }

  approveImport() {
    const validContacts = this.previewContacts().filter(c => c.isValid);
    if (validContacts.length === 0) {
      alert("No valid contacts to import.");
      return;
    }
    this.contactService.bulkSaveContacts(validContacts).subscribe({
      next: () => {
        this.isPreviewMode.set(false);
        this.previewContacts.set([]);
        this.contactService.fetchContacts();
        alert("Contacts imported successfully!");
      },
      error: (err: any) => {
        alert("Failed to save contacts: " + err.message);
      }
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
    this.groupName.set('');
    this.groupDescription.set('');
    this.showCreateGroupModal.set(true);
  }

  closeCreateGroup() {
    this.showCreateGroupModal.set(false);
  }

  submitCreateGroup() {
    if (!this.groupName()) {
      alert("Group name is required");
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
        alert("Group created successfully!");
      },
      error: (err: any) => {
        alert("Failed to create group: " + err.message);
      }
    });
  }

  // Single message dispatch methods
  openSendMessage(contact: any, event: Event) {
    event.stopPropagation();
    this.selectedContactForMessage.set(contact);
    this.activeSendMode.set('TEXT');
    this.messageText.set('');
    this.selectedMessageTemplate.set(null);
    this.messageTemplateParams.set({});
    
    // Fetch approved templates for selection
    this.api.get('/messagetemplates/list').subscribe((res: any) => {
      const all = res.data || [];
      this.approvedTemplates.set(all.filter((t: any) => t.status === 'APPROVED'));
    });

    this.showSendMessageModal.set(true);
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

  getMsgTemplateParamKeys() {
    return Object.keys(this.messageTemplateParams());
  }

  onMsgParamChange(key: string, event: any) {
    const current = { ...this.messageTemplateParams() };
    current[key] = event.target.value;
    this.messageTemplateParams.set(current);
  }

  getMsgPreviewText() {
    let body = this.selectedMessageTemplate()?.templateBody || '';
    const params = this.messageTemplateParams();
    Object.keys(params).forEach((key) => {
      const val = params[key] || `[Variable ${key}]`;
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    });
    return body;
  }

  dispatchSingleMessage() {
    const contact = this.selectedContactForMessage();
    if (!contact) return;

    if (this.activeSendMode() === 'TEXT') {
      if (!this.messageText().trim()) {
        alert("Please enter message text.");
        return;
      }
      const payload = {
        contactId: contact.id,
        textContent: this.messageText().trim()
      };
      this.api.post('/messages/send', payload).subscribe({
        next: () => {
          this.closeSendMessage();
          alert("Free-text outbound message sent and logged successfully!");
        },
        error: (err: any) => {
          alert("Failed to send text message: " + (err.error?.error || err.message));
        }
      });
    } else {
      if (!this.selectedMessageTemplate()) {
        alert("Please select a template.");
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
          alert("Approved template message sent and logged successfully!");
        },
        error: (err: any) => {
          alert("Failed to send template message: " + (err.error?.error || err.message));
        }
      });
    }
  }
}
