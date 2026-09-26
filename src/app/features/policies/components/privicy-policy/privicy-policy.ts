import { AfterViewInit, Component, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-privicy-policy',
  imports: [],
  templateUrl: './privicy-policy.html',
  styleUrl: './privicy-policy.scss',
})
export class PrivicyPolicy implements AfterViewInit, OnDestroy {

  activeSection: string = 'sec-1';
  private observer!: IntersectionObserver;

  ngAfterViewInit(): void {
    const options = {
      root: null,
      rootMargin: '-15% 0px -60% 0px',
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.activeSection = entry.target.id;
        }
      });
    }, options);

    const sections = document.querySelectorAll('.doc-section');
    sections.forEach((sec) => this.observer.observe(sec));
  }

  scrollTo(sectionId: string): void {
    this.activeSection = sectionId;
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  printPolicy(): void {
    window.print();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

}
