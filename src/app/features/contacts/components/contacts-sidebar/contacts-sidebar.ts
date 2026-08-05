import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contacts-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contacts-sidebar.html',
  styleUrl: './contacts-sidebar.scss',
})
export class ContactsSidebar implements OnInit {
  constructor(public contactService: ContactService) {}

  ngOnInit() {
    this.contactService.fetchGroups();
  }

  selectType(type: 'B2B' | 'B2C') {
    this.contactService.activeType.set(type);
  }

  deleteGroup(id: number | undefined, event: Event) {
    event.stopPropagation();
    if (id === undefined) return;
    if (confirm("Are you sure you want to delete this group?")) {
      this.contactService.deleteGroup(id).subscribe({
        next: () => {
          this.contactService.fetchGroups();
        }
      });
    }
  }
}
