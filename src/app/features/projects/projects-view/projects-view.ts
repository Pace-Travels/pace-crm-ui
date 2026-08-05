import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../services/project.service';

@Component({
  selector: 'app-projects-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './projects-view.html',
  styleUrl: './projects-view.scss',
})
export class ProjectsView implements OnInit {
  projectForm: FormGroup;
  userName = 'Ismail'; // Fallback userName

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
    const storedUser = localStorage.getItem('userName');
    if (storedUser) this.userName = storedUser;
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
}
