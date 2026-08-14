import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contacts-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './contacts-sidebar.html',
  styleUrl: './contacts-sidebar.scss',
})
export class ContactsSidebar implements OnInit {
  showGroupModal = signal(false);
  groupForm: FormGroup;

  constructor(
    public contactService: ContactService,
    private fb: FormBuilder
  ) {
    this.groupForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      contactType: ['B2C', Validators.required]
    });
  }

  ngOnInit() {
    this.contactService.fetchGroups();
  }

  selectType(type: 'B2B' | 'B2C') {
    this.contactService.activeType.set(type);
    this.groupForm.patchValue({ contactType: type });
  }

  openCreateGroupModal() {
    this.groupForm.patchValue({ contactType: this.contactService.activeType() });
    this.showGroupModal.set(true);
  }

  closeCreateGroupModal() {
    this.showGroupModal.set(false);
  }

  submitCreateGroup() {
    if (this.groupForm.invalid) {
      Swal.fire('Required', 'Please enter a group name.', 'warning');
      return;
    }

    const { name, description, contactType } = this.groupForm.value;
    this.contactService.createGroup(name, description || '', contactType, []).subscribe({
      next: () => {
        this.groupForm.reset({ contactType: this.contactService.activeType() });
        this.closeCreateGroupModal();
        this.contactService.fetchGroups();
        Swal.fire('Group Created!', `Contact Group "${name}" created for ${contactType} contacts.`, 'success');
      },
      error: (err) => {
        Swal.fire('Error', err.error?.error || 'Failed to create group', 'error');
      }
    });
  }

  deleteGroup(id: number | undefined, event: Event) {
    event.stopPropagation();
    if (id === undefined) return;
    Swal.fire({
      title: 'Delete Group?',
      text: 'Are you sure you want to delete this group?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    }).then((result) => {
      if (result.isConfirmed) {
        this.contactService.deleteGroup(id).subscribe({
          next: () => {
            this.contactService.fetchGroups();
            Swal.fire('Deleted!', 'Group has been removed.', 'success');
          }
        });
      }
    });
  }

  showAddMembersModal = signal(false);
  groupMembers = signal<any[]>([]);
  selectedContactIdsForGroup: number[] = [];

  onGroupClick(group: any) {
    this.contactService.selectedGroup.set(group);
    
    // Check if contacts of that category exist
    const contactsOfType = this.contactService.contacts().filter(c => c.type === group.contactType);
    if (contactsOfType.length === 0) {
      Swal.fire({
        title: `No ${group.contactType} Contacts`,
        text: `There are no ${group.contactType} contacts in your database. Please add or import contacts first.`,
        icon: 'info',
        confirmButtonColor: '#0b494d'
      });
      return;
    }

    // Fetch existing group members
    this.contactService.getGroupMembers(group.id).subscribe({
      next: (res: any) => {
        this.groupMembers.set(res.data || []);
        this.selectedContactIdsForGroup = [];
        this.showAddMembersModal.set(true);
      },
      error: () => {
        this.groupMembers.set([]);
        this.selectedContactIdsForGroup = [];
        this.showAddMembersModal.set(true);
      }
    });
  }

  getAvailableContactsForGroup() {
    const group = this.contactService.selectedGroup();
    if (!group) return [];
    
    // Filter contacts of the same category
    const contactsOfType = this.contactService.contacts().filter(c => c.type === group.contactType);
    
    // Filter out contacts who are already group members
    const memberContactIds = new Set(this.groupMembers().map(m => m.contactId));
    return contactsOfType.filter(c => c.id !== undefined && !memberContactIds.has(c.id));
  }

  isContactSelected(id: number | undefined) {
    return id !== undefined && this.selectedContactIdsForGroup.includes(id);
  }

  toggleContactSelection(id: number | undefined, event: any) {
    if (id === undefined) return;
    if (event.target.checked) {
      this.selectedContactIdsForGroup.push(id);
    } else {
      this.selectedContactIdsForGroup = this.selectedContactIdsForGroup.filter(x => x !== id);
    }
  }

  closeAddMembersModal() {
    this.showAddMembersModal.set(false);
    this.contactService.selectedGroup.set(null);
  }

  submitAddMembers() {
    const group = this.contactService.selectedGroup();
    if (!group || this.selectedContactIdsForGroup.length === 0) return;

    this.contactService.addContactsToGroup(group.id!, this.selectedContactIdsForGroup).subscribe({
      next: (res: any) => {
        Swal.fire('Contacts Added!', `${res.count} contacts added to group "${group.name}".`, 'success');
        this.closeAddMembersModal();
      },
      error: (err: any) => {
        Swal.fire('Error', err.error?.error || 'Failed to add contacts', 'error');
      }
    });
  }
}
