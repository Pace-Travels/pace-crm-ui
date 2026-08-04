import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactsSidebar } from './components/contacts-sidebar/contacts-sidebar';
import { ContactsTable } from './components/contacts-table/contacts-table';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, ContactsSidebar, ContactsTable],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts {}
