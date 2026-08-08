import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactsSidebar } from './components/contacts-sidebar/contacts-sidebar';
import { ContactsTable } from './components/contacts-table/contacts-table';
import { WhatsappCostCalculator } from './components/whatsapp-cost-calculator/whatsapp-cost-calculator';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, ContactsSidebar, ContactsTable, WhatsappCostCalculator],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts {
  showCalculator = signal<boolean>(true);

  toggleCalculator() {
    this.showCalculator.set(!this.showCalculator());
  }
}
