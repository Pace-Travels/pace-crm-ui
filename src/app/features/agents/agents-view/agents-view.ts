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
  showCreateAgentModal = signal(false);

  crawlerForm: FormGroup;
  agentForm: FormGroup;

  // Active AI Agents List
  agentsList = signal<any[]>([
    {
      id: 1,
      name: 'Aria (24/7 Travel Concierge AI)',
      role: 'Travel Booking Assistant',
      model: 'Gemini 1.5 Flash',
      status: 'Active',
      icon: '🤖',
      color: '#10b981',
      description: 'Handles incoming WhatsApp inquiries, quotes flight & hotel packages, and collects booking deposits.',
      assignedGroup: 'B2C (Pace Travels)'
    },
    {
      id: 2,
      name: 'Radar-X Event Autopilot Agent',
      role: 'Autonomous Campaign Engine',
      model: 'Agentic AI Autopilot',
      status: 'Active',
      icon: '⚡',
      color: '#f59e0b',
      description: 'Scans high-surge concerts/marathons via SERP API, builds RFM cohorts, and triggers WhatsApp broadcasts.',
      assignedGroup: 'High Spenders & VIP'
    },
    {
      id: 3,
      name: 'Pace B2B Quotation Specialist',
      role: 'B2B Tourism Agent Assistant',
      model: 'OpenAI GPT-4o',
      status: 'Active',
      icon: '💼',
      color: '#3b82f6',
      description: 'Instantly calculates group tour prices and issues B2B proforma invoices for travel agents.',
      assignedGroup: 'B2B (Pace Tourism)'
    }
  ]);

  constructor() {
    this.crawlerForm = this.fb.group({
      websiteUrl: ['', Validators.required],
      businessContext: ['Pace Travels Official Agency Desk'],
      agentName: ['Aria (Travel Concierge AI)'],
      greetingMessage: ['Hello! Welcome to Pace Travels. How can I help you book your holiday today?']
    });

    this.agentForm = this.fb.group({
      name: ['', Validators.required],
      role: ['Customer Concierge', Validators.required],
      model: ['Gemini 1.5 Flash', Validators.required],
      assignedGroup: ['B2C (Pace Travels)', Validators.required],
      personaPrompt: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.agenticApi.fetchAutopilotStatus().subscribe();
    this.agenticApi.fetchRFMSegments().subscribe();
  }

  openCreateAgentModal() {
    this.showCreateAgentModal.set(true);
  }

  closeCreateAgentModal() {
    this.showCreateAgentModal.set(false);
  }

  submitCreateAgent() {
    if (this.agentForm.invalid) {
      this.showAlert('Required Fields', 'Please complete all required fields to register your AI agent.', 'warning');
      return;
    }

    const val = this.agentForm.value;
    const newAgent = {
      id: Date.now(),
      name: val.name,
      role: val.role,
      model: val.model,
      status: 'Active',
      icon: '🤖',
      color: '#10b981',
      description: val.personaPrompt,
      assignedGroup: val.assignedGroup
    };

    this.agentsList.set([newAgent, ...this.agentsList()]);
    this.agentForm.reset({ model: 'Gemini 1.5 Flash', role: 'Customer Concierge', assignedGroup: 'B2C (Pace Travels)' });
    this.closeCreateAgentModal();
    this.showAlert('Agent Created!', `AI Agent "${val.name}" has been registered and activated.`, 'success');
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
    Swal.fire({ title, text, icon, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
