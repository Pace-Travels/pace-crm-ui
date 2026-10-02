import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  currentTheme = signal<ThemeMode>('light');

  constructor() {
    const savedTheme = (localStorage.getItem('qd-theme') as ThemeMode) || 'light';
    this.setTheme(savedTheme);
  }

  setTheme(mode: ThemeMode) {
    this.currentTheme.set(mode);
    localStorage.setItem('qd-theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);
  }

  toggleTheme() {
    const nextMode = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(nextMode);
  }
}
