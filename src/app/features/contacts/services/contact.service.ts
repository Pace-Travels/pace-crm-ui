import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

export interface Contact {
  id?: number;
  type?: 'B2B' | 'B2C';
  agencyName?: string;
  name: string;
  location?: string;
  phone: string;
  phone2?: string;
  email?: string;
  email2?: string;
  userName?: string;
  tags?: string[] | string;
  owners?: string[];
  source?: string;
  leadStage?: string;
  country?: string;
  countryCode?: string;
  metaRate?: number;
  readinessStatus?: string;
  readinessReason?: string;
}

export interface ContactGroup {
  id?: number;
  name: string;
  description?: string;
  contactType: 'B2B' | 'B2C';
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  contacts = signal<Contact[]>([]);
  groups = signal<ContactGroup[]>([]);
  selectedGroup = signal<ContactGroup | null>(null);
  selectedGroupContactIds = signal<number[]>([]);
  activeType = signal<'B2B' | 'B2C'>('B2C');
  isLoading = signal<boolean>(false);

  filteredContacts = computed(() => {
    const targetType = this.activeType();
    const group = this.selectedGroup();
    const memberIds = this.selectedGroupContactIds();

    let list = this.contacts().filter(c => {
      const cType = (c.type || 'B2C').toUpperCase();
      return cType === targetType;
    });

    if (group) {
      list = list.filter(c => c.id !== undefined && memberIds.includes(c.id));
    }

    return list;
  });

  constructor(private api: ApiService) { }

  getContactOwners(contact: Contact): string[] {
    let rawTags: any = contact.tags || [];
    if (typeof rawTags === 'string') {
      try { rawTags = JSON.parse(rawTags); }
      catch (e) { rawTags = [rawTags]; }
    }
    if (!Array.isArray(rawTags)) rawTags = [];

    const owners = rawTags
      .filter((t: string) => typeof t === 'string' && (t.startsWith('Agent:') || t.startsWith('Owner:')))
      .map((t: string) => t.replace(/^(Agent:|Owner:)\s*/i, '').trim());

    if (owners.length === 0) {
      if (contact.userName) return [contact.userName];
      return ['Default Agent'];
    }
    return Array.from(new Set(owners));
  }

  fetchContacts() {
    this.isLoading.set(true);
    this.api.get('/whatsappcontacts/list').subscribe({
      next: (res: any) => {
        this.contacts.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  addContact(contact: Partial<Contact>) {
    return this.api.post('/whatsappcontacts/add', contact);
  }

  updateContact(id: number, contact: Partial<Contact>) {
    return this.api.put(`/whatsappcontacts/update/${id}`, contact);
  }

  deleteContact(id: number) {
    return this.api.delete(`/whatsappcontacts/delete/${id}`);
  }

  importCsv(file: File, type: 'B2B' | 'B2C', agentTag?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (agentTag) {
      formData.append('agentTag', agentTag);
    }
    return this.api.post('/whatsappcontacts/import', formData);
  }

  bulkSaveContacts(contacts: Contact[]): Observable<any> {
    return this.api.post('/whatsappcontacts/bulk-save', { contacts });
  }

  fetchGroups() {
    this.api.get('/whatsappcontacts/groups').subscribe({
      next: (res: any) => {
        this.groups.set(res.data || []);
      }
    });
  }

  createGroup(name: string, description: string, contactType: 'B2B' | 'B2C', contactIds: number[], icon?: string) {
    return this.api.post('/whatsappcontacts/groups', { name, description, contactType, contactIds, icon });
  }

  deleteGroup(id: number) {
    return this.api.delete(`/whatsappcontacts/groups/${id}`);
  }

  getGroupMembers(groupId: number): Observable<any> {
    return this.api.get(`/whatsappcontacts/groups/${groupId}/members`);
  }

  addContactsToGroup(groupId: number, contactIds: number[]): Observable<any> {
    return this.api.post(`/whatsappcontacts/groups/${groupId}/contacts`, { contactIds });
  }

  refreshActiveGroupMembers() {
    const group = this.selectedGroup();
    if (!group) return;
    this.getGroupMembers(group.id!).subscribe({
      next: (res: any) => {
        const memberIds = (res.data || []).map((m: any) => m.contactId);
        this.selectedGroupContactIds.set(memberIds);
      },
      error: () => this.selectedGroupContactIds.set([])
    });
  }
}
