import { Component, OnInit, AfterViewInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventsService, EventItem } from './services/events.service';

declare var L: any;
declare var Swal: any;

const CITY_COORDINATES: { [key: string]: { lat: number; lng: number; zoom: number } } = {
  'Dubai': { lat: 25.2048, lng: 55.2708, zoom: 12 },
  'Mumbai': { lat: 18.9902, lng: 72.8131, zoom: 12 },
  'Delhi': { lat: 28.6139, lng: 77.2090, zoom: 11 },
  'Bengaluru': { lat: 12.9716, lng: 77.5946, zoom: 12 },
  'London': { lat: 51.5074, lng: -0.1278, zoom: 11 },
  'New York': { lat: 40.7128, lng: -74.0060, zoom: 11 },
  'Tokyo': { lat: 35.6762, lng: 139.6503, zoom: 11 },
  'Paris': { lat: 48.8566, lng: 2.3522, zoom: 12 }
};

@Component({
  selector: 'app-events-radar',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './events-radar.html',
  styleUrl: './events-radar.scss',
})
export class EventsRadar implements OnInit, AfterViewInit {
  eventsService = inject(EventsService);
  fb = inject(FormBuilder);

  activeTab = 'radar';
  selectedCity = 'Dubai';
  searchCityQuery = 'Dubai';
  selectedCategory = 'ALL';
  selectedMinSpend = 0;
  highlightedEventId = signal<number | null>(null);

  private map: any = null;
  private markersGroup: any = null;

  // Trigger Creator Modal
  showTriggerModal = signal(false);
  triggerForm: FormGroup;

  // Mock triggers list
  triggersList = signal<any[]>([
    {
      id: 1,
      ruleName: 'Dubai Tech Surge Hotel Deals',
      city: 'Dubai',
      category: 'EXPO_CONFERENCE',
      minSpend: 5000000,
      daysBefore: 14,
      templateName: 'dubai_expo_hotel_discount',
      status: 'ACTIVE'
    },
    {
      id: 2,
      city: 'Mumbai',
      ruleName: 'Mumbai Sports Surge Cab Pass',
      category: 'SPORTS',
      minSpend: 2000000,
      daysBefore: 7,
      templateName: 'mumbai_sports_cab_pass',
      status: 'ACTIVE'
    }
  ]);

  constructor() {
    this.triggerForm = this.fb.group({
      ruleName: ['', Validators.required],
      city: ['Dubai', Validators.required],
      category: ['EXPO_CONFERENCE', Validators.required],
      minSpend: [1000000, [Validators.required, Validators.min(100000)]],
      daysBefore: [14, Validators.required],
      templateName: ['event_special_discount', Validators.required]
    });
  }

  ngOnInit() {
    this.fetchEventsAndRender();
    this.eventsService.fetchCities();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 400);
  }

  fetchEventsAndRender() {
    this.eventsService.fetchEventRadar(this.selectedCity, this.selectedCategory, this.selectedMinSpend).subscribe({
      next: () => {
        if (this.map) {
          this.updateMapMarkers();
        }
      }
    });
  }

  private initMap() {
    const mapElement = document.getElementById('events-map-radar');
    if (!mapElement) return;

    if (this.map) {
      this.map.remove();
    }

    const coords = CITY_COORDINATES[this.selectedCity] || CITY_COORDINATES['Dubai'];
    this.map = L.map('events-map-radar').setView([coords.lat, coords.lng], coords.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors | PredictHQ Radar'
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.updateMapMarkers();
  }

  onCitySearchSubmit() {
    const query = this.searchCityQuery.trim();
    if (!query) return;

    // Match known coordinates or default
    const matchedCityKey = Object.keys(CITY_COORDINATES).find(c => c.toLowerCase() === query.toLowerCase());
    this.selectedCity = matchedCityKey || (query.charAt(0).toUpperCase() + query.slice(1));
    this.searchCityQuery = this.selectedCity;

    this.panMapToCity(this.selectedCity);
    this.fetchEventsAndRender();
  }

  onCitySelectChange(city: string) {
    this.selectedCity = city;
    this.searchCityQuery = city;
    this.panMapToCity(city);
    this.fetchEventsAndRender();
  }

  panMapToCity(city: string) {
    if (!this.map) return;
    const coords = CITY_COORDINATES[city] || CITY_COORDINATES['Dubai'];
    this.map.flyTo([coords.lat, coords.lng], coords.zoom, { animate: true, duration: 1.2 });
  }

  updateMapMarkers() {
    if (!this.markersGroup) return;
    this.markersGroup.clearLayers();

    const eventsList = this.eventsService.events();
    const cityCoords = CITY_COORDINATES[this.selectedCity] || CITY_COORDINATES['Dubai'];

    eventsList.forEach((ev: any, idx: number) => {
      const lat = parseFloat(ev.latitude) || (cityCoords.lat + (idx * 0.015 - 0.03));
      const lng = parseFloat(ev.longitude) || (cityCoords.lng + (idx * 0.018 - 0.03));

      const isHighSurge = ev.rankScore >= 75;
      const markerColor = isHighSurge ? '#ef4444' : '#f59e0b';

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: ${markerColor}; color: white; padding: 6px 10px; border-radius: 20px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px; font-family: sans-serif; cursor: pointer; transform: scale(1); transition: transform 0.2s;">
                <span>${isHighSurge ? '🔥' : '⚡'}</span> ₹${Math.round(ev.totalPredictedSpend / 100000)}L
               </div>`,
        iconSize: [80, 30],
        iconAnchor: [40, 15]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.markersGroup);

      const popupHtml = `
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="font-size: 13px; color: #0f172a; display: block;">${ev.title}</strong>
          <div style="font-size: 11px; color: #64748b; margin: 4px 0;">📍 ${ev.venue}</div>
          <div style="font-size: 12px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 4px 8px; border-radius: 4px; display: inline-block;">
            Total Spend: ₹ ${Number(ev.totalPredictedSpend).toLocaleString()}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        this.highlightedEventId.set(ev.id);
        const cardElem = document.getElementById(`event-card-${ev.id}`);
        if (cardElem) cardElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  focusEventOnMap(event: EventItem) {
    this.highlightedEventId.set(event.id);
    if (!this.map) return;
    const cityCoords = CITY_COORDINATES[event.city] || CITY_COORDINATES['Dubai'];
    const lat = parseFloat((event as any).latitude) || cityCoords.lat;
    const lng = parseFloat((event as any).longitude) || cityCoords.lng;
    this.map.flyTo([lat, lng], 14, { animate: true, duration: 1 });
  }

  onCategoryFilterChange(cat: string) {
    this.selectedCategory = cat;
    this.fetchEventsAndRender();
  }

  syncCityEvents() {
    this.eventsService.syncEvents(this.selectedCity).subscribe({
      next: () => {
        this.showAlert('Live Sync Complete', `Fresh live events & predicted spend aggregated for ${this.selectedCity}.`, 'success');
        this.fetchEventsAndRender();
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
