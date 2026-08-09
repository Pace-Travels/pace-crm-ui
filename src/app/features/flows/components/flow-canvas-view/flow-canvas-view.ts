import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { 
  FFlowModule, 
  FCreateConnectionEvent, 
  FReassignConnectionEvent
} from '@foblex/flow';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FlowService } from '../../services/flow.service';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-flow-canvas-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FFlowModule, RouterLink],
  templateUrl: './flow-canvas-view.html',
  styleUrl: './flow-canvas-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowCanvasView implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private flowService = inject(FlowService);
  private route = inject(ActivatedRoute);

  flowId: number | null = null;
  flowName = 'Customer Support Automated Flow';
  triggerKeyword = 'HI';
  aiEnabled = true;

  // Node Property Editor Panel state
  selectedNode = signal<any | null>(null);

  // Test Runner Modal state
  showTestModal = signal(false);
  testMessage = 'HI';
  testLogs = signal<any[]>([]);

  nodes = [
    { id: 'start', label: 'Trigger: Keyword "HI"', type: 'trigger', content: 'Inbound message matches "HI"', position: { x: 100, y: 150 } },
    { id: 'node1', label: 'Send Welcome Greeting', type: 'message', content: 'Welcome to Pace Travels! How can we help you today?', position: { x: 400, y: 150 } },
    { id: 'node2', label: 'Assign Gemini AI Agent', type: 'agent', content: 'Handoff to Gemini 1.5 Pro Chatbot', position: { x: 700, y: 150 } }
  ];

  connections = [
    { id: 'c1', source: 'start_out', target: 'node1_in' },
    { id: 'c2', source: 'node1_out', target: 'node2_in' }
  ];

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.flowId = parseInt(idParam, 10);
      this.loadFlow(this.flowId);
    }
  }

  loadFlow(id: number) {
    this.flowService.getFlow(id).subscribe({
      next: (res) => {
        if (res.success && res.flow) {
          const f = res.flow;
          this.flowName = f.name;
          this.triggerKeyword = f.triggerKeyword || 'HI';
          this.aiEnabled = !!f.aiEnabled;

          if (f.nodes && f.nodes.length > 0) {
            this.nodes = f.nodes;
          }
          if (f.connections && f.connections.length > 0) {
            this.connections = f.connections;
          }
          this.cdr.markForCheck();
        }
      }
    });
  }

  // Node Selection & Editing Panel
  selectNode(node: any, event?: Event) {
    if (event) event.stopPropagation();
    // Clone node object for editing
    this.selectedNode.set({ ...node });
    this.cdr.markForCheck();
  }

  closeNodeEditor() {
    this.selectedNode.set(null);
    this.cdr.markForCheck();
  }

  updateSelectedNode() {
    const sn = this.selectedNode();
    if (!sn) return;

    const idx = this.nodes.findIndex(n => n.id === sn.id);
    if (idx !== -1) {
      this.nodes[idx] = { ...sn };
      this.nodes = [...this.nodes];
      this.cdr.markForCheck();
      this.showAlert('Node Updated', `Saved changes for node: ${sn.label}`, 'success');
    }
  }

  // Adding nodes
  addNode(type: string) {
    const id = `node_${Date.now()}`;
    let label = 'Action Node';
    let content = 'Configure step details...';
    
    if (type === 'message') { label = 'Send Message'; content = 'Thank you for contacting Pace Travels!'; }
    else if (type === 'condition') { label = 'Condition Branch'; content = 'If user replies YES'; }
    else if (type === 'wait') { label = 'Wait Delay'; content = 'Wait 5 minutes before reply'; }
    else if (type === 'tag') { label = 'Add Tag'; content = 'Add tag: VIP Lead'; }
    else if (type === 'agent') { label = 'Assign AI Agent'; content = 'Hand off to Gemini 1.5 Pro AI'; }

    const newNode = {
      id,
      label,
      type,
      content,
      position: { x: 250 + Math.random() * 80, y: 200 + Math.random() * 80 }
    };

    this.nodes.push(newNode);
    this.nodes = [...this.nodes];
    this.selectNode(newNode);
    this.cdr.markForCheck();
  }

  deleteNode(nodeId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connections = this.connections.filter(c => 
      !c.source.startsWith(nodeId) && !c.target.startsWith(nodeId)
    );
    if (this.selectedNode()?.id === nodeId) {
      this.selectedNode.set(null);
    }
    this.cdr.markForCheck();
  }

  onConnectionCreated(event: FCreateConnectionEvent) {
    if (!event.sourceId || !event.targetId) return;

    // Prevent duplicate connections
    const exists = this.connections.some(c => c.source === event.sourceId && c.target === event.targetId);
    if (!exists) {
      this.connections.push({
        id: `conn_${Date.now()}`,
        source: event.sourceId,
        target: event.targetId
      });
      this.connections = [...this.connections];
      this.cdr.markForCheck();
    }
  }

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

  deleteConnection(connId: string) {
    this.connections = this.connections.filter(c => c.id !== connId);
    this.cdr.markForCheck();
  }

  // Save Flow Canvas to Backend
  saveFlow() {
    const payload = {
      id: this.flowId || undefined,
      name: this.flowName,
      triggerKeyword: this.triggerKeyword,
      nodes: this.nodes as any,
      connections: this.connections as any,
      aiEnabled: this.aiEnabled,
      status: 'ACTIVE'
    };

    this.flowService.saveFlow(payload).subscribe({
      next: (res) => {
        if (res.success) {
          if (res.flow && res.flow.id) {
            this.flowId = res.flow.id;
          }
          this.showAlert('Success!', 'Flow canvas saved to backend successfully.', 'success');
        }
      },
      error: (err) => this.showAlert('Error', err.error?.error || 'Failed to save flow', 'error')
    });
  }

  // Open Test Flow Execution Modal
  openTestModal() {
    this.showTestModal.set(true);
    this.runTestExecution();
  }

  closeTestModal() {
    this.showTestModal.set(false);
  }

  runTestExecution() {
    // Save first if unsaved ID
    if (!this.flowId) {
      this.flowService.saveFlow({
        name: this.flowName,
        triggerKeyword: this.triggerKeyword,
        nodes: this.nodes as any,
        connections: this.connections as any,
        status: 'ACTIVE'
      }).subscribe({
        next: (res) => {
          this.flowId = res.flow.id;
          this.executeTestCall();
        }
      });
    } else {
      this.executeTestCall();
    }
  }

  private executeTestCall() {
    if (!this.flowId) return;
    this.flowService.testFlow(this.flowId, this.testMessage).subscribe({
      next: (res) => {
        if (res.success) {
          this.testLogs.set(res.logs || []);
          this.cdr.markForCheck();
        }
      }
    });
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
