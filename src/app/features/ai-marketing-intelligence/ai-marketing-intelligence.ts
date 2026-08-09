import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../projects/services/project.service';
import { AIMarketingIntelligenceService } from './services/ai-marketing-intelligence.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ai-marketing-intelligence',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ai-marketing-intelligence.html',
  styleUrl: './ai-marketing-intelligence.scss'
})
export class AIMarketingIntelligence implements OnInit {
  router = inject(Router);
  projectService = inject(ProjectService);
  private intelligenceService = inject(AIMarketingIntelligenceService);
  private fb = inject(FormBuilder);

  // Active Navigation Submodule Tab
  activeSubmodule = signal<string>('DASHBOARD'); 
  // Options: DASHBOARD | COMPETITORS | META_ADS | WHATSAPP_STUDIO | FACEBOOK_STUDIO | DEMAND | GEOGRAPHY | ANALYZER | RECOMMENDATIONS | ALERTS | REPORTS | SETTINGS

  isLoading = signal<boolean>(false);

  // Overview Data Signals
  summaryMetrics = signal<any>({
    demandScore: 86,
    competitionScore: 68,
    opportunityScore: 89,
    activeCompetitorsCount: 5,
    trackedMetaAdsCount: 12,
    unreadAlertsCount: 3
  });

  competitors = signal<any[]>([]);
  metaAds = signal<any[]>([]);
  demandSignals = signal<any[]>([]);
  geographyData = signal<any[]>([]);
  recommendations = signal<any[]>([]);
  alerts = signal<any[]>([]);
  settings = signal<any>({});

  // Filter Signals
  adCategoryFilter = signal<string>('ALL');
  competitorSearch = signal<string>('');
  metaAdSearch = signal<string>('');

  // WhatsApp Studio State & Form
  whatsappForm: FormGroup;
  whatsappStudioResult = signal<any>(null);
  isGeneratingWhatsapp = signal<boolean>(false);

  // Facebook Studio State & Form
  facebookForm: FormGroup;
  facebookStudioResult = signal<any>(null);
  isGeneratingFacebook = signal<boolean>(false);

  // Competitor Discovery State
  showDiscoveryModal = signal<boolean>(false);
  discoveryQuery = signal<string>('');
  discoveryCity = signal<string>('');
  discoveryState = signal<string>('');
  discoveryCountry = signal<string>('India');
  discoveredResults = signal<any[]>([]);
  isDiscovering = signal<boolean>(false);

  // Manual Add Competitor Modal State & Form
  showAddCompetitorModal = signal<boolean>(false);
  addCompetitorForm: FormGroup;
  isSavingCompetitor = signal<boolean>(false);

  // Agentic Analysis Trigger State
  isAnalyzingMarket = signal<boolean>(false);

  // Competitor Pattern Analysis State
  selectedCompetitorAnalysis = signal<any>(null);
  showAnalysisModal = signal<boolean>(false);
  isAnalyzingPattern = signal<boolean>(false);

  constructor() {
    this.whatsappForm = this.fb.group({
      destination: ['Dubai', Validators.required],
      budget: ['Mid-High'],
      duration: ['3 Days'],
      tone: ['Urgent & Premium'],
      language: ['English'],
      targetAudience: ['Families & Travel Enthusiasts']
    });

    this.facebookForm = this.fb.group({
      destination: ['Dubai', Validators.required],
      objective: ['Lead Generation'],
      audience: ['Families & Honeymoon Couples'],
      budget: ['$50/day']
    });

    this.addCompetitorForm = this.fb.group({
      companyName: ['', Validators.required],
      websiteUrl: [''],
      city: [''],
      state: [''],
      country: ['India'],
      targetDestinations: ['Dubai, Thailand, Europe'],
      googleRating: [4.5],
      reviewCount: [100],
      activeAdsCount: [10],
      aggressionScore: [75]
    });
  }

  ngOnInit() {
    this.loadOverviewData();
  }

  loadOverviewData() {
    this.isLoading.set(true);
    this.intelligenceService.getOverview().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const d = res.data;
          this.summaryMetrics.set(d.summaryMetrics || {});
          this.competitors.set(d.topCompetitors || []);
          this.demandSignals.set(d.demandSignals || []);
          this.metaAds.set(d.metaAds || []);
          this.recommendations.set(d.recommendations || []);
          this.alerts.set(d.alerts || []);
          if (d.settings) this.settings.set(d.settings);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    this.intelligenceService.getGeographyIntelligence().subscribe({
      next: (res: any) => {
        if (res.success && res.data) this.geographyData.set(res.data);
      }
    });
  }

  // Filtered Meta Ads Computation
  filteredMetaAds = computed(() => {
    let list = this.metaAds();
    const cat = this.adCategoryFilter();
    const q = this.metaAdSearch().toLowerCase().trim();

    if (cat !== 'ALL') {
      list = list.filter(a => a.category?.toLowerCase() === cat.toLowerCase());
    }

    if (q) {
      list = list.filter(a =>
        a.advertiserName.toLowerCase().includes(q) ||
        a.headline?.toLowerCase().includes(q) ||
        a.adCopy?.toLowerCase().includes(q)
      );
    }

    return list;
  });

  // Filtered Competitors Computation
  filteredCompetitors = computed(() => {
    let list = this.competitors();
    const q = this.competitorSearch().toLowerCase().trim();

    if (q) {
      list = list.filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q)
      );
    }

    return list;
  });

  // Studio: Generate WhatsApp Status Campaign
  generateWhatsappCampaign() {
    if (this.whatsappForm.invalid) return;
    this.isGeneratingWhatsapp.set(true);
    this.intelligenceService.generateWhatsappStatus(this.whatsappForm.value).subscribe({
      next: (res: any) => {
        this.isGeneratingWhatsapp.set(false);
        if (res.success && res.data) {
          this.whatsappStudioResult.set(res.data);
          Swal.fire({
            title: 'WhatsApp Status Sequence Ready!',
            text: 'AI generated multi-part story sequence & video script.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      },
      error: (err: any) => {
        this.isGeneratingWhatsapp.set(false);
        Swal.fire('Error', 'Generation failed: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  // Studio: Generate Facebook Campaign Concept
  generateFacebookCampaign() {
    if (this.facebookForm.invalid) return;
    this.isGeneratingFacebook.set(true);
    this.intelligenceService.generateFacebookCampaign(this.facebookForm.value).subscribe({
      next: (res: any) => {
        this.isGeneratingFacebook.set(false);
        if (res.success && res.data) {
          this.facebookStudioResult.set(res.data);
          Swal.fire({
            title: 'Meta Campaign Concept Ready!',
            text: 'Original ad copy, headlines & audience suggestions created.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      },
      error: (err: any) => {
        this.isGeneratingFacebook.set(false);
        Swal.fire('Error', 'Generation failed: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  // Competitor Discovery Modal Handler
  openDiscoveryModal() {
    this.showDiscoveryModal.set(true);
  }

  closeDiscoveryModal() {
    this.showDiscoveryModal.set(false);
  }

  searchCompetitors() {
    this.isDiscovering.set(true);
    const params = {
      query: this.discoveryQuery(),
      city: this.discoveryCity(),
      state: this.discoveryState(),
      country: this.discoveryCountry()
    };

    this.intelligenceService.discoverCompetitors(params).subscribe({
      next: (res: any) => {
        this.isDiscovering.set(false);
        if (res.success && res.data) {
          this.discoveredResults.set(res.data);
        }
      },
      error: () => this.isDiscovering.set(false)
    });
  }

  // Add Competitor Modal Handlers
  openAddCompetitorModal() {
    this.addCompetitorForm.reset({
      country: 'India',
      googleRating: 4.5,
      reviewCount: 100,
      activeAdsCount: 10,
      aggressionScore: 75
    });
    this.showAddCompetitorModal.set(true);
  }

  closeAddCompetitorModal() {
    this.showAddCompetitorModal.set(false);
  }

  saveCompetitor() {
    if (this.addCompetitorForm.invalid) return;
    this.isSavingCompetitor.set(true);
    const val = this.addCompetitorForm.value;
    
    // Parse comma separated destinations
    if (typeof val.targetDestinations === 'string') {
      val.targetDestinations = val.targetDestinations.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    this.intelligenceService.addCompetitor(val).subscribe({
      next: (res: any) => {
        this.isSavingCompetitor.set(false);
        this.closeAddCompetitorModal();
        Swal.fire('Competitor Added', `"${val.companyName}" added to your intelligence watchlist!`, 'success');
        this.loadOverviewData();
      },
      error: (err: any) => {
        this.isSavingCompetitor.set(false);
        Swal.fire('Error', 'Failed to add competitor: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  saveDiscoveredCompetitor(comp: any) {
    this.intelligenceService.addCompetitor(comp).subscribe({
      next: () => {
        Swal.fire('Discovered Competitor Saved', `"${comp.companyName}" saved to your competitor database!`, 'success');
        this.loadOverviewData();
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to save competitor: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  deleteCompetitor(comp: any) {
    Swal.fire({
      title: 'Remove Competitor?',
      text: `Are you sure you want to remove "${comp.companyName}" from your watchlist?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      confirmButtonColor: '#dc2626'
    }).then(res => {
      if (res.isConfirmed) {
        this.intelligenceService.deleteCompetitor(comp.id).subscribe({
          next: () => {
            Swal.fire('Removed', `"${comp.companyName}" removed.`, 'success');
            this.loadOverviewData();
          }
        });
      }
    });
  }

  // Trigger Agentic Market Intelligence Analysis
  triggerAgenticAnalysis() {
    this.isAnalyzingMarket.set(true);
    Swal.fire({
      title: 'Running Agentic Market Analysis...',
      text: 'Gemini AI is analyzing active competitors, regional demand signals, and market opportunities.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.intelligenceService.runMarketAnalysis().subscribe({
      next: (res: any) => {
        this.isAnalyzingMarket.set(false);
        Swal.fire('Analysis Complete!', 'Market demand signals & recommendations updated.', 'success');
        this.loadOverviewData();
      },
      error: (err: any) => {
        this.isAnalyzingMarket.set(false);
        Swal.fire('Analysis Error', err.error?.message || err.message, 'error');
      }
    });
  }

  // Competitor Pattern Analysis Handler
  inspectCompetitorPattern(comp: any) {
    this.isAnalyzingPattern.set(true);
    this.showAnalysisModal.set(true);
    this.intelligenceService.analyzeCompetitorPattern(comp.id || 1).subscribe({
      next: (res: any) => {
        this.isAnalyzingPattern.set(false);
        if (res.success && res.data) {
          this.selectedCompetitorAnalysis.set(res.data);
        }
      },
      error: () => this.isAnalyzingPattern.set(false)
    });
  }

  closeAnalysisModal() {
    this.showAnalysisModal.set(false);
    this.selectedCompetitorAnalysis.set(null);
  }

  // Report Exporter
  downloadReport(reportType: string, format: string) {
    Swal.fire({
      title: 'Generating Enterprise Report...',
      text: `Preparing ${reportType} report in ${format} format.`,
      icon: 'info',
      timer: 1500,
      showConfirmButton: false
    });

    this.intelligenceService.generateReport(reportType, format).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `AI_Marketing_Intelligence_${reportType}_Report.json`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      }
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
