import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-signup-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup-view.html',
  styleUrl: './signup-view.scss',
})
export class SignupView implements OnInit {
  signupForm!: FormGroup;
  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.signupForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      return null;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submitSignup() {
    if (this.signupForm.invalid) {
      Swal.fire('Error', 'Please fill all required fields correctly and ensure passwords match.', 'error');
      return;
    }

    this.isSubmitting = true;
    this.authService.signup(this.signupForm.value).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        // Navigation is handled in AuthService
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.error || err.error?.message || 'Signup failed. Please try again.';
        Swal.fire('Signup Error', msg, 'error');
      }
    });
  }

  googleLogin() {
    Swal.fire({
      title: 'Mock Google Sign In',
      html: `
        <input type="text" id="google-name" class="swal2-input" placeholder="Your Name (e.g. John Doe)">
        <input type="email" id="google-email" class="swal2-input" placeholder="Your Email">
      `,
      confirmButtonText: 'Continue',
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById('google-name') as HTMLInputElement).value;
        const email = (document.getElementById('google-email') as HTMLInputElement).value;
        if (!name || !email) {
          Swal.showValidationMessage('Please enter both name and email');
          return false;
        }
        return { name, email, googleId: 'mock-id-' + new Date().getTime() };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.isSubmitting = true;
        this.authService.googleLogin(result.value).subscribe({
          next: (res) => {
            this.isSubmitting = false;
          },
          error: (err) => {
            this.isSubmitting = false;
            Swal.fire('Google Sign In Error', err.error?.message || 'Failed to sign in', 'error');
          }
        });
      }
    });
  }
}
