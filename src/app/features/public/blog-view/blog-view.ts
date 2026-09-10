import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-view.html',
  styleUrl: './blog-view.scss'
})
export class BlogView {}
