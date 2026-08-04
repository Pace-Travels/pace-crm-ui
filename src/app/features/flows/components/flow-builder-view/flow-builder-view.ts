import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowService } from '../../services/flow.service';

@Component({
  selector: 'app-flow-builder-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flow-builder-view.html',
  styleUrl: './flow-builder-view.scss',
})
export class FlowBuilderView {
  activeTab = 'Your Flows';

  constructor(public flowService: FlowService) {}
}
