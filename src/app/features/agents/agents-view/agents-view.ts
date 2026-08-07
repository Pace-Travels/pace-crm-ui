import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AgenticApiService } from '../services/agentic-api.service';

declare var Swal: any;

@Component({
  selector: 'app-agents-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agents-view.html',
  styleUrl: './agents-view.scss',
})
export class AgentsView implements OnInit {
  agenticApi = inject(AgenticApiService);
  fb = inject(FormBuilder);

  activeTab = 'autopilot';
  selectedScanCity = 'Dubai';

  // Website crawler setup modal
  showCrawlerModal = signal(false);
  crawlerForm: FormGroup;

  constructor() {
    this.crawlerForm = this.fb.group({
      websiteUrl: ['', Validators.required],
      businessContext: ['Pace Travels Official Agency Desk'],
      agentName: ['Aria (Travel Concierge AI)'],
      greetingMessage: ['Hello! Welcome to Pace Travels. How can I help you book your holiday today?']
    });
  }

  ngOnInit() {
    this.agenticApi.fetchAutopilotStatus().subscribe();
    this.agenticApi.fetchRFMSegments().subscribe();
  }

  toggleAutopilotState(enabled: boolean) {
    this.agenticApi.toggleAutopilot(enabled).subscribe({
      next: () => {
        const msg = enabled ? 'Agentic AI Autopilot ACTIVATED! Event radar will be scanned autonomously.' : 'Autopilot PAUSED.';
        this.showAlert(enabled ? 'Autopilot Active' : 'Autopilot Paused', msg, enabled ? 'success' : 'info');
      }
    });
  }

  changeAutopilotMode(mode: string) {
    const currentEnabled = this.agenticApi.autopilotStatus()?.enabled ?? true;
    this.agenticApi.toggleAutopilot(currentEnabled, mode).subscribe({
      next: () => {
        this.showAlert('Autopilot Mode Updated', `Agent execution mode changed to ${mode}.`, 'success');
      }
    });
  }

  triggerManualScan() {
    this.agenticApi.runAutonomousScan(this.selectedScanCity).subscribe({
      next: (res) => {
        this.showAlert('Autonomous Scan Complete', `Scanned ${res.eventsScanned} events in ${res.scannedCity}. Created ${res.actionsTriggered.length} AI campaign actions!`, 'success');
      },
      error: () => this.showAlert('Scan Error', 'Failed to run autonomous event scan.', 'error')
    });
  }

  triggerCohortBroadcast(cohortName: string) {
    this.showAlert(
      'Targeting Cohort',
      `Launching WhatsApp Event Broadcast to segment "${cohortName}" via Meta Cloud API.`,
      'success'
    );
  }

  private showAlert(title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({ title, text, icon, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    } else {
      alert(`${title}: ${text}`);
    }
  }
}
