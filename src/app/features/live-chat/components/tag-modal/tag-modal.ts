import { Component, EventEmitter, Output, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api.service';

@Component({
  selector: 'app-tag-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="closeModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        
        <div class="modal-header">
          <div class="title-group">
            <i class="fa-solid fa-tags header-icon"></i>
            <h3>Manage Contact Tags</h3>
          </div>
          <button type="button" class="btn-close" (click)="closeModal()">&times;</button>
        </div>

        <div class="modal-body">
          <p class="section-desc">Apply tags to categorize contacts and trigger automated segment workflows.</p>

          <!-- Currently Applied Tags Chips -->
          <div class="tags-container">
            <label class="input-label">Currently Applied Tags:</label>
            <div class="chips-wrapper">
              <div class="tag-chip" *ngFor="let tag of currentTags">
                <span>🏷️ {{ tag }}</span>
                <i class="fa-solid fa-xmark remove-chip" (click)="removeTag.emit(tag)" title="Remove Tag"></i>
              </div>
              <div class="empty-hint" *ngIf="currentTags.length === 0">
                No tags applied yet. Add a tag below.
              </div>
            </div>
          </div>

          <!-- Add New Tag Input -->
          <div class="add-tag-group">
            <label class="input-label">Add New / Select Tag:</label>
            <div class="input-with-btn">
              <input 
                type="text" 
                class="form-control" 
                placeholder="Type tag name (e.g. HotLead, VIP, Support, Booked)" 
                [(ngModel)]="newTagInput"
                (keyup.enter)="applyTag()"
              />
              <button type="button" class="btn btn-add" (click)="applyTag()" [disabled]="!newTagInput.trim()">
                <i class="fa-solid fa-plus"></i> Add
              </button>
            </div>
          </div>

          <!-- Suggested Preset Tags -->
          <div class="preset-tags">
            <span class="preset-label">Suggested Presets:</span>
            <div class="preset-chips">
              <button type="button" class="preset-btn" *ngFor="let p of presets" (click)="newTagInput = p; applyTag()">
                + {{ p }}
              </button>
            </div>
          </div>

        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-cancel" (click)="closeModal()">Done</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px);
      z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-card {
      background: #ffffff; width: 100%; max-width: 480px; border-radius: 20px;
      box-shadow: 0 20px 45px rgba(0,0,0,0.2); overflow: hidden;
      animation: modalFadeIn 0.25s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid #e2e8f0;
      .title-group { display: flex; align-items: center; gap: 12px; }
      .header-icon { font-size: 20px; color: #10b981; background: #ecfdf5; padding: 10px; border-radius: 10px; }
      h3 { margin: 0; font-size: 17px; font-weight: 700; color: #0f172a; }
      .btn-close { background: transparent; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; }
    }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
    .section-desc { margin: 0; font-size: 13px; color: #64748b; }
    .input-label { font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; display: block; }
    .chips-wrapper {
      display: flex; flex-wrap: wrap; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; min-height: 44px; align-items: center;
    }
    .tag-chip {
      background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;
      .remove-chip { cursor: pointer; font-size: 13px; opacity: 0.7; &:hover { opacity: 1; color: #ef4444; } }
    }
    .empty-hint { font-size: 12px; color: #94a3b8; }
    .input-with-btn {
      display: flex; gap: 8px;
      .form-control { flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; outline: none; }
      .btn-add { background: #10b981; color: #fff; border: none; padding: 0 18px; border-radius: 10px; font-weight: 600; cursor: pointer; }
      .btn-add:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .preset-tags {
      .preset-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; display: block; }
      .preset-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .preset-btn { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 500; cursor: pointer; &:hover { background: #e2e8f0; color: #0f172a; } }
    }
    .modal-footer {
      display: flex; justify-content: flex-end; padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;
      .btn-cancel { background: #ffffff; border: 1px solid #cbd5e1; padding: 8px 20px; border-radius: 8px; font-weight: 600; color: #334155; cursor: pointer; }
    }
  `]
})
export class TagModal {
  @Input() isOpen = false;
  @Input() currentTags: string[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() addTag = new EventEmitter<string>();
  @Output() removeTag = new EventEmitter<string>();

  newTagInput = '';
  presets = ['HotLead', 'VIP', 'PaymentPending', 'Booked', 'SupportRequired', 'Cold'];

  applyTag() {
    const tag = this.newTagInput.trim();
    if (!tag) return;
    this.addTag.emit(tag);
    this.newTagInput = '';
  }

  closeModal() {
    this.newTagInput = '';
    this.close.emit();
  }
}
