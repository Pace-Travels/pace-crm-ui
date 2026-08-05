import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://messengerapi.quotedesks.com/api/v1';

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

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, { headers: this.getHeaders() });
  }

  post<T>(endpoint: string, body: any, options?: { headers?: HttpHeaders;}): Observable<T> {
    const isMultipart = body instanceof FormData;
    return this.http.post<T>(
      `${this.baseUrl}/${endpoint}`, body,
      {
        headers: this.getHeaders(isMultipart),
        ...options
      }
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body, { headers: this.getHeaders() });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, { headers: this.getHeaders() });
  }
}
