import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms-of-service-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './terms-of-service-view.html',
  styleUrl: './terms-of-service-view.scss'
})
export class TermsOfServiceView {}
