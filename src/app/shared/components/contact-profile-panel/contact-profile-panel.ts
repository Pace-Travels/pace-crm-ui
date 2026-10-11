import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../../features/contacts/services/contact.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contact-profile-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-profile-panel.html',
  styleUrl: './contact-profile-panel.scss',
})
export class ContactProfilePanel implements OnChanges {
  @Input() contact: any = null;
  @Input() isOpen = false;
  @Output() closePanel = new EventEmitter<void>();

  // Accordion state
  expandedSection = signal<string | null>('payments');

  // Loading & detail signals
  isLoading = signal<boolean>(false);
  details = signal<any>(null);

  // Form inputs
  newNoteText = signal<string>('');
  newTagText = signal<string>('');
  newAttrKey = signal<string>('');
  newAttrVal = signal<string>('');

  // Lead stages definition
  leadStages = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];

  constructor(private contactService: ContactService) {}

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['contact'] || changes['isOpen']) && this.isOpen && this.contact?.id) {
      this.fetchContactDetails();
    }
  }

  fetchContactDetails() {
    if (!this.contact?.id) return;
    this.isLoading.set(true);
    this.contactService.getContactDetails(this.contact.id).subscribe({
      next: (res: any) => {
        this.details.set(res || null);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleSection(section: string) {
    if (this.expandedSection() === section) {
      this.expandedSection.set(null);
    } else {
      this.expandedSection.set(section);
    }
  }

  getInitials(name: string): string {
    if (!name || name === 'UNKNOWN') return 'U';
    return name.charAt(0).toUpperCase();
  }

  getParsedTags(): string[] {
    const raw = this.details()?.contact?.tags || this.contact?.tags || [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); }
      catch (e) { return [raw]; }
    }
    return [];
  }

  toggleOptIn() {
    if (!this.contact?.id) return;
    const currentOpt = this.details()?.contact?.isOptedIn !== false;
    const newOpt = !currentOpt;
    this.contactService.updateContact(this.contact.id, { isActive: newOpt }).subscribe({
      next: () => {
        const d = { ...this.details() };
        if (d.contact) d.contact.isOptedIn = newOpt;
        this.details.set(d);
        Swal.fire('Updated', `Contact opt-in status set to ${newOpt ? 'Enabled' : 'Disabled'}.`, 'success');
      }
    });
  }

  updateLeadStage(stage: string) {
    if (!this.contact?.id) return;
    this.contactService.updateContact(this.contact.id, { leadStage: stage }).subscribe({
      next: () => {
        const d = { ...this.details() };
        if (d.contact) d.contact.leadStage = stage;
        this.details.set(d);
        Swal.fire('Lead Stage Updated', `Stage changed to "${stage}".`, 'success');
      },
      error: (err) => {
        Swal.fire('Error', 'Failed to update stage: ' + err.message, 'error');
      }
    });
  }

  addTag() {
    const tag = this.newTagText().trim();
    if (!tag || !this.contact?.id) return;

    const currentTags = this.getParsedTags();
    if (currentTags.includes(tag)) {
      Swal.fire('Duplicate Tag', 'Tag already exists on this contact.', 'info');
      return;
    }

    const updatedTags = [...currentTags, tag];
    this.contactService.updateContact(this.contact.id, { tags: updatedTags }).subscribe({
      next: () => {
        const d = { ...this.details() };
        if (d.contact) d.contact.tags = updatedTags;
        this.details.set(d);
        this.newTagText.set('');
      }
    });
  }

  removeTag(tagToRemove: string) {
    if (!this.contact?.id) return;
    const updatedTags = this.getParsedTags().filter(t => t !== tagToRemove);
    this.contactService.updateContact(this.contact.id, { tags: updatedTags }).subscribe({
      next: () => {
        const d = { ...this.details() };
        if (d.contact) d.contact.tags = updatedTags;
        this.details.set(d);
      }
    });
  }

  addNote() {
    const text = this.newNoteText().trim();
    if (!text || !this.contact?.id) return;

    const userStr = localStorage.getItem('user');
    let author = 'Shadab Khatib';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.name || u.username) author = u.name || u.username;
      } catch (e) {}
    }

    this.contactService.addContactNote(this.contact.id, text, author).subscribe({
      next: (res: any) => {
        const d = { ...this.details() };
        d.notes = [res.note, ...(d.notes || [])];
        this.details.set(d);
        this.newNoteText.set('');
        Swal.fire('Note Added', 'Internal note added to contact record.', 'success');
      },
      error: (err) => {
        Swal.fire('Error', 'Failed to add note: ' + err.message, 'error');
      }
    });
  }

  addAttribute() {
    const key = this.newAttrKey().trim();
    const val = this.newAttrVal().trim();
    if (!key || !val) return;

    const d = { ...this.details() };
    d.attributes = [...(d.attributes || []), { key, value: val }];
    this.details.set(d);
    this.newAttrKey.set('');
    this.newAttrVal.set('');
  }

  copyPaymentLink(payment: any) {
    const link = `https://pay.quotedesks.com/inv/${payment.transactionId || payment.id || '101'}`;
    navigator.clipboard.writeText(link);
    Swal.fire('Link Copied', `Payment link copied to clipboard: ${link}`, 'success');
  }
}
