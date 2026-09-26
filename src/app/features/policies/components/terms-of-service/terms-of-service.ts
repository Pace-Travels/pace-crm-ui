import { Component } from '@angular/core';

@Component({
  selector: 'app-terms-of-service',
  imports: [],
  templateUrl: './terms-of-service.html',
  styleUrl: './terms-of-service.scss',
})
export class TermsOfService {

  activeSection: string = 'intro';
  private observer!: IntersectionObserver;

  ngAfterViewInit(): void {
    // Intersection Observer setup
    const options = {
      root: null, // viewport window
      rootMargin: '-20% 0px -60% 0px', // Screen ke top-middle part par trigger karne ke liye
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.activeSection = entry.target.id;
        }
      });
    }, options);

    // Sabhi sections ko observe karein
    const sections = document.querySelectorAll('.tos-section');
    sections.forEach((section) => this.observer.observe(section));
  }

  // Smooth Scroll Function (Manual Click ke liye)
  scrollToSection(sectionId: string): void {
    this.activeSection = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  printPage(): void {
    window.print();
  }

  ngOnDestroy(): void {
    // Memory leak bachane ke liye observer disconnect karein
    if (this.observer) {
      this.observer.disconnect();
    }
  }

}
