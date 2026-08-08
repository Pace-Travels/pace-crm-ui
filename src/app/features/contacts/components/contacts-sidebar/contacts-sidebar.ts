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
}
