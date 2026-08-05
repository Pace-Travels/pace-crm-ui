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
  tags?: string[];
  source?: string;
  leadStage?: string;
}

export interface ContactGroup {
  id?: number;
  name: string;
  description?: string;
  contactType: 'B2B' | 'B2C';
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  contacts = signal<Contact[]>([]);
  groups = signal<ContactGroup[]>([]);
  activeType = signal<'B2B' | 'B2C'>('B2C');
  isLoading = signal<boolean>(false);

  filteredContacts = computed(() => {
    return this.contacts().filter(c => c.type === this.activeType());
  });

  constructor(private api: ApiService) { }

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

  importCsv(file: File, type: 'B2B' | 'B2C'): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
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

  createGroup(name: string, description: string, contactType: 'B2B' | 'B2C', contactIds: number[]) {
    return this.api.post('/whatsappcontacts/groups', { name, description, contactType, contactIds });
  }

  deleteGroup(id: number) {
    return this.api.delete(`/whatsappcontacts/groups/${id}`);
  }
}
