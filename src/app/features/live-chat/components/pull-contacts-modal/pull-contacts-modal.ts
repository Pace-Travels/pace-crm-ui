import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';
import { ContactService } from '../../../contacts/services/contact.service';

interface SourceProject { id: number; name: string; iconUrl?: string; }
interface CrossContact {
  id: number;
  projectId: number;
  type?: string;
  name: string;
  agencyName?: string;
  phone: string;
  email?: string;
  location?: string;
  alreadyInProject: boolean;
}

@Component({
  selector: 'app-pull-contacts-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pull-contacts-modal.html',
  styleUrl: './pull-contacts-modal.scss',
})
export class PullContactsModal implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<{ created: number; skipped: number }>();

  private api = inject(ApiService);
  private contactService = inject(ContactService);

  projects = signal<SourceProject[]>([]);
  contacts = signal<CrossContact[]>([]);
  activeProjectId = signal<number | 'ALL'>('ALL');
  search = signal('');
  hideExisting = signal(true);
  selected = signal<Set<number>>(new Set());
  groupName = signal('');
  isLoading = signal(false);
  isImporting = signal(false);
  result = signal<{ created: number; skipped: number } | null>(null);
  error = signal<string | null>(null);

  projectName = computed(() => new Map(this.projects().map(p => [p.id, p.name])));

  projectCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const c of this.contacts()) counts.set(c.projectId, (counts.get(c.projectId) || 0) + 1);
    return counts;
  });

  visible = computed(() => {
    const pid = this.activeProjectId();
    const q = this.search().toLowerCase().trim();
    return this.contacts().filter(c => {
      if (pid !== 'ALL' && c.projectId !== pid) return false;
      if (this.hideExisting() && c.alreadyInProject) return false;
      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q)
        || (c.phone || '').includes(q)
        || (c.email || '').toLowerCase().includes(q);
    });
  });

  selectable = computed(() => this.visible().filter(c => !c.alreadyInProject));
  allVisibleSelected = computed(() => {
    const s = this.selected();
    const list = this.selectable();
    return list.length > 0 && list.every(c => s.has(c.id));
  });

  ngOnInit() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.error.set(null);
    this.api.get<any>('/whatsappcontacts/cross-project?limit=2000').subscribe({
      next: (res: any) => {
        const payload = res?.data?.data ? res.data : res;
        this.projects.set(payload.projects || []);
        this.contacts.set(payload.data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error || err?.error?.message || 'Failed to load contacts from other projects.');
        this.isLoading.set(false);
      }
    });
  }

  toggle(c: CrossContact) {
    if (c.alreadyInProject) return;
    const next = new Set(this.selected());
    next.has(c.id) ? next.delete(c.id) : next.add(c.id);
    this.selected.set(next);
  }

  toggleAll() {
    const next = new Set(this.selected());
    const list = this.selectable();
    if (this.allVisibleSelected()) list.forEach(c => next.delete(c.id));
    else list.forEach(c => next.add(c.id));
    this.selected.set(next);
  }

  initials(name: string) {
    return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  pull() {
    const ids = Array.from(this.selected());
    if (!ids.length || this.isImporting()) return;
    this.isImporting.set(true);
    this.error.set(null);
    this.api.post<any>('/whatsappcontacts/pull-from-projects', {
      contactIds: ids,
      groupName: this.groupName().trim() || undefined,
    }).subscribe({
      next: (res: any) => {
        const payload = res?.data?.created !== undefined ? res.data : res;
        const summary = { created: payload.created || 0, skipped: payload.skipped || 0 };
        this.result.set(summary);
        this.isImporting.set(false);
        // Mark pulled contacts as present and clear selection
        const pulled = new Set(ids);
        this.contacts.update(list => list.map(c => pulled.has(c.id) ? { ...c, alreadyInProject: true } : c));
        this.selected.set(new Set());
        this.contactService.fetchContacts();
        if (this.groupName().trim()) this.contactService.fetchGroups();
        this.imported.emit(summary);
      },
      error: (err) => {
        this.error.set(err?.error?.error || err?.error?.message || 'Failed to pull contacts.');
        this.isImporting.set(false);
      }
    });
  }
}
