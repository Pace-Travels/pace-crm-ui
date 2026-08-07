import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentService, PaymentGateway, PaymentRecord } from '../../services/payment.service';

declare var Swal: any;

@Component({
  selector: 'app-payments-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './payments-view.html',
  styleUrl: './payments-view.scss',
})
export class PaymentsView implements OnInit {
  paymentService = inject(PaymentService);
  fb = inject(FormBuilder);

  activeTab = 'All';

  // Modal controls
  showTopupModal = signal(false);
  showInvoiceModal = signal(false);
  selectedInvoice = signal<any | null>(null);

  // Top-Up Form
  selectedAmount = 1000;
  customAmount: number | null = null;
  selectedGateway: PaymentGateway = 'RAZORPAY';
  selectedPaymentMethod = 'UPI';

  // Filter
  searchQuery = signal('');
  selectedStatusFilter = 'ALL';

  ngOnInit() {
    this.paymentService.fetchWallet();
    this.paymentService.fetchHistory();
  }

  get finalAmount(): number {
    return this.customAmount && this.customAmount > 0 ? this.customAmount : this.selectedAmount;
  }

  selectPredefinedAmount(amt: number) {
    this.selectedAmount = amt;
    this.customAmount = null;
  }

  openTopupModal() {
    this.showTopupModal.set(true);
  }

  closeTopupModal() {
    this.showTopupModal.set(false);
  }

  // Submit Top-Up Order with custom UI handling for Razorpay, PhonePe, Stripe
  submitTopup() {
    const amountToPay = this.finalAmount;
    if (!amountToPay || amountToPay <= 0) {
      this.showAlert('Invalid Amount', 'Please enter a valid top-up amount.', 'warning');
      return;
    }

    const currency = this.selectedGateway === 'STRIPE' ? 'USD' : 'INR';

    this.paymentService.createOrder({
      amount: amountToPay,
      gateway: this.selectedGateway,
      currency,
      paymentMethod: this.selectedPaymentMethod
    }).subscribe({
      next: (res) => {
        if (res.success && res.payment) {
          const txn = res.payment.transactionId;
          const gatewayData = res.gatewayData;

          this.handleGatewayCheckout(this.selectedGateway, txn, gatewayData);
        }
      },
      error: (err) => {
        this.showAlert('Payment Error', err.error?.error || 'Failed to create payment order', 'error');
      }
    });
  }

  private handleGatewayCheckout(gateway: PaymentGateway, txnId: string, gatewayData: any) {
    this.closeTopupModal();

    if (gateway === 'RAZORPAY') {
      this.simulateCheckoutPrompt('Razorpay UPI / Cards Gateway', `Order ID: ${txnId}\nAmount: ₹${this.finalAmount}`, txnId);
    } else if (gateway === 'PHONEPE') {
      this.simulateCheckoutPrompt('PhonePe Gateway (UPI / QR)', `Merchant Txn ID: ${txnId}\nAmount: ₹${this.finalAmount}`, txnId);
    } else if (gateway === 'STRIPE') {
      this.simulateCheckoutPrompt('Stripe International Payment', `Payment Intent: ${gatewayData.clientSecret}\nAmount: $${this.finalAmount}`, txnId);
    }
  }

  private simulateCheckoutPrompt(gatewayName: string, details: string, txnId: string) {
    if (typeof Swal !== 'undefined' && Swal && Swal.fire) {
      Swal.fire({
        title: gatewayName,
        html: `<div style="text-align:left; font-size:13px; color:#475569;">
                <p><strong>Gateway:</strong> ${gatewayName}</p>
                <p><strong>Details:</strong></p>
                <pre style="background:#f8fafc; padding:8px; border-radius:6px; font-size:11px;">${details}</pre>
                <p>Confirm test payment authorization to credit wallet balance.</p>
               </div>`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '✅ Authorize Payment (Success)',
        cancelButtonText: '❌ Simulate Failure',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#ef4444'
      }).then((result: any) => {
        const isSuccess = result.isConfirmed;
        this.verifyPayment(txnId, isSuccess);
      });
    } else {
      const confirmOk = confirm(`${gatewayName}\n\n${details}\n\nClick OK to Authorize Payment Success, or Cancel to Simulate Failure.`);
      this.verifyPayment(txnId, confirmOk);
    }
  }

  private verifyPayment(txnId: string, isSuccess: boolean) {
    this.paymentService.verifyPayment({
      transactionId: txnId,
      gatewayTransactionId: `GW_${Date.now()}`,
      signature: `SIG_${Date.now()}`,
      status: isSuccess ? 'SUCCESS' : 'FAILED'
    }).subscribe({
      next: (res) => {
        if (isSuccess) {
          this.showAlert('Payment Successful!', `₹${this.finalAmount} added to your Ad Credit wallet balance.`, 'success');
        } else {
          this.showAlert('Payment Failed', 'Payment transaction was not authorized or failed.', 'error');
        }
        this.paymentService.fetchWallet();
        this.paymentService.fetchHistory();
      },
      error: (err) => this.showAlert('Error', err.error?.error || 'Verification error', 'error')
    });
  }

  openInvoiceModal(record: PaymentRecord) {
    this.paymentService.getInvoice(record.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.selectedInvoice.set(res.invoice);
          this.showInvoiceModal.set(true);
        }
      },
      error: (err) => this.showAlert('Error', 'Invoice details unavailable', 'error')
    });
  }

  closeInvoiceModal() {
    this.showInvoiceModal.set(false);
  }

  printInvoice() {
    window.print();
  }

  filteredHistory(): PaymentRecord[] {
    let list = this.paymentService.history();
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(r => r.transactionId.toLowerCase().includes(q) || r.receiptNumber.toLowerCase().includes(q));
    }
    if (this.selectedStatusFilter !== 'ALL') {
      list = list.filter(r => r.status === this.selectedStatusFilter);
    }
    return list;
  }

  private showAlert(title: string, text: string, icon: string) {
    if (typeof Swal !== 'undefined' && Swal && Swal.fire) {
      Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    } else {
      alert(`${title}: ${text}`);
    }
  }
}
