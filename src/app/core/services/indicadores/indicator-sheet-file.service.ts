import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IndicatorSheetFile } from '../../../models/indicadores/indicator-sheet-file.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IndicatorSheetFileService {

  private readonly BASE_URL = environment.apiIndicadoresUrl + '/strategic-action-file';

  constructor(private http: HttpClient) { }

  /**
   * Upload a new file. Returns the numeric id (rpta) from backend.
   */
  saveFile(file: File | Blob, fileName?: string): Observable<number> {
    const fd = new FormData();
    if (file instanceof File) {
      fd.append('file', file, file.name);
    } else {
      fd.append('file', file, fileName || 'file');
    }
    return this.http.post<number>(this.BASE_URL, fd);
  }

  /**
   * Update existing file associated to an indicator sheet.
   * Expects form fields: idIndicatorSheet (number) and file (multipart)
   */
  updateFile(idIndicatorSheet: number, file: File | Blob, fileName?: string): Observable<void> {
    const fd = new FormData();
    fd.append('idIndicatorSheet', String(idIndicatorSheet));
    if (file instanceof File) {
      fd.append('file', file, file.name);
    } else {
      fd.append('file', file, fileName || 'file');
    }
    return this.http.post<void>(`${this.BASE_URL}/update`, fd);
  }

  getById(id: number): Observable<IndicatorSheetFile> {
    return this.http.get<IndicatorSheetFile>(`${this.BASE_URL}/${id}`);
  }

  /**
   * Download raw file bytes as Blob.
   */
  getFile(id: number): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/${id}/file`, { responseType: 'blob' });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

}
