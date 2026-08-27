import { Component, ChangeDetectorRef, NgZone } from '@angular/core'; // 1. NgZone import kiya
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AnalysisResponse, CsvAnalysisService } from '../../service/csv-analysis.service';

@Component({
  selector: 'app-csv-graphs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './csv-graphs.html',
  styleUrl: './csv-graphs.scss',
})
export class CsvGraphs {
  selectedFile: File | null = null;
  isLoading: boolean = false;
  analysisResult: AnalysisResponse | null = null;
  activeColumn: string = '';
  safeGraphUrl: SafeUrl | null = null;

  constructor(
    private csvService: CsvAnalysisService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private zone: NgZone // 2. NgZone Inject kiya
  ) { }

  // File change handler
  handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.analysisResult = null;
      this.safeGraphUrl = null;
      this.cdr.detectChanges();
    }
  }

  // Submit file and get Base64 graph
  uploadAndAnalyze(columnName?: string): void {
    if (!this.selectedFile) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    this.csvService.analyzeCsv(this.selectedFile, columnName).subscribe({
      next: (response) => {
        this.zone.run(() => {
          this.analysisResult = response;
          this.activeColumn = response.selected_column;
          this.safeGraphUrl = this.sanitizer.bypassSecurityTrustUrl(response.graph_image);
          this.isLoading = false;

          // NOTE: Yahan koi Success Toast / Notification call NA karein
          // Isse "Success! Action completed successfully" wala popup NAHI aayega.

          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('API Error:', error);
        this.zone.run(() => {
          this.isLoading = false;

          // SIRF ERROR aane par hi notification/popup dikhayein
          alert('Failed to analyze CSV! Check backend server connection.');

          this.cdr.detectChanges();
        });
      }
    });
  }

  // Column chip click handler
  selectColumnAndAnalyze(col: string): void {
    if (this.isLoading || this.activeColumn === col) return;
    this.activeColumn = col;
    this.uploadAndAnalyze(col);
  }
}