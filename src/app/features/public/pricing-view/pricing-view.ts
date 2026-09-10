import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pricing-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing-view.html',
  styleUrl: './pricing-view.scss'
})
export class PricingView {
  isAnnual = signal(true);

  toggleBilling(): void {
    this.isAnnual.set(!this.isAnnual());
  }
}
