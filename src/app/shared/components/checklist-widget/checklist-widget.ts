import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-checklist-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checklist-widget.html'
})
export class ChecklistWidgetComponent {
  onboardingService = inject(OnboardingService);
  router = inject(Router);

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
