import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalysisResponse {
  status: string;
  message: string;
  columns: string[];
  selected_column: string;
  graph_image: string;
  row_count: number;
  saved_file_path?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CsvAnalysisService {
  private apiUrl = 'http://localhost:5000/upload_and_analyze';

  constructor(private http: HttpClient) {}

  // CSV upload aur graph fetch karne ki API Service method
  analyzeCsv(file: File, selectedColumn?: string): Observable<AnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (selectedColumn) {
      formData.append('selected_column', selectedColumn);
    }

    return this.http.post<AnalysisResponse>(this.apiUrl, formData);
  }
}