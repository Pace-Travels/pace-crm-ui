import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import Swal from 'sweetalert2';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { environment } from '../../../../environments/environment';

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
    try {
      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      this.isSubmitting = true;
      signInWithPopup(auth, provider)
        .then((result) => {
          const user = result.user;
          const payload = {
            name: user.displayName || user.email?.split('@')[0] || 'Google User',
            email: user.email,
            googleId: user.uid,
            avatarUrl: user.photoURL
          };
          this.authService.googleLogin(payload).subscribe({
            next: () => {
              this.isSubmitting = false;
            },
            error: (err) => {
              this.isSubmitting = false;
              Swal.fire('Google Sign In Error', err.error?.message || err.message || 'Failed to authenticate Google user', 'error');
            }
          });
        })
        .catch((error) => {
          this.isSubmitting = false;
          console.error('Firebase Google Auth error:', error);
          Swal.fire('Google Sign In Failed', error.message || 'Could not complete Google Sign In window popup', 'error');
        });
    } catch (err: any) {
      this.isSubmitting = false;
      Swal.fire('Google Sign In Error', err.message || 'Firebase initialization error', 'error');
    }
  }
}
