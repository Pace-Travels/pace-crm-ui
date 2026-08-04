import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api.service';

export interface Payment {
  id: number;
  name: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  payments = signal<Payment[]>([]);

  constructor(private api: ApiService) {}

  fetchPayments() {
    this.api.get<{success: boolean, data: Payment[]}>('payments').subscribe(res => {
      if (res.success) {
        this.payments.set(res.data);
      }
    });
  }
}
