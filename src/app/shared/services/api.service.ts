import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  public baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(isMultipart = false): HttpHeaders {
    // In a real app, you would retrieve the JWT token from localStorage/sessionStorage
    const token = localStorage.getItem('token') || '';
    const projectId = localStorage.getItem('activeProjectId') || '';
    const envMode = localStorage.getItem('whatsapp_environment_mode') || 'DEVELOPMENT';
    const headersConfig: any = {
      'Authorization': `Bearer ${token}`,
      'X-Environment-Mode': envMode,
      'X-Whatsapp-Mode': envMode
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
    const isMultipart = (body instanceof FormData) || (body && typeof body === 'object' && body.constructor && body.constructor.name === 'FormData');
    let reqHeaders = this.getHeaders(isMultipart);

    if (options && options.headers) {
      reqHeaders = options.headers;
      if (isMultipart) {
        reqHeaders = reqHeaders.delete('Content-Type');
      }
    }

    const finalOptions = { ...(options || {}), headers: reqHeaders };
    return this.http.post<T>(this.getUrl(endpoint), body, finalOptions) as Observable<T>;
  }

  put<T>(endpoint: string, body: any, options?: any): Observable<T> {
    const isMultipart = (body instanceof FormData) || (body && typeof body === 'object' && body.constructor && body.constructor.name === 'FormData');
    let reqHeaders = this.getHeaders(isMultipart);

    if (options && options.headers) {
      reqHeaders = options.headers;
      if (isMultipart) {
        reqHeaders = reqHeaders.delete('Content-Type');
      }
    }

    const finalOptions = { ...(options || {}), headers: reqHeaders };
    return this.http.put<T>(this.getUrl(endpoint), body, finalOptions) as Observable<T>;
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.getUrl(endpoint), { headers: this.getHeaders() });
  }
}
