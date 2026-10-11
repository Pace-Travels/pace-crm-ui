import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tenant-usage-meter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usage-meter.html',
  styleUrl: './usage-meter.scss'
})
export class TenantUsageMeterComponent implements OnInit {
  seatsUsed = signal<number>(8);
  maxSeats = signal<number>(10);
  
  messagesSent = signal<number>(32450);
  maxMessages = signal<number>(50000);

  contactsStored = signal<number>(8400);
  maxContacts = signal<number>(10000);

  ngOnInit(): void {
    // In production, fetch current agency usage stats via API
  }

  getSeatPercentage(): number {
    return Math.min(100, Math.round((this.seatsUsed() / this.maxSeats()) * 100));
  }

  getMessagePercentage(): number {
    return Math.min(100, Math.round((this.messagesSent() / this.maxMessages()) * 100));
  }

  getContactPercentage(): number {
    return Math.min(100, Math.round((this.contactsStored() / this.maxContacts()) * 100));
  }
}
