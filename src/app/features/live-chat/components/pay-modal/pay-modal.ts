import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PaymentRequestPayload {
  amount: number;
  description: string;
  gateway: 'RAZORPAY' | 'WHATSAPP_PAY' | 'UPI';
  currency: string;
}

@Component({
  selector: 'app-pay-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="closeModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        
        <div class="modal-header">
          <div class="title-group">
            <i class="fa-solid fa-indian-rupee-sign header-icon"></i>
            <h3>Request Payment from Customer</h3>
          </div>
          <button type="button" class="btn-close" (click)="closeModal()">&times;</button>
        </div>

        <div class="modal-body">
          <p class="section-desc">Generate a secure payment link or UPI request and dispatch it directly to the customer's WhatsApp chat.</p>

          <!-- Amount Preset Pills -->
          <div class="amount-presets">
            <span class="preset-label">Quick Amount Presets (₹ INR):</span>
            <div class="preset-chips">
              <button type="button" class="preset-btn" *ngFor="let p of amountPresets" (click)="amount = p">
                ₹{{ p }}
              </button>
            </div>
          </div>

          <!-- Amount Input -->
          <div class="form-group">
            <label class="input-label">Payment Amount (₹ INR) *</label>
            <div class="input-with-icon">
              <span class="currency-symbol">₹</span>
              <input 
                type="number" 
                class="form-control amount-input" 
                placeholder="e.g. 1500" 
                [(ngModel)]="amount" 
                min="1"
              />
            </div>
          </div>

          <!-- Order Description -->
          <div class="form-group">
            <label class="input-label">Order Description / Service Note *</label>
            <input 
              type="text" 
              class="form-control" 
              placeholder="e.g. Booking Advance, Consulting Fee, Order #1042" 
              [(ngModel)]="description" 
            />
          </div>

          <!-- Payment Gateway Selection -->
          <div class="form-group">
            <label class="input-label">Payment Gateway Channel:</label>
            <div class="gateway-options">
              <label class="gateway-radio" [class.selected]="gateway === 'RAZORPAY'">
                <input type="radio" name="gw" value="RAZORPAY" [(ngModel)]="gateway" />
                <i class="fa-solid fa-credit-card"></i> Razorpay (Cards, NetBanking, UPI)
              </label>
              <label class="gateway-radio" [class.selected]="gateway === 'WHATSAPP_PAY'">
                <input type="radio" name="gw" value="WHATSAPP_PAY" [(ngModel)]="gateway" />
                <i class="fa-brands fa-whatsapp"></i> Meta WhatsApp Pay Native
              </label>
              <label class="gateway-radio" [class.selected]="gateway === 'UPI'">
                <input type="radio" name="gw" value="UPI" [(ngModel)]="gateway" />
                <i class="fa-solid fa-qrcode"></i> Direct UPI Link / QR
              </label>
            </div>
          </div>

        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-cancel" (click)="closeModal()">Cancel</button>
          <button type="button" class="btn btn-submit" (click)="submitPayment()" [disabled]="!amount || amount <= 0">
            <i class="fa-solid fa-paper-plane"></i> Generate & Send Payment Link
          </button>
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
      background: #ffffff; width: 100%; max-width: 520px; border-radius: 20px;
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
    .amount-presets {
      .preset-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; display: block; }
      .preset-chips { display: flex; gap: 8px; }
      .preset-btn { background: #f8fafc; border: 1px solid #cbd5e1; color: #10b981; font-weight: 700; padding: 6px 14px; border-radius: 8px; font-size: 12.5px; cursor: pointer; &:hover { background: #ecfdf5; border-color: #10b981; } }
    }
    .form-group {
      display: flex; flex-direction: column; gap: 6px;
      .input-label { font-size: 12px; font-weight: 700; color: #475569; }
      .form-control { width: 100%; box-sizing: border-box; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; outline: none; }
      .amount-input { font-size: 16px; font-weight: 700; color: #0f172a; padding-left: 32px; }
      .input-with-icon { position: relative; .currency-symbol { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: #10b981; font-size: 16px; } }
    }
    .gateway-options {
      display: flex; flex-direction: column; gap: 8px;
      .gateway-radio {
        display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-weight: 500; color: #334155; cursor: pointer; transition: all 0.2s;
        &.selected { border-color: #10b981; background: #ecfdf5; font-weight: 700; color: #047857; }
      }
    }
    .modal-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;
      .btn { padding: 10px 20px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
      .btn-cancel { background: #ffffff; border: 1px solid #cbd5e1; color: #475569; }
      .btn-submit { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: #ffffff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); &:disabled { opacity: 0.5; cursor: not-allowed; } }
    }
  `]
})
export class PayModal {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() sendPaymentRequest = new EventEmitter<PaymentRequestPayload>();

  amount: number | null = null;
  description = 'Payment Request';
  gateway: 'RAZORPAY' | 'WHATSAPP_PAY' | 'UPI' = 'RAZORPAY';
  amountPresets = [500, 1000, 2500, 5000];

  submitPayment() {
    if (!this.amount || this.amount <= 0) return;
    this.sendPaymentRequest.emit({
      amount: this.amount,
      description: this.description.trim() || 'Payment Request',
      gateway: this.gateway,
      currency: 'INR'
    });
    this.closeModal();
  }

  closeModal() {
    this.amount = null;
    this.description = 'Payment Request';
    this.close.emit();
  }
}
