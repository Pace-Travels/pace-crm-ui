import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-data-deletion-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './data-deletion-view.html',
  styleUrl: './data-deletion-view.scss'
})
export class DataDeletionView {}
