import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, PaymentRecord, PaymentGateway } from '../../services/payment.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payments-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payments-view.html',
  styleUrl: './payments-view.scss',
})
export class PaymentsView implements OnInit {
  paymentService = inject(PaymentService);

  showTopupModal = signal<boolean>(false);
  selectedAmount: number = 1000;
  customAmount: number | null = null;
  gstRate: number = 18;
  selectedGateway: PaymentGateway = 'RAZORPAY';

  searchQuery = signal<string>('');
  selectedStatusFilter: string = 'ALL';

  showInvoiceModal = signal<boolean>(false);
  selectedInvoice = signal<any>(null);

  ngOnInit() {
    this.paymentService.fetchWallet();
    this.paymentService.fetchHistory();
  }

  get topupAmount(): number {
    if (this.customAmount && this.customAmount > 0) {
      return this.customAmount;
    }
    return this.selectedAmount || 1000;
  }

  get gstAmount(): number {
    return Math.round((this.topupAmount * this.gstRate) / 100);
  }

  get finalAmount(): number {
    return this.topupAmount + this.gstAmount;
  }

  openTopupModal() {
    this.selectedAmount = 1000;
    this.customAmount = null;
    this.showTopupModal.set(true);
  }

  closeTopupModal() {
    this.showTopupModal.set(false);
  }

  selectPredefinedAmount(amt: number) {
    this.selectedAmount = amt;
    this.customAmount = null;
  }

  submitTopup() {
    this.initiateTopup();
  }

  initiateTopup() {
    if (this.topupAmount < 100) {
      this.showAlert('Invalid Amount', 'Minimum top-up amount is ₹100', 'error');
      return;
    }

    this.paymentService.createOrder({
      amount: this.topupAmount,
      gateway: this.selectedGateway
    }).subscribe({
      next: (res) => {
        this.closeTopupModal();
        if (res.success && res.order) {
          this.simulateGatewayCheckout(res.order);
        }
      },
      error: (err) => this.showAlert('Order Error', err.error?.error || 'Failed to create order', 'error')
    });
  }

  private simulateGatewayCheckout(order: any) {
    const gatewayName = this.selectedGateway;
    const txnId = order.transactionId;
    const details = `Order #${order.receiptNumber} - Total Payable: ₹${order.amountWithGst} (Incl. 18% GST)`;

    Swal.fire({
      title: `Authorize ${gatewayName} Payment`,
      html: `<strong>${details}</strong><br/><br/>Simulate gateway response authorization:`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Authorize Success',
      cancelButtonText: 'Simulate Failure',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444'
    }).then((result: any) => {
      const isSuccess = result.isConfirmed;
      this.verifyPayment(txnId, isSuccess);
    });
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
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
