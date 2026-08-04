import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentsSidebar } from './components/payments-sidebar/payments-sidebar';
import { PaymentsView as PaymentsViewComponent } from './components/payments-view/payments-view';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, PaymentsSidebar, PaymentsViewComponent],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class Payments {}
