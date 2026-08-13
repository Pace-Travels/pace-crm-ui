import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-view.html',
  styleUrl: './login-view.scss',
})
export class LoginView implements OnInit {
  loginForm!: FormGroup;
  isSubmitting = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  forgotPassword(event: Event) {
    event.preventDefault();
    Swal.fire({
      title: 'Forgot Password',
      text: 'Enter your email address to reset your password.',
      input: 'email',
      inputPlaceholder: 'Enter your email',
      showCancelButton: true,
      confirmButtonText: 'Reset Password'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire('Success', 'If an account with that email exists, a reset link has been sent.', 'success');
      }
    });
  }

  submitLogin() {
    if (this.loginForm.invalid) {
      Swal.fire('Error', 'Please enter a valid email and password.', 'error');
      return;
    }

    this.isSubmitting = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        // Navigation is handled in AuthService
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.error || err.error?.message || 'Login failed. Please check your credentials.';
        Swal.fire('Login Error', msg, 'error');
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
