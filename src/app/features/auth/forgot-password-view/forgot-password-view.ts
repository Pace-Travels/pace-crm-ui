import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-forgot-password-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password-view.html',
  styleUrl: './forgot-password-view.scss'
})
export class ForgotPasswordView implements OnInit {
  resetStep: 'REQUEST' | 'VERIFY' | 'SUCCESS' = 'REQUEST';
  requestForm!: FormGroup;
  resetForm!: FormGroup;
  isSubmitting = false;
  targetEmail = '';

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit() {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(4)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  submitRequestReset() {
    if (this.requestForm.invalid) {
      Swal.fire('Required', 'Please enter a valid email address.', 'warning');
      return;
    }

    this.isSubmitting = true;
    this.targetEmail = this.requestForm.value.email;

    // Simulate sending password reset link / security token
    setTimeout(() => {
      this.isSubmitting = false;
      this.resetStep = 'VERIFY';
      Swal.fire({
        title: 'Reset Code Sent!',
        text: `We have sent a verification code to ${this.targetEmail}.`,
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

    // Simulate password update
    setTimeout(() => {
      this.isSubmitting = false;
      this.resetStep = 'SUCCESS';
    }, 1000);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
