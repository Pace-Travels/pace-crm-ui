import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplatesView } from '../manage/components/templates-view/templates-view';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, TemplatesView],
  templateUrl: './templates.html',
  styleUrl: './templates.scss'
})
export class Templates {}
