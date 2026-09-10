import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contact-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact-view.html',
  styleUrl: './contact-view.scss'
})
export class ContactView {
  fullName = '';
  email = '';
  company = '';
  message = '';
  isSubmitting = signal(false);

  submitForm(): void {
    if (!this.fullName || !this.email || !this.message) {
      Swal.fire('Required Fields', 'Please fill in your name, email, and message.', 'warning');
      return;
    }

    this.isSubmitting.set(true);
    setTimeout(() => {
      this.isSubmitting.set(false);
      Swal.fire({
        title: 'Inquiry Dispatched!',
        text: 'Thank you for reaching out to QuoteDesks Messenger sales & support team.',
        icon: 'success'
      });
      this.fullName = '';
      this.email = '';
      this.company = '';
      this.message = '';
    }, 1000);
  }
}
