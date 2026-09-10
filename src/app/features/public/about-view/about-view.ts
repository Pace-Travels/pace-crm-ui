import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about-view.html',
  styleUrl: './about-view.scss'
})
export class AboutView {}
