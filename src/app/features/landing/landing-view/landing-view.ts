import { Component, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';

@Component({
  selector: 'app-landing-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-view.html',
  styleUrl: './landing-view.scss',
})
export class LandingView implements AfterViewInit {
  
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    gsap.from(this.el.nativeElement.querySelector('.hero-title'), { duration: 1, y: 50, opacity: 0, ease: 'power3.out', delay: 0.1 });
    gsap.from(this.el.nativeElement.querySelector('.hero-subtitle'), { duration: 1, y: 30, opacity: 0, ease: 'power3.out', delay: 0.3 });
    gsap.from(this.el.nativeElement.querySelector('.hero-cta'), { duration: 1, y: 20, opacity: 0, ease: 'power3.out', delay: 0.5 });
    gsap.from(this.el.nativeElement.querySelector('.hero-image-container'), { duration: 1.2, scale: 0.95, opacity: 0, ease: 'power3.out', delay: 0.7 });
    
    const featureRows = this.el.nativeElement.querySelectorAll('.feature-row');
    featureRows.forEach((row: any, i: number) => {
      gsap.from(row, {
        duration: 1,
        y: 50,
        opacity: 0,
        ease: 'power3.out',
        delay: i * 0.2 + 0.5
      });
    });
  }
}
