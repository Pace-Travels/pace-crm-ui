import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-developer-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './developer-view.html',
  styleUrl: './developer-view.scss',
})
export class DeveloperView {
  activeTab = 'api-campaign-key';
  apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MmIwNWIxZGVmNDZmMGJmNjVhMDhjZSIsIm5hbWUiOiJQYWNlIFRyYXZlbHMiLCJhcHBJZCI6IjQWlTZW5zSIsInNsaWdCI6InjcYjA1YjBkZWY0NmYwYmY2NWcwGM3IiwiYWN0aXZlUGxhbiI6IkJBU0lDX01PTlRITHkiLCJpYXQiOjE3MzI4NDYyMzh9.xZJTS61DbI0f6F_IQUETPwLPMaPjt7BpKFKJwv_VQ';
}
