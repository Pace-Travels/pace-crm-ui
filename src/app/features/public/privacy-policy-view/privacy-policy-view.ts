import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy-policy-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './privacy-policy-view.html',
  styleUrl: './privacy-policy-view.scss'
})
export class PrivacyPolicyView {}
