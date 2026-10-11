import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  inject,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { ThemeService } from '../../../../shared/services/theme.service';

@Component({
  selector: 'app-three-globe-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `<div #canvasContainer class="three-canvas-container"></div>`,
  styleUrl: './three-globe-canvas.scss'
})
export class ThreeGlobeCanvas implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  private themeService = inject(ThemeService);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private resizeObserver!: ResizeObserver;
  private intersectionObserver!: IntersectionObserver;
  private isVisible = true;

  // Globe & Animation objects
  private globeGroup = new THREE.Group();
  private particlePoints!: THREE.Points;
  private outerAtmosphere!: THREE.Mesh;
  private pulseParticlesMesh!: THREE.Points;
  private arcLinesGroup = new THREE.Group();

  private pulseData: Array<{
    curve: THREE.CubicBezierCurve3;
    speed: number;
    progress: number;
  }> = [];

  // Mouse interaction
  private targetRotationX = 0;
  private targetRotationY = 0;
  private mouseX = 0;
  private mouseY = 0;

  constructor() {
    effect(() => {
      const isDark = this.themeService.currentTheme() === 'dark';
      this.updateColorsForTheme(isDark);
    });
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.initThree();
    this.createGlobeParticles();
    this.createAtmosphere();
    this.createMessageArcs();
    this.setupListeners();
    this.animate();
  }

  private initThree() {
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 650;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 11.5);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.appendChild(this.renderer.domElement);
    this.scene.add(this.globeGroup);
  }

  private createGlobeParticles() {
    const particleCount = 2800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const radius = 4.2;

    const baseColor = new THREE.Color(
      this.themeService.currentTheme() === 'dark' ? 0x38bdf8 : 0x444ce7
    );

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const shade = baseColor.clone().multiplyScalar(0.7 + Math.random() * 0.5);
      colors[i * 3] = shade.r;
      colors[i * 3 + 1] = shade.g;
      colors[i * 3 + 2] = shade.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const isDark = this.themeService.currentTheme() === 'dark';
    const material = new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.9 : 0.85,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending
    });

    this.particlePoints = new THREE.Points(geometry, material);
    this.globeGroup.add(this.particlePoints);
  }

  private createAtmosphere() {
    const isDark = this.themeService.currentTheme() === 'dark';
    const geometry = new THREE.SphereGeometry(4.35, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: isDark ? 0x818cf8 : 0x2563eb,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.08 : 0.05
    });

    this.outerAtmosphere = new THREE.Mesh(geometry, material);
    this.globeGroup.add(this.outerAtmosphere);
  }

  private createMessageArcs() {
    const arcCount = 14;
    const radius = 4.2;
    this.globeGroup.add(this.arcLinesGroup);

    const isDark = this.themeService.currentTheme() === 'dark';
    const pulsePositions: number[] = [];

    for (let i = 0; i < arcCount; i++) {
      const phi1 = Math.random() * Math.PI;
      const theta1 = Math.random() * Math.PI * 2;
      const start = new THREE.Vector3(
        radius * Math.sin(phi1) * Math.cos(theta1),
        radius * Math.sin(phi1) * Math.sin(theta1),
        radius * Math.cos(phi1)
      );

      const phi2 = Math.random() * Math.PI;
      const theta2 = Math.random() * Math.PI * 2;
      const end = new THREE.Vector3(
        radius * Math.sin(phi2) * Math.cos(theta2),
        radius * Math.sin(phi2) * Math.sin(theta2),
        radius * Math.cos(phi2)
      );

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      mid.normalize().multiplyScalar(radius + dist * 0.35);

      const curve = new THREE.CubicBezierCurve3(start, mid, mid, end);
      const points = curve.getPoints(40);
      const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);

      const arcMaterial = new THREE.LineBasicMaterial({
        color: isDark ? (i % 2 === 0 ? 0x38bdf8 : 0x34d399) : (i % 2 === 0 ? 0x2563eb : 0x059669),
        transparent: true,
        opacity: isDark ? 0.6 : 0.45
      });

      const line = new THREE.Line(arcGeometry, arcMaterial);
      this.arcLinesGroup.add(line);

      this.pulseData.push({
        curve,
        speed: 0.004 + Math.random() * 0.006,
        progress: Math.random()
      });

      const p = curve.getPoint(0);
      pulsePositions.push(p.x, p.y, p.z);
    }

    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.Float32BufferAttribute(pulsePositions, 3));
    const pulseMat = new THREE.PointsMaterial({
      color: isDark ? 0x34d399 : 0x10b981,
      size: 0.18,
      transparent: true,
      opacity: 0.95,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending
    });

    this.pulseParticlesMesh = new THREE.Points(pulseGeo, pulseMat);
    this.globeGroup.add(this.pulseParticlesMesh);
  }

  private setupListeners() {
    const container = this.canvasContainer.nativeElement;

    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

      this.targetRotationY = this.mouseX * 0.35;
      this.targetRotationX = this.mouseY * 0.25;
    });

    this.resizeObserver = new ResizeObserver(() => {
      if (!container || !this.renderer || !this.camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 650;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.resizeObserver.observe(container);

    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting;
    });
    this.intersectionObserver.observe(container);
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    if (!this.isVisible) return;

    this.globeGroup.rotation.y += 0.002;
    this.globeGroup.rotation.y += (this.targetRotationY - this.globeGroup.rotation.y) * 0.03;
    this.globeGroup.rotation.x += (this.targetRotationX - this.globeGroup.rotation.x) * 0.03;

    if (this.pulseParticlesMesh) {
      const positions = this.pulseParticlesMesh.geometry.attributes['position'].array as Float32Array;

      this.pulseData.forEach((pd, idx) => {
        pd.progress = (pd.progress + pd.speed) % 1.0;
        const pt = pd.curve.getPoint(pd.progress);
        positions[idx * 3] = pt.x;
        positions[idx * 3 + 1] = pt.y;
        positions[idx * 3 + 2] = pt.z;
      });

      this.pulseParticlesMesh.geometry.attributes['position'].needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateColorsForTheme(isDark: boolean) {
    if (!this.particlePoints) return;

    const baseColor = new THREE.Color(isDark ? 0x38bdf8 : 0x444ce7);
    const count = this.particlePoints.geometry.attributes['color'].count;
    const colors = this.particlePoints.geometry.attributes['color'].array as Float32Array;

    for (let i = 0; i < count; i++) {
      const shade = baseColor.clone().multiplyScalar(0.7 + Math.random() * 0.5);
      colors[i * 3] = shade.r;
      colors[i * 3 + 1] = shade.g;
      colors[i * 3 + 2] = shade.b;
    }

    this.particlePoints.geometry.attributes['color'].needsUpdate = true;

    const ptMat = this.particlePoints.material as THREE.PointsMaterial;
    ptMat.opacity = isDark ? 0.9 : 0.85;
    ptMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;

    if (this.outerAtmosphere) {
      const mat = this.outerAtmosphere.material as THREE.MeshBasicMaterial;
      mat.color.setHex(isDark ? 0x818cf8 : 0x2563eb);
      mat.opacity = isDark ? 0.08 : 0.05;
    }

    if (this.pulseParticlesMesh) {
      const pulseMat = this.pulseParticlesMesh.material as THREE.PointsMaterial;
      pulseMat.color.setHex(isDark ? 0x34d399 : 0x10b981);
      pulseMat.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    }
  }

  public updateScrollProgress(progress: number) {
    if (this.globeGroup) {
      this.globeGroup.position.y = -progress * 1.5;
      this.globeGroup.scale.setScalar(1 + progress * 0.2);
    }
  }

  ngOnDestroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
