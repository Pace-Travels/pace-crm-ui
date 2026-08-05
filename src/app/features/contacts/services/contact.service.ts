import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Contact {
  id?: number;
  name: string;
  userName?: string;
  phone: string;
  tags?: string[];
  source?: string;
  leadStage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  contacts = signal<Contact[]>([]);
  isLoading = signal<boolean>(false);

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

  // importCsv(file: File) {
  //   const formData = new FormData();
  //   formData.append('file', file);
  //   // Overriding the default content-type header because formData requires browser to set multipart/form-data boundary
  //   return this.api.post('/whatsappcontacts/import', formData, {
  //     headers: {
  //       // null or undefined trick to let browser auto-set the correct header
  //     }
  //   });
  // }

  importCsv(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.api.post('/whatsappcontacts/import', formData);
  }
}
