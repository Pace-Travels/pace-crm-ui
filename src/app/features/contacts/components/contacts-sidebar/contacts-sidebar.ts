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

  availableIcons = [
    { class: 'fa-users', label: 'People' },
    { class: 'fa-building', label: 'Company' },
    { class: 'fa-star', label: 'Star' },
    { class: 'fa-heart', label: 'Favorite' },
    { class: 'fa-tag', label: 'Tag' },
    { class: 'fa-award', label: 'VIP' },
    { class: 'fa-crown', label: 'Premium' },
    { class: 'fa-rocket', label: 'Active' },
    { class: 'fa-briefcase', label: 'Work' },
    { class: 'fa-compass', label: 'Explorer' },
    { class: 'fa-plane', label: 'Traveler' },
    { class: 'fa-globe', label: 'Global' },
    { class: 'fa-layer-group', label: 'Default' }
  ];

  constructor(
    public contactService: ContactService,
    private fb: FormBuilder
  ) {
    this.groupForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      contactType: ['B2C', Validators.required],
      icon: ['fa-layer-group', Validators.required]
    });
  }

  ngOnInit() {
    this.contactService.fetchGroups();
  }

  selectType(type: 'B2B' | 'B2C') {
    this.contactService.selectedGroup.set(null);
    this.contactService.selectedGroupContactIds.set([]);
    this.contactService.activeType.set(type);
    this.groupForm.patchValue({ contactType: type });
  }

  openCreateGroupModal() {
    this.groupForm.patchValue({ contactType: this.contactService.activeType(), icon: 'fa-layer-group' });
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

    const { name, description, contactType, icon } = this.groupForm.value;
    this.contactService.createGroup(name, description || '', contactType, [], icon).subscribe({
      next: () => {
        this.groupForm.reset({ contactType: this.contactService.activeType(), icon: 'fa-layer-group' });
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
            if (this.contactService.selectedGroup()?.id === id) {
              this.contactService.selectedGroup.set(null);
              this.contactService.selectedGroupContactIds.set([]);
            }
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
    
    // Fetch group members to filter the main contacts table
    this.contactService.getGroupMembers(group.id).subscribe({
      next: (res: any) => {
        const memberIds = (res.data || []).map((m: any) => m.contactId);
        this.contactService.selectedGroupContactIds.set(memberIds);
      },
      error: () => {
        this.contactService.selectedGroupContactIds.set([]);
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
