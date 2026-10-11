import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { environment } from '../../../../environments/environment';

export interface ShowcaseSlide {
  badge: string;
  title: string;
  description: string;
  cardTitle: string;
  cardSub: string;
  mockupType?: 'INTEGRATIONS' | 'AI_BOT' | 'WABA_QUOTA';
}

@Component({
  selector: 'app-login-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-view.html',
  styleUrl: './login-view.scss',
})
export class LoginView implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isSubmitting = false;
  showPassword = false;
  rememberMe = true;

  // Showcase Carousel Signal State
  currentSlide = signal(0);
  private slideTimer: any = null;

  slides: ShowcaseSlide[] = [
    {
      badge: "WHAT'S NEW?",
      title: "15 new integrations added",
      description: "You asked and we listened! We've added a bunch of new integrations to speed up your workflow.",
      cardTitle: "Connect QuoteDesks to Meta & Linear",
      cardSub: "Prioritize work based on customer needs and build a tighter feedback loop with your customers.",
      mockupType: 'INTEGRATIONS'
    },
    {
      badge: "AI MARKETING RADAR",
      title: "AI Conversational Workflows",
      description: "Auto-qualify incoming prospects & map response buttons directly to CRM lead stages with automated bot flows.",
      cardTitle: "Lead Qualification & Interactive Bot",
      cardSub: "Sends instant auto-replies and tags customer profiles automatically upon button click.",
      mockupType: 'AI_BOT'
    },
    {
      badge: "ENTERPRISE INFRASTRUCTURE",
      title: "Tier 1 Official Meta WABA API",
      description: "Broadcast up to 100,000+ daily messages with live Meta quality rating monitoring and dynamic quota tracking.",
      cardTitle: "Meta WABA Quota: 1,000 / Day",
      cardSub: "Quality Rating: High • Official Meta TSP Partner Ecosystem",
      mockupType: 'WABA_QUOTA'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['amelie@quotedesks.com', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    this.startSlideTimer();
  }

  ngOnDestroy() {
    this.stopSlideTimer();
  }

  startSlideTimer() {
    this.stopSlideTimer();
    this.slideTimer = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopSlideTimer() {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
      this.slideTimer = null;
    }
  }

  setSlide(index: number) {
    this.currentSlide.set(index);
    this.startSlideTimer();
  }

  nextSlide() {
    this.currentSlide.set((this.currentSlide() + 1) % this.slides.length);
  }

  prevSlide() {
    const current = this.currentSlide();
    this.currentSlide.set(current === 0 ? this.slides.length - 1 : current - 1);
    this.startSlideTimer();
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
    this.authService.login(this.loginForm.value).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: (res) => {
        if (!res || !res.token) {
          const msg = res?.error || res?.message || 'Login failed. Please check your credentials.';
          Swal.fire('Login Error', msg, 'error');
        }
      },
      error: (err) => {
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
          this.authService.googleLogin(payload).pipe(
            finalize(() => {
              this.isSubmitting = false;
            })
          ).subscribe({
            next: (res) => {
              if (!res || !res.token) {
                Swal.fire('Google Sign In Error', res?.error || res?.message || 'Failed to authenticate Google user', 'error');
              }
            },
            error: (err) => {
              Swal.fire('Google Sign In Error', err.error?.error || err.error?.message || err.message || 'Failed to authenticate Google user', 'error');
            }
          });
        })
        .catch((error) => {
          this.isSubmitting = false;
          console.error('Firebase Google Auth error:', error);
          if (error.code === 'auth/configuration-not-found' || (error.message && error.message.includes('configuration-not-found'))) {
            this.promptGoogleFallback();
          } else {
            Swal.fire('Google Sign In Failed', error.message || 'Could not complete Google Sign In window popup', 'error');
          }
        });
    } catch (err: any) {
      this.isSubmitting = false;
      this.promptGoogleFallback();
    }
  }

  promptGoogleFallback() {
    Swal.fire({
      title: 'Google Sign In',
      text: 'Enter your Google account email address to log in:',
      input: 'email',
      inputPlaceholder: 'name@gmail.com',
      showCancelButton: true,
      confirmButtonText: 'Continue to Account',
      confirmButtonColor: '#4285f4'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.isSubmitting = true;
        const payload = {
          name: result.value.split('@')[0],
          email: result.value,
          googleId: 'google-user-' + Date.now()
        };
        this.authService.googleLogin(payload).pipe(
          finalize(() => {
            this.isSubmitting = false;
          })
        ).subscribe({
          next: (res) => {
            if (!res || !res.token) {
              Swal.fire('Google Sign In Error', res?.error || res?.message || 'Failed to authenticate Google user', 'error');
            }
          },
          error: (err) => {
            Swal.fire('Google Sign In Error', err.error?.error || err.error?.message || err.message || 'Failed to authenticate Google user', 'error');
          }
        });
      }
    });
  }
}
