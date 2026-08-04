import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact-profile-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-profile-panel.html',
  styleUrl: './contact-profile-panel.scss',
})
export class ContactProfilePanel {
  @Input() contact: any = null;
  @Input() isOpen = false;
  @Output() closePanel = new EventEmitter<void>();

  // Accordion state
  expandedSection: string | null = null;

  toggleSection(section: string) {
    if (this.expandedSection === section) {
      this.expandedSection = null;
    } else {
      this.expandedSection = section;
    }
  }

  getInitials(name: string): string {
    if (!name || name === 'UNKNOWN') return 'U';
    return name.charAt(0).toUpperCase();
  }
}
