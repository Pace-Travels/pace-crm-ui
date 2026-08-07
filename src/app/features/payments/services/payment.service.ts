import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';
import { Observable } from 'rxjs';

export type PaymentGateway = 'RAZORPAY' | 'PHONEPE' | 'STRIPE';

export interface PaymentRecord {
  id: number;
  transactionId: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  adCreditsAdded: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  paymentMethod: string;
  receiptNumber: string;
  createdAt: string;
}

export interface WalletInfo {
  balance: number;
  currency: string;
  totalTopups: number;
  totalCreditsAdded: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  wallet = signal<WalletInfo>({
    balance: 1000.00,
    currency: 'INR',
    totalTopups: 0,
    totalCreditsAdded: 0
  });

  history = signal<PaymentRecord[]>([]);

  constructor(private api: ApiService) {}

  fetchWallet(): Observable<any> {
    const obs = this.api.get<any>('payments/wallet');
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.wallet.set(res.wallet);
        }
      },
      error: (err) => console.warn('Fetch wallet balance error', err)
    });
    return obs;
  }

  fetchHistory(): Observable<any> {
    const obs = this.api.get<any>('payments/history');
    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.history.set(res.data || []);
        }
      },
      error: (err) => console.warn('Fetch payment history error', err)
    });
    return obs;
  }

  createOrder(payload: { amount: number; gateway: PaymentGateway; currency?: string; paymentMethod?: string }): Observable<any> {
    return this.api.post<any>('payments/order', payload);
  }

  verifyPayment(payload: { transactionId: string; gatewayTransactionId?: string; signature?: string; status?: string }): Observable<any> {
    return this.api.post<any>('payments/verify', payload);
  }

  getInvoice(id: number): Observable<any> {
    return this.api.get<any>(`payments/invoice/${id}`);
  }
}
