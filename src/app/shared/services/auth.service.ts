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
      }
      this.router.navigate(['/dashboard']);
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/']);
    Swal.fire('Logged Out', 'You have been successfully logged out.', 'info');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}
