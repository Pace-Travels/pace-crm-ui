import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface RoleItem {
  id: number;
  name: string;
  description?: string;
  roleType: 'SYSTEM' | 'CUSTOM';
  permissions: string[];
  isActive: boolean;
}

@Component({
  selector: 'app-role-permissions-crud-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './role-permissions-crud-view.html',
  styleUrl: './role-permissions-crud-view.scss'
})
export class RolePermissionsCrudView implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  availablePermissions = [
    { code: 'READ_CONTACTS', label: 'View Contacts Directory' },
    { code: 'WRITE_CONTACTS', label: 'Create & Edit Contacts' },
    { code: 'DELETE_CONTACTS', label: 'Delete Contacts' },
    { code: 'BROADCAST_MESSAGES', label: 'Send Mass Broadcast Campaigns' },
    { code: 'MANAGE_TEMPLATES', label: 'Create & Submit Message Templates' },
    { code: 'MANAGE_TEAM', label: 'Provision Team Seats & Assign Roles' },
    { code: 'MANAGE_BILLING', label: 'Manage Subscription & Invoices' }
  ];

  roles = signal<RoleItem[]>([
    { id: 1, name: 'Agency Super Admin', description: 'Full administrative access to agency workspace & team seats.', roleType: 'SYSTEM', permissions: ['READ_CONTACTS', 'WRITE_CONTACTS', 'DELETE_CONTACTS', 'BROADCAST_MESSAGES', 'MANAGE_TEMPLATES', 'MANAGE_TEAM', 'MANAGE_BILLING'], isActive: true },
    { id: 2, name: 'Sales Manager', description: 'Can manage assigned team seats, campaigns and contacts.', roleType: 'CUSTOM', permissions: ['READ_CONTACTS', 'WRITE_CONTACTS', 'BROADCAST_MESSAGES', 'MANAGE_TEMPLATES'], isActive: true },
    { id: 3, name: 'Support Agent', description: 'Can reply to live chats and view contacts.', roleType: 'CUSTOM', permissions: ['READ_CONTACTS', 'WRITE_CONTACTS'], isActive: true }
  ]);

  searchQuery = signal<string>('');
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId = signal<number | null>(null);

  selectedPermissionCodes = signal<string[]>([]);
  roleForm: FormGroup;

  filteredRoles = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.roles();
    return this.roles().filter(r => r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)));
  });

  constructor() {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit(): void {}

  openModal(item?: RoleItem): void {
    if (item) {
      this.isEditing.set(true);
      this.editingId.set(item.id);
      this.roleForm.patchValue(item);
      this.selectedPermissionCodes.set([...item.permissions]);
    } else {
      this.isEditing.set(false);
      this.editingId.set(null);
      this.roleForm.reset();
      this.selectedPermissionCodes.set(['READ_CONTACTS', 'WRITE_CONTACTS']);
    }
    this.showModal.set(true);
  }

  togglePermission(code: string): void {
    const current = this.selectedPermissionCodes();
    if (current.includes(code)) {
      this.selectedPermissionCodes.set(current.filter(c => c !== code));
    } else {
      this.selectedPermissionCodes.set([...current, code]);
    }
  }

  isPermissionSelected(code: string): boolean {
    return this.selectedPermissionCodes().includes(code);
  }

  saveRole(): void {
    if (this.roleForm.invalid) return;

    const val = this.roleForm.value;
    const permissions = this.selectedPermissionCodes();

    if (this.isEditing() && this.editingId()) {
      this.roles.set(this.roles().map(r => r.id === this.editingId() ? { ...r, ...val, permissions } : r));
      Swal.fire('Updated!', 'Role and permissions updated successfully.', 'success');
    } else {
      const newRole: RoleItem = { id: Date.now(), ...val, roleType: 'CUSTOM', permissions, isActive: true };
      this.roles.set([newRole, ...this.roles()]);
      Swal.fire('Created!', 'New custom role created.', 'success');
    }
    this.showModal.set(false);
  }
}
