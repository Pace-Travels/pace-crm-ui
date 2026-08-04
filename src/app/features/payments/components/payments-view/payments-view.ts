import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payments-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payments-view.html',
  styleUrl: './payments-view.scss',
})
export class PaymentsView {
  activeTab = 'All';
}
