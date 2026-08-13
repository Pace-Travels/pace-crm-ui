import { Injectable, signal, computed, inject } from '@angular/core';
import { ProjectService } from '../../features/projects/services/project.service';

export interface ChecklistState {
  connectMeta: boolean;
  createTemplate: boolean;
  sendSoloMessage: boolean;
  sendBulkMessage: boolean;
  tourCompleted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private projectService = inject(ProjectService);
  
  private storageKey = 'pace_crm_onboarding_state';
  
  // Default State
  private defaultState: ChecklistState = {
    connectMeta: false,
    createTemplate: false,
    sendSoloMessage: false,
    sendBulkMessage: false,
    tourCompleted: false
  };

  state = signal<ChecklistState>(this.defaultState);
  showTour = signal<boolean>(false);

  // Computed Values
  progressPercentage = computed(() => {
    const s = this.state();
    let completed = 0;
    if (s.connectMeta) completed++;
    if (s.createTemplate) completed++;
    if (s.sendSoloMessage) completed++;
    if (s.sendBulkMessage) completed++;
    return (completed / 4) * 100;
  });

  constructor() {
    this.loadState();
    
    // Auto-check for Meta credentials based on active project
    const current = this.projectService.currentProject();
    if (current && current.wabaId && current.phoneNumberId && current.accessToken) {
      this.updateChecklist('connectMeta', true);
    }
    
    // Auto show tour if not completed
    if (!this.state().tourCompleted) {
      this.showTour.set(true);
    }
  }

  private loadState() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.state.set({ ...this.defaultState, ...JSON.parse(stored) });
      } catch (e) {
        console.error("Error parsing onboarding state from local storage", e);
      }
    }
  }

  private saveState(newState: ChecklistState) {
    this.state.set(newState);
    localStorage.setItem(this.storageKey, JSON.stringify(newState));
  }

  updateChecklist(item: keyof ChecklistState, value: boolean) {
    const currentState = this.state();
    if (currentState[item] !== value) {
      this.saveState({ ...currentState, [item]: value });
    }
  }

  completeTour() {
    this.updateChecklist('tourCompleted', true);
    this.showTour.set(false);
  }

  openTour() {
    this.showTour.set(true);
  }

  checkMetaStatus() {
    const current = this.projectService.currentProject();
    const hasCreds = !!(current && current.wabaId && current.phoneNumberId && current.accessToken);
    this.updateChecklist('connectMeta', hasCreds);
  }
}
