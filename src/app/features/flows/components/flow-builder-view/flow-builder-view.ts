import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FlowService } from '../../services/flow.service';

@Component({
  selector: 'app-flow-builder-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './flow-builder-view.html',
  styleUrl: './flow-builder-view.scss',
})
export class FlowBuilderView {
  activeTab = 'Your Flows';

  constructor(public flowService: FlowService) {}
}
