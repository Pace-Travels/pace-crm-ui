import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../services/project.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

declare var FB: any;

@Component({
  selector: 'app-projects-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './projects-view.html',
  styleUrl: './projects-view.scss',
})
export class ProjectsView implements OnInit {
  projectForm: FormGroup;
  userName = 'User';
  private router = inject(Router);

  constructor(
    public projectService: ProjectService,
    private fb: FormBuilder
  ) {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      phoneNumber: [''],
      phoneNumberId: ['', Validators.required],
      wabaId: ['', Validators.required],
      accessToken: ['', Validators.required],
      testPhoneNumber: ['']
    });
  }

  ngOnInit() {
    this.projectService.fetchProjects();
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.name) {
          this.userName = user.name;
        }
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }

  onCreateProject() {
    if (this.projectForm.invalid) {
      alert("Please enter the brand name and all required WhatsApp Meta credentials configuration fields.");
      return;
    }
    const val = this.projectForm.value;
    const payload = {
      name: val.name,
      phoneNumber: val.phoneNumber || null,
      phoneNumberId: val.phoneNumberId,
      wabaId: val.wabaId,
      accessToken: val.accessToken,
      testPhoneNumber: val.testPhoneNumber || null
    };

    this.projectService.createProject(payload).subscribe({
      next: () => {
        this.projectForm.reset();
        this.projectService.fetchProjects();
        alert("Brand Project and WhatsApp config registered successfully!");
      },
      error: (err: any) => {
        alert("Failed to create project: " + err.message);
      }
    });
  }

  selectProject(proj: any) {
    this.projectService.setCurrentProject(proj);
  }

  openDeveloperDocs() {
    this.router.navigate(['/docs']);
  }

  connectWithFacebook() {
    if (typeof FB === 'undefined') {
      Swal.fire('Error', 'Facebook SDK is not loaded yet. Please ensure you have added a valid Meta App ID in index.html and have internet connectivity.', 'error');
      return;
    }

    FB.login((response: any) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        
        Swal.fire({
          title: 'Fetching WABA Accounts...',
          text: 'Please wait while we sync your Meta accounts.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.projectService.metaAuth(accessToken).subscribe({
          next: (res: any) => {
            Swal.close();
            if (res.success && res.accounts && res.accounts.length > 0) {
              // Usually here we would show a modal to let the user select which account/phone number to import.
              // For simplicity, we just notify the user that we fetched the accounts.
              Swal.fire('Success', `Successfully pulled ${res.accounts.length} WhatsApp accounts! They are now available.`, 'success');
              this.projectService.fetchProjects(); // Refresh if backend auto-created projects
            } else {
              Swal.fire('Notice', 'No WhatsApp Business Accounts found in this Facebook account.', 'info');
            }
          },
          error: (err) => {
            Swal.close();
            Swal.fire('Error', err.error?.error || 'Failed to sync with Meta.', 'error');
          }
        });

      } else {
        Swal.fire('Cancelled', 'Facebook login was cancelled.', 'info');
      }
    }, {
      // For embedded signup: config_id is required usually, but scopes are fallback.
      scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging'
    });
  }

  detachConfig(projectId: number, event: Event) {
    event.stopPropagation();
    Swal.fire({
      title: 'Detach WhatsApp Account?',
      text: 'This project will lose its messaging capabilities until a new account is connected.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Detach'
    }).then((result) => {
      if (result.isConfirmed) {
        this.projectService.detachConfig(projectId).subscribe({
          next: () => {
            Swal.fire('Detached!', 'The WhatsApp account has been removed from this project.', 'success');
            this.projectService.fetchProjects();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.error || 'Failed to detach account', 'error');
          }
        });
      }
    });
  }
}
