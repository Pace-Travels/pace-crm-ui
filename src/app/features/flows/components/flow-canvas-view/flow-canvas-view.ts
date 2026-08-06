import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FFlowModule } from '@foblex/flow';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-flow-canvas-view',
  standalone: true,
  imports: [CommonModule, FFlowModule, RouterLink],
  templateUrl: './flow-canvas-view.html',
  styleUrl: './flow-canvas-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowCanvasView {
  nodes = [
    { id: 'start', label: 'Trigger: Incoming Message', position: { x: 100, y: 200 } },
    { id: 'node1', label: 'Send AI Greeting', position: { x: 400, y: 200 } }
  ];

  connections = [
    { id: 'c1', source: 'start_out', target: 'node1_in' }
  ];
}
