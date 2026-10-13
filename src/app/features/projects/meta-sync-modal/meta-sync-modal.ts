import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../services/project.service';

type Severity = 'safe' | 'caution' | 'danger';
type DeleteAction = 'ARCHIVE' | 'REASSIGN' | 'PURGE';

interface MetaRow {
  key: string;
  acc: any;
  kind: 'new' | 'existing';
  local: any | null;
  selected: boolean;
}

interface LocalRow {
  key: string;
  local: any;
  kind: 'orphan' | 'duplicate';
  duplicateOf?: number;
  selected: boolean;
  action: DeleteAction;
  reassignTo: number | null;
  unsubscribe: boolean;
  confirmDigits: string;
}

@Component({
  selector: 'app-meta-sync-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './meta-sync-modal.html',
  styleUrl: './meta-sync-modal.scss',
})
export class MetaSyncModal implements OnInit, OnDestroy {
  @Input({ required: true }) data: any;
  @Output() closed = new EventEmitter<boolean>();

  private projectService = inject(ProjectService);

  step = signal<1 | 2 | 3>(1);
  metaRows = signal<MetaRow[]>([]);
  localRows = signal<LocalRow[]>([]);
  impact = signal<Record<string, any>>({});
  impactLoading = signal(true);
  expanded = signal<string | null>(null);
  tab = signal<'quotedesk' | 'facebook' | 'whatsapp'>('quotedesk');
  isSyncing = signal(false);
  result = signal<any | null>(null);
  syncError = signal<string | null>(null);
  undoLeft = signal(0);
  undone = signal<Set<number>>(new Set());
  private undoTimer: any;

  // -------- derived --------
  toInsert = computed(() => this.metaRows().filter(r => r.selected && r.kind === 'new'));
  toUpdate = computed(() => this.metaRows().filter(r => r.selected && r.kind === 'existing'));
  toDelete = computed(() => this.localRows().filter(r => r.selected));
  deleteSummary = computed(() => {
    const imp = this.impact();
    let conversations = 0, messages = 0, campaigns = 0, open = 0;
    for (const r of this.toDelete()) {
      const q = imp[String(r.local.projectId)]?.quotedesk;
      if (!q) continue;
      conversations += q.conversations.total;
      messages += q.messages.total;
      open += q.conversations.open;
      campaigns += q.activeCampaigns + q.scheduledCampaigns;
    }
    return { accounts: this.toDelete().length, conversations, messages, campaigns, open };
  });
  canApply = computed(() => {
    if (this.isSyncing()) return false;
    if (!this.toInsert().length && !this.toUpdate().length && !this.toDelete().length) return false;
    if (this.step() === 2) {
      return this.toDelete().every(r => {
        if (this.severity(r.local.projectId) === 'danger' && r.confirmDigits !== this.last4(r.local.phoneNumber)) return false;
        if (r.action === 'REASSIGN' && !r.reassignTo) return false;
        return true;
      });
    }
    return true;
  });

  ngOnInit() {
    const d = this.data || {};
    const accounts: any[] = d.accounts || [];
    const locals: any[] = d.localRows || [];
    const diff = d.diff || { new: [], existing: [], orphan: [], duplicate: [] };
    const localByProject = new Map(locals.map(l => [Number(l.projectId), l]));
    const existingByPhoneId = new Map<string, any>((diff.existing || []).map((e: any) => [e.phoneNumberId, localByProject.get(Number(e.projectId))]));

    this.metaRows.set(accounts.map(acc => {
      const local = existingByPhoneId.get(acc.phoneNumberId) || null;
      return { key: 'm:' + acc.phoneNumberId, acc, kind: local ? 'existing' : 'new', local, selected: true };
    }));

    const rows: LocalRow[] = [];
    for (const o of diff.orphan || []) {
      const l = localByProject.get(Number(o.projectId));
      if (l) rows.push(this.makeLocalRow(l, 'orphan'));
    }
    for (const dup of diff.duplicate || []) {
      const l = localByProject.get(Number(dup.projectId));
      if (l) rows.push({ ...this.makeLocalRow(l, 'duplicate'), duplicateOf: dup.duplicateOf });
    }
    // Sandbox rows are listed but locked
    for (const l of locals.filter(x => x.isSandbox)) rows.push(this.makeLocalRow(l, 'orphan'));
    this.localRows.set(rows);

    const ids = locals.map(l => Number(l.projectId)).filter(Boolean);
    if (!ids.length) { this.impactLoading.set(false); return; }
    this.projectService.impactPreview(ids).subscribe({
      next: (res: any) => {
        this.impact.set(res.impact || {});
        this.impactLoading.set(false);
        // Pre-select ONLY safe rows for deletion
        this.localRows.update(list => list.map(r => ({
          ...r,
          selected: !r.local.isSandbox && this.severity(r.local.projectId) === 'safe',
        })));
      },
      error: () => this.impactLoading.set(false),
    });
  }

  ngOnDestroy() { clearInterval(this.undoTimer); }

  private makeLocalRow(local: any, kind: 'orphan' | 'duplicate'): LocalRow {
    return {
      key: 'l:' + local.projectId, local, kind, selected: false,
      action: 'ARCHIVE', reassignTo: null, unsubscribe: false, confirmDigits: '',
    };
  }

  // -------- helpers --------
  imp(projectId: any) { return this.impact()[String(projectId)]; }
  severity(projectId: any): Severity {
    const r = this.localRows().find(x => Number(x.local.projectId) === Number(projectId));
    if (r?.kind === 'duplicate') {
      const i = this.imp(projectId);
      if (!i || (i.quotedesk.conversations.total === 0 && i.quotedesk.messages.total === 0)) return 'safe';
    }
    return (this.imp(projectId)?.severity || 'caution') as Severity;
  }
  last4(phone: string) { return String(phone || '').replace(/\D/g, '').slice(-4); }
  metaFor(local: any) { return (this.data?.accounts || []).find((a: any) => a.wabaId === local.wabaId) || null; }
  reassignTargets(row: LocalRow) {
    const deleting = new Set(this.toDelete().map(r => Number(r.local.projectId)));
    return (this.data?.localRows || []).filter((l: any) =>
      l.wabaId === row.local.wabaId && !deleting.has(Number(l.projectId)) && Number(l.projectId) !== Number(row.local.projectId));
  }
  relative(d: string | null) {
    if (!d) return 'never';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
    if (days <= 0) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    return `${Math.floor(days / 30)} mo ago`;
  }
  taskLabel(t: string) {
    return ({ MANAGE: 'Admin', DEVELOP: 'Developer', MANAGE_TEMPLATES: 'Templates', MANAGE_PHONE: 'Phone', VIEW_COST: 'Billing view', MANAGE_EXTENSIONS: 'Extensions', VIEW_PHONE_ASSETS: 'View', VIEW_TEMPLATES: 'View templates' } as any)[t] || t;
  }
  initials(name: string) { return String(name || '?').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase(); }

  toggleExpand(key: string) {
    this.expanded.set(this.expanded() === key ? null : key);
    this.tab.set('quotedesk');
  }
  toggleMeta(row: MetaRow) { this.metaRows.update(l => l.map(r => r.key === row.key ? { ...r, selected: !r.selected } : r)); }
  toggleLocal(row: LocalRow) {
    if (row.local.isSandbox) return;
    this.localRows.update(l => l.map(r => r.key === row.key ? { ...r, selected: !r.selected } : r));
  }
  patchLocal(row: LocalRow, patch: Partial<LocalRow>) {
    this.localRows.update(l => l.map(r => r.key === row.key ? { ...r, ...patch } : r));
  }

  // -------- flow --------
  next() {
    if (this.step() === 1 && this.toDelete().length) { this.step.set(2); return; }
    this.apply();
  }
  back() { this.step.set(1); }
  cancel() { this.closed.emit(!!this.result()); }

  exportCsv() {
    const header = ['Project ID', 'Project', 'Phone', 'Severity', 'Conversations', 'Open', 'Messages', 'Inbound', 'Outbound', 'Last message', 'Active campaigns', 'Scheduled campaigns', 'Exclusive contacts', 'Action'];
    const lines = this.toDelete().map(r => {
      const q = this.imp(r.local.projectId)?.quotedesk || { conversations: {}, messages: {} };
      return [r.local.projectId, r.local.projectName, r.local.phoneNumber, this.severity(r.local.projectId),
        q.conversations.total ?? '', q.conversations.open ?? '', q.messages.total ?? '', q.messages.inbound ?? '', q.messages.outbound ?? '',
        q.messages.lastAt ?? '', q.activeCampaigns ?? '', q.scheduledCampaigns ?? '', q.contactsOnlyReachableHere ?? '', r.action]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `quick-connect-removal-impact-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  apply() {
    const payload = {
      token: this.data.token,
      tokenExpiresAt: this.data.tokenExpiresAt || null,
      toInsert: this.toInsert().map(r => ({
        phoneNumberId: r.acc.phoneNumberId, wabaId: r.acc.wabaId, phoneNumber: r.acc.phoneNumber, name: r.acc.name,
      })),
      toUpdate: this.toUpdate().map(r => ({
        projectId: r.local.projectId, phoneNumberId: r.acc.phoneNumberId, wabaId: r.acc.wabaId, phoneNumber: r.acc.phoneNumber, name: r.acc.name,
      })),
      toDelete: this.toDelete().map(r => ({
        projectId: r.local.projectId, action: r.action, reassignToProjectId: r.reassignTo,
        unsubscribeFromMeta: r.unsubscribe, confirmDigits: r.confirmDigits,
      })),
    };
    this.isSyncing.set(true);
    this.syncError.set(null);
    this.projectService.syncProjects(payload).subscribe({
      next: (res: any) => {
        this.isSyncing.set(false);
        this.result.set(res);
        this.step.set(3);
        if (res.undo?.length) {
          this.undoLeft.set(Math.round((res.undoWindowMs || 30000) / 1000));
          this.undoTimer = setInterval(() => {
            this.undoLeft.update(v => v - 1);
            if (this.undoLeft() <= 0) clearInterval(this.undoTimer);
          }, 1000);
        }
      },
      error: (err: any) => {
        this.isSyncing.set(false);
        this.syncError.set(err.error?.error || err.error?.message || 'Sync failed. No changes were applied.');
      },
    });
  }

  undo(u: { auditId: number; projectId: number }) {
    this.projectService.undoSync(u.auditId).subscribe({
      next: () => this.undone.update(s => new Set(s).add(u.auditId)),
      error: (err: any) => this.syncError.set(err.error?.error || 'Undo failed'),
    });
  }

  projectName(id: any) {
    return (this.data?.localRows || []).find((l: any) => Number(l.projectId) === Number(id))?.projectName || `Project #${id}`;
  }
}
