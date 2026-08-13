import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OnboardingService } from '../../services/onboarding.service';
import { ProjectService } from '../../../features/projects/services/project.service';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-product-tour',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-tour.html',
  styleUrl: './product-tour.scss'
})
export class ProductTourModalComponent implements OnInit {
  onboardingService = inject(OnboardingService);
  projectService = inject(ProjectService);
  api = inject(ApiService);
  fb = inject(FormBuilder);

  currentStep = signal<number>(1);
  totalSteps = 3;

  waForm: FormGroup;
  isSaving = signal<boolean>(false);

  constructor() {
    this.waForm = this.fb.group({
      wabaId: ['', Validators.required],
      phoneNumberId: ['', Validators.required],
      accessToken: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const proj = this.projectService.currentProject();
    if (proj) {
      this.waForm.patchValue({
        wabaId: proj.wabaId || '',
        phoneNumberId: proj.phoneNumberId || '',
        accessToken: proj.accessToken || ''
      });
    }
  }

  nextStep() {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
    } else {
      this.finishTour();
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  finishTour() {
    this.onboardingService.completeTour();
  }

  skipTour() {
    this.onboardingService.completeTour();
  }

  saveWaCredentials() {
    if (this.waForm.invalid) {
      Swal.fire('Error', 'Please fill in all WhatsApp API fields.', 'error');
      return;
    }

    const proj = this.projectService.currentProject();
    if (!proj) {
      Swal.fire('Error', 'No active project found to save credentials.', 'error');
      return;
    }

    this.isSaving.set(true);
    const payload = this.waForm.value;

    this.api.put(`/projects/${proj.id}`, payload).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        // Update project in service
        this.projectService.fetchProjects();
        this.onboardingService.updateChecklist('connectMeta', true);
        
        Swal.fire({
          title: 'Connected!',
          text: 'Meta WhatsApp credentials saved successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        this.nextStep();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        Swal.fire('Error', 'Failed to save credentials: ' + (err.error?.error || err.message), 'error');
      }
    });
  }
}
