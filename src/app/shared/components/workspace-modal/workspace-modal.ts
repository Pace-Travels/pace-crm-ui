import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, Project } from '../../../features/projects/services/project.service';

@Component({
  selector: 'app-workspace-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-modal.html',
  styleUrl: './workspace-modal.scss',
})
export class WorkspaceModalComponent {
  projectService = inject(ProjectService);

  isOpen = signal<boolean>(false);
  searchQuery = signal<string>('');

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'W' || event.key === 'w')) {
      event.preventDefault();
      this.toggleModal();
    }
  }

  openModal() {
    this.searchQuery.set('');
    this.isOpen.set(true);
    if (this.projectService.projects().length === 0) {
      this.projectService.fetchProjects();
    }
  }

  closeModal() {
    this.isOpen.set(false);
  }

  toggleModal() {
    if (this.isOpen()) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  filteredProjects = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.projectService.projects();
    if (!query) return list;

    return list.filter((p: any) => {
      const name = (p.name || '').toLowerCase();
      const phone = (p.phoneNumber || p.testPhoneNumber || '').toLowerCase();
      const waba = (p.wabaId || '').toLowerCase();
      const phoneId = (p.phoneNumberId || p.testPhoneNumberId || '').toLowerCase();
      return name.includes(query) || phone.includes(query) || waba.includes(query) || phoneId.includes(query);
    });
  });

  selectProject(project: Project) {
    this.closeModal();
    if (this.projectService.currentProject()?.id !== project.id) {
      this.projectService.setCurrentProject(project);
    }
  }

  getAvatarInitial(name?: string): string {
    if (!name) return 'W';
    return name.charAt(0).toUpperCase();
  }

  formatPhone(raw?: string): string {
    if (!raw) return 'No Phone Line';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return `+${digits}`;
  }
}
