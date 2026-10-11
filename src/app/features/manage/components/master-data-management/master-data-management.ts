import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

export interface MasterLookupItem {
  id: number;
  category: 'USER_TYPE' | 'LEAD_STAGE' | 'SOURCE' | 'CONTACT_TAG' | 'BUSINESS_CATEGORY';
  code: string;
  label: string;
  color?: string;
  displayOrder: number;
  isActive: boolean;
}

@Component({
  selector: 'app-master-data-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-data-management.html',
  styleUrl: './master-data-management.scss'
})
export class MasterDataManagementComponent implements OnInit {
  activeTab = signal<'USER_TYPE' | 'LEAD_STAGE' | 'SOURCE' | 'CONTACT_TAG' | 'BUSINESS_CATEGORY'>('USER_TYPE');

  // Master Lookup Data Lists
  userTypes = signal<MasterLookupItem[]>([
    { id: 1, category: 'USER_TYPE', code: 'LEAD', label: 'Lead / Inquiry', color: '#6366f1', displayOrder: 1, isActive: true },
    { id: 2, category: 'USER_TYPE', code: 'CUSTOMER', label: 'Active Customer', color: '#10b981', displayOrder: 2, isActive: true },
    { id: 3, category: 'USER_TYPE', code: 'PARTNER', label: 'Partner / B2B Agency', color: '#f59e0b', displayOrder: 3, isActive: true },
    { id: 4, category: 'USER_TYPE', code: 'B2B', label: 'B2B Travel Agent', color: '#8b5cf6', displayOrder: 4, isActive: true },
    { id: 5, category: 'USER_TYPE', code: 'B2C', label: 'B2C Traveler', color: '#ec4899', displayOrder: 5, isActive: true }
  ]);

  leadStages = signal<MasterLookupItem[]>([
    { id: 10, category: 'LEAD_STAGE', code: 'NEW', label: 'New Lead', color: '#3b82f6', displayOrder: 1, isActive: true },
    { id: 11, category: 'LEAD_STAGE', code: 'CONTACTED', label: 'Contacted', color: '#0284c7', displayOrder: 2, isActive: true },
    { id: 12, category: 'LEAD_STAGE', code: 'QUALIFIED', label: 'Qualified Interest', color: '#8b5cf6', displayOrder: 3, isActive: true },
    { id: 13, category: 'LEAD_STAGE', code: 'PROPOSAL', label: 'Quote / Proposal Sent', color: '#f59e0b', displayOrder: 4, isActive: true },
    { id: 14, category: 'LEAD_STAGE', code: 'WON', label: 'Closed - Won', color: '#10b981', displayOrder: 5, isActive: true },
    { id: 15, category: 'LEAD_STAGE', code: 'LOST', label: 'Closed - Lost', color: '#ef4444', displayOrder: 6, isActive: true }
  ]);

  sources = signal<MasterLookupItem[]>([
    { id: 20, category: 'SOURCE', code: 'ORGANIC', label: 'Organic Search / Website', color: '#10b981', displayOrder: 1, isActive: true },
    { id: 21, category: 'SOURCE', code: 'META_ADS', label: 'Meta Click-to-WhatsApp Ads', color: '#2563eb', displayOrder: 2, isActive: true },
    { id: 22, category: 'SOURCE', code: 'NETWORK', label: 'BNI / Partner Network', color: '#f59e0b', displayOrder: 3, isActive: true },
    { id: 23, category: 'SOURCE', code: 'IMPORT', label: 'CSV / Excel Import', color: '#64748b', displayOrder: 4, isActive: true }
  ]);

  tags = signal<MasterLookupItem[]>([
    { id: 30, category: 'CONTACT_TAG', code: 'HIGH_VALUE', label: 'VIP High Value', color: '#ec4899', displayOrder: 1, isActive: true },
    { id: 31, category: 'CONTACT_TAG', code: 'HOT_LEAD', label: 'Hot Follow-up', color: '#ef4444', displayOrder: 2, isActive: true },
    { id: 32, category: 'CONTACT_TAG', code: 'HOLIDAY_PACKAGE', label: 'International Package', color: '#06b6d4', displayOrder: 3, isActive: true }
  ]);

  // Form Modal States
  showAddModal = signal<boolean>(false);
  newItemLabel = signal<string>('');
  newItemCode = signal<string>('');
  newItemColor = signal<string>('#6366f1');

  ngOnInit(): void {
    // In production, load master dropdown options via API endpoint
  }

  getActiveList(): MasterLookupItem[] {
    switch (this.activeTab()) {
      case 'USER_TYPE': return this.userTypes();
      case 'LEAD_STAGE': return this.leadStages();
      case 'SOURCE': return this.sources();
      case 'CONTACT_TAG': return this.tags();
      default: return [];
    }
  }

  openAddModal(): void {
    this.newItemLabel.set('');
    this.newItemCode.set('');
    this.newItemColor.set('#6366f1');
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  saveMasterItem(): void {
    if (!this.newItemLabel().trim()) return;

    const code = this.newItemCode().trim() || this.newItemLabel().trim().toUpperCase().replace(/\s+/g, '_');
    const newItem: MasterLookupItem = {
      id: Date.now(),
      category: this.activeTab(),
      code,
      label: this.newItemLabel().trim(),
      color: this.newItemColor(),
      displayOrder: this.getActiveList().length + 1,
      isActive: true
    };

    if (this.activeTab() === 'USER_TYPE') {
      this.userTypes.set([...this.userTypes(), newItem]);
    } else if (this.activeTab() === 'LEAD_STAGE') {
      this.leadStages.set([...this.leadStages(), newItem]);
    } else if (this.activeTab() === 'SOURCE') {
      this.sources.set([...this.sources(), newItem]);
    } else if (this.activeTab() === 'CONTACT_TAG') {
      this.tags.set([...this.tags(), newItem]);
    }

    Swal.fire('Saved!', `Master lookup ${newItem.label} added successfully.`, 'success');
    this.closeAddModal();
  }

  toggleStatus(item: MasterLookupItem): void {
    item.isActive = !item.isActive;
    Swal.fire('Status Updated', `${item.label} is now ${item.isActive ? 'Active' : 'Inactive'}.`, 'info');
  }
}
