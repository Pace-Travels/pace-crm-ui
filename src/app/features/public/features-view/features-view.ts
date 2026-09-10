import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-features-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './features-view.html',
  styleUrl: './features-view.scss'
})
export class FeaturesView {}
