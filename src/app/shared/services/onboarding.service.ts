import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { ProjectService } from '../../features/projects/services/project.service';
import { ApiService } from './api.service';

export interface ChecklistState {
  connectMeta: boolean;
  createTemplate: boolean;
  sendSoloMessage: boolean;
  sendBulkMessage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private projectService = inject(ProjectService);
  private api = inject(ApiService);
  
  private storageKey = 'quote_desks_onboarding_dismissed';

  // Signals
  checklistState = signal<ChecklistState>({
    connectMeta: false,
    createTemplate: false,
    sendSoloMessage: false,
    sendBulkMessage: false
  });

  isManualDismissed = signal<boolean>(false);
  showTour = signal<boolean>(false); // WABA Credentials setup modal
  showFeatureSpotlight = signal<boolean>(false); // Interactive Feature Spotlight Tour (Restart Tour)
  isLoadingStatus = signal<boolean>(false);

  // Computed Values
  progressPercentage = computed(() => {
    const s = this.checklistState();
    let completed = 0;
    if (s.connectMeta) completed++;
    if (s.createTemplate) completed++;
    if (s.sendSoloMessage) completed++;
    if (s.sendBulkMessage) completed++;
    return (completed / 4) * 100;
  });

  isChecklistVisible = computed(() => {
    if (this.isManualDismissed()) return false;
    if (this.progressPercentage() >= 100) return false;
    return true;
  });

  // Legacy helper for template backwards compatibility
  state = computed(() => {
    const s = this.checklistState();
    return {
      ...s,
      tourCompleted: !this.showTour()
    };
  });

  constructor() {
    // Load manual dismissal status
    const dismissed = localStorage.getItem(this.storageKey);
    if (dismissed === 'true') {
      this.isManualDismissed.set(true);
    }

    // Reactively fetch onboarding status whenever active project changes
    effect(() => {
      const proj = this.projectService.currentProject();
      if (proj && proj.id) {
        this.fetchOnboardingStatus(proj.id);
      }
    });
  }

  fetchOnboardingStatus(projectId: number | string) {
    this.isLoadingStatus.set(true);
    this.api.get<any>(`projects/${projectId}/onboarding-status`).subscribe({
      next: (res) => {
        this.isLoadingStatus.set(false);
        if (res && res.success && res.checklist) {
          this.checklistState.set({
            connectMeta: !!res.checklist.connectMeta,
            createTemplate: !!res.checklist.createTemplate,
            sendSoloMessage: !!res.checklist.sendSoloMessage,
            sendBulkMessage: !!res.checklist.sendBulkMessage
          });
        }
      },
      error: (err) => {
        this.isLoadingStatus.set(false);
        // Fallback: evaluate connectMeta status locally from current project
        const current = this.projectService.currentProject();
        const hasMeta = !!(current && current.wabaId && (current.phoneNumberId || current.phoneNumber) && current.accessToken);
        this.checklistState.update(prev => ({
          ...prev,
          connectMeta: hasMeta
        }));
      }
    });
  }

  dismissChecklist() {
    this.isManualDismissed.set(true);
    localStorage.setItem(this.storageKey, 'true');
  }

  updateChecklist(item: keyof ChecklistState, value: boolean) {
    const current = this.checklistState();
    this.checklistState.set({ ...current, [item]: value });
    
    // Refresh from DB to confirm
    const proj = this.projectService.currentProject();
    if (proj && proj.id) {
      this.fetchOnboardingStatus(proj.id);
    }
  }

  completeTour() {
    this.showTour.set(false);
  }

  openTour() {
    this.showTour.set(true);
  }

  openFeatureSpotlight() {
    this.showFeatureSpotlight.set(true);
  }

  closeFeatureSpotlight() {
    this.showFeatureSpotlight.set(false);
  }

  checkMetaStatus() {
    const proj = this.projectService.currentProject();
    if (proj && proj.id) {
      this.fetchOnboardingStatus(proj.id);
    }
  }
}
