import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FFlowModule, 
  FCreateConnectionEvent, 
  FReassignConnectionEvent
} from '@foblex/flow';
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
  private cdr = inject(ChangeDetectorRef);

  nodes = [
    { id: 'start', label: 'Trigger: Incoming Message', type: 'trigger', position: { x: 100, y: 200 } },
    { id: 'node1', label: 'Send AI Greeting', type: 'message', position: { x: 400, y: 200 } }
  ];

  connections = [
    { id: 'c1', source: 'start_out', target: 'node1_in' }
  ];

  private idCounter = 2;

  // Adding nodes
  addNode(type: string) {
    const id = `node${this.idCounter++}`;
    let label = 'Action Node';
    
    if (type === 'message') label = 'Send Message';
    else if (type === 'condition') label = 'Condition';
    else if (type === 'wait') label = 'Wait';
    else if (type === 'tag') label = 'Add Tag';
    else if (type === 'agent') label = 'Assign Agent';

    this.nodes.push({
      id,
      label,
      type,
      position: { x: 150 + Math.random() * 50, y: 250 + Math.random() * 50 }
    });
    
    // Using OnPush, so we create a new array reference
    this.nodes = [...this.nodes];
    this.cdr.markForCheck();
  }

  // Deleting nodes
  deleteNode(nodeId: string) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    
    // Also remove any connections linked to this node (its connectors have node id prefixes)
    this.connections = this.connections.filter(c => 
      !c.source.startsWith(nodeId) && !c.target.startsWith(nodeId)
    );
    this.cdr.markForCheck();
  }

  // Handle new connection drawn by user
  onConnectionCreated(event: FCreateConnectionEvent) {
    // Only allow connection if source and target exist
    if (!event.sourceId || !event.targetId) return;

    this.connections.push({
      id: `conn_${Date.now()}`,
      source: event.sourceId,
      target: event.targetId
    });
    this.connections = [...this.connections];
    this.cdr.markForCheck();
  }

  // Handle reassigning connection endpoints (dragging existing connection)
  onConnectionReassigned(event: FReassignConnectionEvent) {
    const index = this.connections.findIndex(c => c.id === event.connectionId);
    if (index !== -1 && event.nextSourceId && event.nextTargetId) {
      this.connections[index] = {
        ...this.connections[index],
        source: event.nextSourceId,
        target: event.nextTargetId
      };
      this.connections = [...this.connections];
      this.cdr.markForCheck();
    }
  }

  // We could implement node dragging/saving position by listening to fMoveNodes, 
  // but for classic state it's often optional unless you need to persist exact coords.
}
