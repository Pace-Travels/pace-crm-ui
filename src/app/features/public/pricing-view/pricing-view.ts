import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../shared/services/theme.service';

@Component({
  selector: 'app-pricing-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing-view.html',
  styleUrl: './pricing-view.scss'
})
export class PricingView {
  themeService = inject(ThemeService);
  isAnnual = signal(true);

  toggleBilling(): void {
    this.isAnnual.set(!this.isAnnual());
  }
}
