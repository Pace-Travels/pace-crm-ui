import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MarketIntelligenceService, CompetitorItem } from './services/market-intelligence.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-market-intelligence',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-intelligence.html',
  styleUrl: './market-intelligence.scss',
})
export class MarketIntelligence implements OnInit {
  router = inject(Router);
  miService = inject(MarketIntelligenceService);

  activeTab = signal<'OVERVIEW' | 'COMPETITORS' | 'ADS' | 'PRICING'>('OVERVIEW');
  searchQuery = signal<string>('');
  showAddModal = signal<boolean>(false);

  // Form State
  newCompName = '';
  newCompBrand = '';
  newCompWebsite = '';
  newCompIndustry = 'Travel & Tourism';
  newCompPriority = 'HIGH';

  ngOnInit() {
    this.miService.fetchDashboard();
  }

  triggerGeminiAnalysis() {
    Swal.fire({
      title: 'Running Gemini AI Market Intelligence Analysis...',
      text: 'Analyzing competitor ads, pricing drops, and macro market signals via Google Gemini 1.5 Pro.',
      icon: 'info',
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.miService.runAiAnalysis().subscribe({
      next: (res) => {
        Swal.close();
        if (res.success && res.intelligence) {
          const current = this.miService.dashboardData();
          if (current) {
            this.miService.dashboardData.set({
              ...current,
              overallAggressionScore: res.intelligence.aggressionScore || current.overallAggressionScore,
              overallOpportunityScore: res.intelligence.opportunityScore || current.overallOpportunityScore,
              executiveSummary: res.intelligence.executiveSummary || current.executiveSummary,
              recommendations: res.intelligence.recommendations || current.recommendations
            });
          }
          Swal.fire('AI Analysis Complete', 'Strategic recommendations & opportunity scores updated with Gemini 1.5 Pro!', 'success');
        }
      },
      error: (err) => {
        Swal.close();
        Swal.fire('Analysis Failed', err.message || 'AI service error', 'error');
      }
    });
  }

  openAddModal() {
    this.newCompName = '';
    this.newCompBrand = '';
    this.newCompWebsite = '';
    this.newCompIndustry = 'Travel & Tourism';
    this.newCompPriority = 'HIGH';
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitAddCompetitor() {
    if (!this.newCompName.trim()) {
      Swal.fire('Error', 'Please enter competitor company name', 'error');
      return;
    }

    this.miService.addCompetitor({
      name: this.newCompName,
      brandName: this.newCompBrand || this.newCompName,
      websiteUrl: this.newCompWebsite,
      industry: this.newCompIndustry,
      priority: this.newCompPriority
    }).subscribe({
      next: (res) => {
        this.closeAddModal();
        this.miService.fetchDashboard();
        Swal.fire('Competitor Added', `${this.newCompName} has been added to intelligence monitoring!`, 'success');
      },
      error: (err) => Swal.fire('Error', err.message, 'error')
    });
  }

  executeRecommendation(route: string) {
    this.router.navigate([route || '/campaigns']);
  }

  filteredCompetitors(): CompetitorItem[] {
    const list = this.miService.dashboardData()?.competitors || [];
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(c => c.name.toLowerCase().includes(q) || (c.brandName && c.brandName.toLowerCase().includes(q)));
  }
}
