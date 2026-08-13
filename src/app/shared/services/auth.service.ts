import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private api: ApiService, private router: Router) {}

  login(credentials: any) {
    return this.api.post<any>('user/login', credentials).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  signup(userData: any) {
    return this.api.post<any>('user/signup', userData).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  googleLogin(googleData: any) {
    return this.api.post<any>('user/google', googleData).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  private handleAuthResponse(res: any) {
    if (res && res.token) {
      localStorage.setItem('token', res.token);
      if (res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
        const activeProjId = res.user.projectId || localStorage.getItem('activeProjectId') || '1';
        localStorage.setItem('activeProjectId', activeProjId.toString());
      }
      if (!localStorage.getItem('whatsapp_environment_mode')) {
        localStorage.setItem('whatsapp_environment_mode', 'DEVELOPMENT');
      }
      this.router.navigate(['/dashboard']);
    }
  }

  logout() {
    Swal.fire({
      title: 'Sign Out Confirmation',
      text: 'Are you sure you want to sign out? Click "No, Stay Back" to remain in your session.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Sign Out',
      cancelButtonText: 'No, Stay Back',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userName');
        localStorage.removeItem('activeProjectId');
        
        this.router.navigate(['/login']);
        
        Swal.fire({
          title: 'Logged Out',
          text: 'You have been signed out successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

  checkSessionOrRedirect(): boolean {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      Swal.fire({
        title: 'Session Required',
        text: 'No active session details found. Redirecting to Login...',
        icon: 'warning',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return false;
    }
    return true;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token') && !!localStorage.getItem('user');
  }
}
