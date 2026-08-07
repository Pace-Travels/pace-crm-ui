import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FlowService, Flow } from '../../services/flow.service';

@Component({
  selector: 'app-flow-builder-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './flow-builder-view.html',
  styleUrl: './flow-builder-view.scss',
})
export class FlowBuilderView implements OnInit {
  flowService = inject(FlowService);
  router = inject(Router);

  activeTab = 'Your Flows';

  ngOnInit() {
    this.flowService.fetchFlows();
  }

  onToggleStatus(flow: Flow) {
    if (!flow.id) return;
    this.flowService.toggleFlow(flow.id).subscribe({
      next: () => this.flowService.fetchFlows()
    });
  }

  editFlow(flow: Flow) {
    if (flow.id) {
      this.router.navigate(['/flows/canvas', flow.id]);
    } else {
      this.router.navigate(['/flows/canvas']);
    }
  }
}
