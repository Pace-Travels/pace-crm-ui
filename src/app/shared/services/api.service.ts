import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(isMultipart = false): HttpHeaders {
    // In a real app, you would retrieve the JWT token from localStorage/sessionStorage
    const token = localStorage.getItem('token') || '';
    const projectId = localStorage.getItem('activeProjectId') || '';
    const headersConfig: any = {
      'Authorization': `Bearer ${token}`
    };
    if (projectId) {
      headersConfig['X-Project-Id'] = projectId;
    }
    if (!isMultipart) {
      headersConfig['Content-Type'] = 'application/json';
    }
    return new HttpHeaders(headersConfig);
  }

  private getUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const cleanBaseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.substring(0, this.baseUrl.length - 1) : this.baseUrl;
    return `${cleanBaseUrl}/${cleanEndpoint}`;
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(this.getUrl(endpoint), { headers: this.getHeaders() });
  }

  post<T>(endpoint: string, body: any, options?: any): Observable<T> {
    const finalOptions = options || { headers: this.getHeaders() };
    return this.http.post<T>(this.getUrl(endpoint), body, finalOptions) as Observable<T>;
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(this.getUrl(endpoint), body, { headers: this.getHeaders() });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.getUrl(endpoint), { headers: this.getHeaders() });
  }
}
