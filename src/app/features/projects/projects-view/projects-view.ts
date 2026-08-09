import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../services/project.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

import { ApiService } from '../../../../shared/services/api.service';

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
  editingProjectId: number | null = null;
  showCreateForm = signal<boolean>(false);
  private router = inject(Router);
  private api = inject(ApiService);

  toggleCreateForm() {
    this.showCreateForm.set(!this.showCreateForm());
  }

  constructor(
    public projectService: ProjectService,
    private fb: FormBuilder
  ) {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      iconUrl: [''],
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

  editProject(project: any) {
    this.editingProjectId = project.id;
    this.projectForm.patchValue({
      name: project.name,
      iconUrl: project.iconUrl || '',
      phoneNumber: project.phoneNumber || '',
      phoneNumberId: project.phoneNumberId || '',
      wabaId: project.wabaId || '',
      accessToken: project.accessToken || '',
      testPhoneNumber: project.testPhoneNumber || ''
    });
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Open details tag if closed
    const details = document.querySelector('details');
    if (details && !details.open) {
      details.open = true;
    }
  }

  cancelEdit() {
    this.editingProjectId = null;
    this.projectForm.reset();
  }

  onCreateProject() {
    if (this.projectForm.invalid) {
      Swal.fire('Error', 'Please enter the brand name and all required WhatsApp Meta credentials configuration fields.', 'error');
      return;
    }
    const val = this.projectForm.value;
    const payload = {
      name: val.name,
      iconUrl: val.iconUrl || null,
      phoneNumber: val.phoneNumber || null,
      phoneNumberId: val.phoneNumberId,
      wabaId: val.wabaId,
      accessToken: val.accessToken,
      testPhoneNumber: val.testPhoneNumber || null
    };

    if (this.editingProjectId) {
      this.projectService.updateProject(this.editingProjectId, payload).subscribe({
        next: () => {
          this.projectForm.reset();
          this.editingProjectId = null;
          this.projectService.fetchProjects();
          Swal.fire('Updated', 'Brand Project updated successfully!', 'success');
        },
        error: (err: any) => {
          Swal.fire('Error', 'Failed to update project: ' + err.message, 'error');
        }
      });
    } else {
      this.projectService.createProject(payload).subscribe({
        next: () => {
          this.projectForm.reset();
          this.projectService.fetchProjects();
          Swal.fire('Registered', 'Brand Project and WhatsApp config registered successfully!', 'success');
        },
        error: (err: any) => {
          Swal.fire('Error', 'Failed to create project: ' + err.message, 'error');
        }
      });
    }
  }

  selectProject(proj: any) {
    this.projectService.setCurrentProject(proj);
  }

  openDeveloperDocs() {
    this.router.navigate(['/docs']);
  }

  // Meta SDK & WABA Selection State
  metaAccounts = signal<any[]>([]);
  showMetaModal = signal(false);
  metaAccessToken = signal<string>('');
  fbLoginStatus = signal<string>('unknown');

  checkLoginState() {
    if (typeof FB === 'undefined') {
      Swal.fire('SDK Loading', 'Facebook SDK is initializing. Please wait a moment and try again.', 'info');
      return;
    }

    FB.getLoginStatus((response: any) => {
      this.statusChangeCallback(response);
    });
  }

  statusChangeCallback(response: any) {
    if (!response) return;

    this.fbLoginStatus.set(response.status || 'unknown');

    if (response.status === 'connected' && response.authResponse) {
      const token = response.authResponse.accessToken;
      this.metaAccessToken.set(token);
      this.fetchMetaAccounts(token);
    } else if (response.status === 'not_authorized') {
      this.promptFacebookLogin();
    } else {
      this.promptFacebookLogin();
    }
  }

  promptFacebookLogin() {
    if (typeof FB === 'undefined') return;

    FB.login((response: any) => {
      if (response.status === 'connected' && response.authResponse) {
        const token = response.authResponse.accessToken;
        this.metaAccessToken.set(token);
        this.fetchMetaAccounts(token);
      } else {
        Swal.fire('Facebook Connection', 'Please log in and authorize Pace Messenger to connect your WhatsApp Business accounts.', 'info');
      }
    }, {
      scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging'
    });
  }

  connectWithFacebook() {
    this.api.get('/config/public').subscribe({
      next: (res: any) => {
        const appId = res?.metaAppId;
        if (!appId || appId === '109841289150123' || appId.includes('YOUR_ACTUAL_APP_ID')) {
          Swal.fire({
            icon: 'warning',
            title: 'Meta App ID Required',
            html: `META_APP_ID is not configured in backend <code>.env</code> file.<br><br>Please set <b>META_APP_ID</b> in backend <code>.env</code>.`
          });
          return;
        }

        if (typeof FB !== 'undefined' && FB && FB.init) {
          FB.init({
            appId: appId,
            cookie: true,
            autoLogAppEvents: true,
            xfbml: true,
            version: 'v19.0'
          });
        }
        this.checkLoginState();
      },
      error: () => this.checkLoginState()
    });
  }

  fetchMetaAccounts(accessToken: string) {
    Swal.fire({
      title: 'Syncing Meta WABA Accounts...',
      text: 'Querying Facebook Graph API for your WhatsApp Business Projects.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.projectService.metaAuth(accessToken).subscribe({
      next: (res: any) => {
        Swal.close();
        if (res.success && res.accounts && res.accounts.length > 0) {
          this.metaAccounts.set(res.accounts);
          this.showMetaModal.set(true);
          this.projectService.fetchProjects();
          Swal.fire('Meta Projects Pulled!', `Found ${res.accounts.length} WhatsApp Business Account(s). Select which project to activate below.`, 'success');
        } else {
          Swal.fire('No Accounts Found', 'No WhatsApp Business Accounts found attached to this Facebook account.', 'info');
        }
      },
      error: (err) => {
        Swal.close();
        Swal.fire('Meta Auth Error', err.error?.error || 'Failed to pull Meta projects.', 'error');
      }
    });
  }

  selectMetaAccountToConnect(acc: any) {
    this.projectForm.patchValue({
      name: acc.name,
      phoneNumber: acc.phoneNumber,
      phoneNumberId: acc.phoneNumberId,
      wabaId: acc.wabaId,
      accessToken: this.metaAccessToken() || 'EAAG...MetaToken'
    });

    this.showMetaModal.set(false);
    Swal.fire('Meta Details Auto-Filled', `Project credentials for "${acc.name}" auto-filled into form. Click "Register Brand Project" to complete setup.`, 'success');
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
