import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventsService, EventItem } from './services/events.service';

declare var Swal: any;

@Component({
  selector: 'app-events-radar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './events-radar.html',
  styleUrl: './events-radar.scss',
})
export class EventsRadar implements OnInit {
  eventsService = inject(EventsService);
  fb = inject(FormBuilder);

  activeTab = 'radar';
  selectedCity = 'Mumbai';
  selectedCategory = 'ALL';
  selectedMinSpend = 0;

  // Trigger Creator Modal
  showTriggerModal = signal(false);
  triggerForm: FormGroup;

  // Mock triggers list
  triggersList = signal<any[]>([
    {
      id: 1,
      ruleName: 'Mumbai Sports Surge Hotel Deals',
      city: 'Mumbai',
      category: 'SPORTS',
      minSpend: 5000000,
      daysBefore: 14,
      templateName: 'mumbai_sports_hotel_discount',
      status: 'ACTIVE'
    },
    {
      id: 2,
      city: 'Dubai',
      ruleName: 'Dubai Tech Expo Travel Passes',
      category: 'EXPO_CONFERENCE',
      minSpend: 10000000,
      daysBefore: 7,
      templateName: 'dubai_expo_cab_pass',
      status: 'ACTIVE'
    }
  ]);

  constructor() {
    this.triggerForm = this.fb.group({
      ruleName: ['', Validators.required],
      city: ['Mumbai', Validators.required],
      category: ['SPORTS', Validators.required],
      minSpend: [1000000, [Validators.required, Validators.min(100000)]],
      daysBefore: [14, Validators.required],
      templateName: ['event_special_discount', Validators.required]
    });
  }

  ngOnInit() {
    this.eventsService.fetchEventRadar(this.selectedCity, this.selectedCategory);
    this.eventsService.fetchCities();
  }

  onCityFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedCity = target.value;
    this.eventsService.fetchEventRadar(this.selectedCity, this.selectedCategory, this.selectedMinSpend);
  }

  onCategoryFilterChange(cat: string) {
    this.selectedCategory = cat;
    this.eventsService.fetchEventRadar(this.selectedCity, this.selectedCategory, this.selectedMinSpend);
  }

  syncCityEvents() {
    this.eventsService.syncEvents(this.selectedCity).subscribe({
      next: (res) => {
        this.showAlert('Synced!', `Fresh event & spend data ingested for ${this.selectedCity}.`, 'success');
        this.eventsService.fetchEventRadar(this.selectedCity, this.selectedCategory);
      },
      error: (err) => this.showAlert('Sync Error', err.error?.error || 'Failed to sync events', 'error')
    });
  }

  openTriggerModal(event?: EventItem) {
    if (event) {
      this.triggerForm.patchValue({
        ruleName: `Auto Trigger: ${event.title}`,
        city: event.city,
        category: event.category,
        minSpend: Math.round(event.totalPredictedSpend * 0.5)
      });
    }
    this.showTriggerModal.set(true);
  }

  closeTriggerModal() {
    this.showTriggerModal.set(false);
  }

  submitCreateTrigger() {
    if (this.triggerForm.invalid) {
      this.showAlert('Required', 'Please complete all trigger rule fields.', 'warning');
      return;
    }

    const newRule = {
      id: Date.now(),
      ...this.triggerForm.value,
      status: 'ACTIVE'
    };

    this.triggersList.set([newRule, ...this.triggersList()]);
    this.closeTriggerModal();
    this.showAlert('Trigger Activated!', `Automated campaign trigger "${newRule.ruleName}" created successfully.`, 'success');
  }

  private showAlert(title: string, text: string, icon: string) {
    if (typeof Swal !== 'undefined' && Swal && Swal.fire) {
      Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    } else {
      alert(`${title}: ${text}`);
    }
  }
}
