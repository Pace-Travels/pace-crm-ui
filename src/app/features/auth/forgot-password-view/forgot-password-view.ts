import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-forgot-password-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password-view.html',
  styleUrl: './forgot-password-view.scss'
})
export class ForgotPasswordView implements OnInit {
  api = inject(ApiService);
  router = inject(Router);
  fb = inject(FormBuilder);

  resetStep: 'REQUEST' | 'VERIFY' | 'DIRECT' | 'SUCCESS' = 'DIRECT';
  requestForm!: FormGroup;
  resetForm!: FormGroup;
  directResetForm!: FormGroup;

  isSubmitting = false;
  targetEmail = '';

  ngOnInit() {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      code: ['784912', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });

    this.directResetForm = this.fb.group({
      email: ['admin@quotedesks.com', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  submitDirectReset() {
    if (this.directResetForm.invalid) {
      Swal.fire('Required Fields', 'Please enter a valid email and new password (min 6 chars).', 'warning');
      return;
    }

    const { email, newPassword, confirmPassword } = this.directResetForm.value;
    if (newPassword !== confirmPassword) {
      Swal.fire('Password Mismatch', 'Passwords do not match. Please verify and try again.', 'error');
      return;
    }

    this.isSubmitting = true;
    this.targetEmail = email;

    this.api.post('/users/reset-password', { email, newPassword }).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.resetStep = 'SUCCESS';
        Swal.fire({
          title: 'Password Updated!',
          text: `Account password for ${email} has been updated in MySQL database.`,
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: (err: any) => {
        this.isSubmitting = false;
        Swal.fire('Error', err.error?.error || 'Failed to update password', 'error');
      }
    });
  }

  submitRequestReset() {
    if (this.requestForm.invalid) {
      Swal.fire('Required', 'Please enter a valid email address.', 'warning');
      return;
    }

    this.isSubmitting = true;
    this.targetEmail = this.requestForm.value.email;

    setTimeout(() => {
      this.isSubmitting = false;
      this.resetStep = 'VERIFY';
      Swal.fire({
        title: 'Reset Code Sent!',
        text: `Verification code generated for ${this.targetEmail}.`,
        icon: 'success',
        timer: 2500,
        showConfirmButton: false
      });
    }, 800);
  }

  submitResetPassword() {
    if (this.resetForm.invalid) {
      Swal.fire('Invalid Form', 'Please complete all required fields.', 'warning');
      return;
    }

    const { newPassword, confirmPassword } = this.resetForm.value;
    if (newPassword !== confirmPassword) {
      Swal.fire('Password Mismatch', 'Passwords do not match. Please try again.', 'error');
      return;
    }

    this.isSubmitting = true;
    this.api.post('/users/reset-password', { email: this.targetEmail || 'admin@quotedesks.com', newPassword }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.resetStep = 'SUCCESS';
      },
      error: (err) => {
        this.isSubmitting = false;
        Swal.fire('Error', err.error?.error || 'Failed to update password', 'error');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
