import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AdvisoryReason {
  level: 'HARD' | 'SOFT' | 'INFO';
  type: string;
  label: string;
  detail?: string;
  until?: string;
  sourceProject?: string | null;
  strikes?: number;
}

export interface DeliveryAdvisory {
  level: 'HARD' | 'SOFT' | 'INFO' | null;
  primary: AdvisoryReason | null;
  reasons: AdvisoryReason[];
  health: number;
  agencyHealth: number;
  frequency?: { sent24h: number; sent7d: number; byProject: Record<string, number>; cap24h: number; cap7d: number };
}

const ICONS: Record<string, string> = {
  INVALID: 'fa-ban',
  MARKETING_OPT_OUT: 'fa-bell-slash',
  COOLDOWN: 'fa-hourglass-half',
  FREQUENCY_CAP: 'fa-gauge-high',
  UNREACHABLE: 'fa-signal',
  META_HOLDOUT: 'fa-flask',
  AT_RISK: 'fa-triangle-exclamation',
};

@Component({
  selector: 'app-advisory-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (advisory?.level) {
      <span class="adv-badge" [attr.data-level]="advisory!.level" (mouseenter)="open.set(true)" (mouseleave)="open.set(false)">
        <i class="fa-solid" [ngClass]="icon()"></i>
        @if (!compact) { <span>{{ advisory!.primary?.label }}</span> }
        @if (advisory!.reasons.length > 1) { <span class="adv-more">+{{ advisory!.reasons.length - 1 }}</span> }
        @if (open()) {
          <div class="adv-pop" (click)="$event.stopPropagation()">
            <div class="adv-pop-head">
              <span>Deliverability advisory</span>
              <span class="adv-health">Health {{ advisory!.health }} · Agency {{ advisory!.agencyHealth }}</span>
            </div>
            @for (r of advisory!.reasons; track r.type) {
              <div class="adv-reason" [attr.data-level]="r.level">
                <div class="adv-reason-title"><i class="fa-solid" [ngClass]="iconFor(r.type)"></i> {{ r.label }}
                  @if (r.sourceProject) { <span class="adv-src">via {{ r.sourceProject }}</span> }
                </div>
                @if (r.detail) { <div class="adv-reason-detail">{{ r.detail }}</div> }
              </div>
            }
            @if (advisory!.frequency; as f) {
              <div class="adv-freq">Marketing sent: {{ f.sent24h }}/{{ f.cap24h }} in 24h · {{ f.sent7d }}/{{ f.cap7d }} in 7d (agency-wide)</div>
            }
          </div>
        }
      </span>
    }
  `,
  styles: [`
    :host { display: inline-flex; }
    .adv-badge { position: relative; display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 999px;
      font-size: 10.5px; font-weight: 700; cursor: help; white-space: nowrap; border: 1px solid transparent; }
    .adv-badge[data-level='HARD'] { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .adv-badge[data-level='SOFT'] { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
    .adv-badge[data-level='INFO'] { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .adv-more { opacity: .7; }
    .adv-pop { position: absolute; top: calc(100% + 6px); left: 0; z-index: 1200; width: 300px; background: #fff; color: #1e293b;
      border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 18px 40px -12px rgba(15,23,42,.25); padding: 10px; white-space: normal;
      font-weight: 500; animation: advIn .14s ease-out; }
    .adv-pop-head { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .03em; }
    .adv-health { text-transform: none; font-weight: 600; color: #64748b; letter-spacing: 0; }
    .adv-reason { border-left: 3px solid #cbd5e1; padding: 4px 8px; margin-bottom: 6px; border-radius: 4px; background: #f8fafc; }
    .adv-reason[data-level='HARD'] { border-color: #ef4444; }
    .adv-reason[data-level='SOFT'] { border-color: #f97316; }
    .adv-reason[data-level='INFO'] { border-color: #3b82f6; }
    .adv-reason-title { font-size: 12px; font-weight: 700; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .adv-src { font-size: 10px; font-weight: 600; background: #ede9fe; color: #6d28d9; padding: 1px 6px; border-radius: 6px; }
    .adv-reason-detail { font-size: 11.5px; color: #475569; margin-top: 2px; line-height: 1.4; }
    .adv-freq { font-size: 11px; color: #64748b; margin-top: 4px; }
    @keyframes advIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  `],
})
export class AdvisoryBadge {
  @Input() advisory: DeliveryAdvisory | null | undefined = null;
  @Input() compact = false;
  open = signal(false);
  icon = computed(() => this.iconFor(this.advisory?.primary?.type || ''));
  iconFor(type: string) { return ICONS[type] || 'fa-circle-info'; }
}
