import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdsSidebar } from './components/ads-sidebar/ads-sidebar';
import { AdsSetupView } from './components/ads-setup-view/ads-setup-view';

@Component({
  selector: 'app-ads-manager',
  standalone: true,
  imports: [CommonModule, AdsSidebar, AdsSetupView],
  templateUrl: './ads-manager.html',
  styleUrl: './ads-manager.scss',
})
export class AdsManager {}
