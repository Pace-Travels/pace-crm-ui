import { Component, OnInit, AfterViewInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventsService, EventItem } from './services/events.service';
import { ProjectService } from '../projects/services/project.service';

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
  projectService = inject(ProjectService);
  fb = inject(FormBuilder);

  activeTab = 'radar';
  selectedCity = 'Dubai';
  searchCityQuery = 'Dubai';
  selectedCategory = 'ALL';
  selectedMinSpend = 0;
  highlightedEventId = signal<number | null>(null);

  private map: any = null;
  private markersGroup: any = null;
  private eventMarkersMap = new Map<number, any>();

  // WhatsApp Numbers for searchable select
  whatsappNumbers = signal<any[]>([
    { id: '+919876543210', label: '+91 98765 43210 (Pace Travels Official)' },
    { id: '+971501234567', label: '+971 50 123 4567 (Dubai Concierge Desk)' },
    { id: '+442079460912', label: '+44 20 7946 0912 (UK Travel Desk)' }
  ]);

  // Contact Groups / Segments
  contactGroups = signal<any[]>([
    { id: 'ALL_CONTACTS', name: 'All Registered Contacts' },
    { id: 'MUMBAI_VIPS', name: 'Mumbai High-Spenders' },
    { id: 'DUBAI_TRAVELERS', name: 'Dubai Long Weekend Travelers' },
    { id: 'HOT_LEADS', name: 'Hot Tour Package Leads' },
    { id: 'CORPORATE_CLIENTS', name: 'Corporate & MICE Clients' }
  ]);

  // Trigger Creator Modal
  showTriggerModal = signal(false);
  triggerForm: FormGroup;

  // Mock triggers list
  triggersList = signal<any[]>([
    {
      id: 1,
      ruleName: 'Dubai Tech Surge Hotel Deals',
      projectName: 'Pace Travels Official',
      senderNumber: '+971 50 123 4567 (Dubai Concierge Desk)',
      contactGroupName: 'Dubai Long Weekend Travelers',
      city: 'Dubai',
      category: 'EXPO_CONFERENCE',
      minSpend: 5000000,
      daysBefore: 14,
      templateName: 'dubai_expo_hotel_discount',
      status: 'ACTIVE'
    },
    {
      id: 2,
      ruleName: 'Mumbai Sports Surge Cab Pass',
      projectName: 'Pace Travels Official',
      senderNumber: '+91 98765 43210 (Pace Travels Official)',
      contactGroupName: 'Mumbai High-Spenders',
      city: 'Mumbai',
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
      projectId: [1, Validators.required],
      senderNumber: ['+919876543210', Validators.required],
      contactGroup: ['ALL_CONTACTS', Validators.required],
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

  private getCoordsForCity(city: string): { lat: number; lng: number; zoom: number } {
    const key = Object.keys(CITY_COORDINATES).find(k => k.toLowerCase() === (city || '').toLowerCase());
    if (key && CITY_COORDINATES[key]) {
      return CITY_COORDINATES[key];
    }
    return { lat: 25.2048, lng: 55.2708, zoom: 12 };
  }

  private initMap() {
    const mapElement = document.getElementById('events-map-radar');
    if (!mapElement) return;

    if (this.map) {
      try { this.map.remove(); } catch(e) {}
    }

    const coords = this.getCoordsForCity(this.selectedCity);
    this.map = L.map('events-map-radar').setView([coords.lat, coords.lng], coords.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors | PredictHQ Radar'
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.updateMapMarkers();

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 300);
  }

  onCitySearchSubmit() {
    const query = this.searchCityQuery.trim();
    if (!query) return;

    this.selectedCity = query.charAt(0).toUpperCase() + query.slice(1);
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
    const coords = this.getCoordsForCity(city);
    if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) return;

    this.map.flyTo([coords.lat, coords.lng], coords.zoom || 12, { animate: true, duration: 1.2 });
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 400);
  }

  updateMapMarkers() {
    if (!this.markersGroup || !this.map) return;
    this.markersGroup.clearLayers();
    this.eventMarkersMap.clear();

    const eventsList = this.eventsService.events();
    const cityCoords = this.getCoordsForCity(this.selectedCity);

    eventsList.forEach((ev: any, idx: number) => {
      let lat = parseFloat(ev.latitude);
      let lng = parseFloat(ev.longitude);

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        lat = cityCoords.lat + (idx * 0.012 - 0.02);
        lng = cityCoords.lng + (idx * 0.015 - 0.02);
      }

      const isHighSurge = ev.rankScore >= 75;
      const markerColor = isHighSurge ? '#ef4444' : '#f59e0b';
      const spendVal = Math.round((ev.totalPredictedSpend || 500000) / 100000);

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: ${markerColor}; color: white; padding: 6px 10px; border-radius: 20px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px; font-family: sans-serif; cursor: pointer; transform: scale(1); transition: transform 0.2s;">
                <span>${isHighSurge ? '🔥' : '⚡'}</span> ₹${spendVal}L
               </div>`,
        iconSize: [80, 30],
        iconAnchor: [40, 15]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.markersGroup);
      this.eventMarkersMap.set(ev.id, marker);

      const popupHtml = `
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="font-size: 13px; color: #0f172a; display: block;">${ev.title}</strong>
          <div style="font-size: 11px; color: #64748b; margin: 4px 0;">📍 ${ev.venue}</div>
          <div style="font-size: 12px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 4px 8px; border-radius: 4px; display: inline-block;">
            Total Spend: ₹ ${Number(ev.totalPredictedSpend || 0).toLocaleString()}
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

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 200);
  }

  focusEventOnMap(event: EventItem) {
    this.highlightedEventId.set(event.id);
    if (!this.map) {
      this.initMap();
    }

    const cityCoords = this.getCoordsForCity(event.city || this.selectedCity);
    const lat = parseFloat((event as any).latitude) || cityCoords.lat;
    const lng = parseFloat((event as any).longitude) || cityCoords.lng;

    if (this.map) {
      this.map.flyTo([lat, lng], 14, { animate: true, duration: 1.2 });
      const marker = this.eventMarkersMap.get(event.id);
      if (marker) {
        marker.openPopup();
      }
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 300);
    }
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

    const formVal = this.triggerForm.value;
    const project = this.projectService.projects().find(p => p.id === Number(formVal.projectId));
    const sender = this.whatsappNumbers().find(n => n.id === formVal.senderNumber);
    const group = this.contactGroups().find(g => g.id === formVal.contactGroup);

    const newRule = {
      id: Date.now(),
      ...formVal,
      projectName: project ? project.name : 'Pace Travels Official',
      senderNumber: sender ? sender.label : formVal.senderNumber,
      contactGroupName: group ? group.name : formVal.contactGroup,
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
