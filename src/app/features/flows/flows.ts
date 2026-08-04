import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowSidebar } from './components/flow-sidebar/flow-sidebar';
import { FlowBuilderView } from './components/flow-builder-view/flow-builder-view';

@Component({
  selector: 'app-flows',
  standalone: true,
  imports: [CommonModule, FlowSidebar, FlowBuilderView],
  templateUrl: './flows.html',
  styleUrl: './flows.scss',
})
export class Flows {}
