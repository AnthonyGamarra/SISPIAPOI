import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuxiliarData } from '../../../models/indicadores/auxiliar-data.model';
import { DataKind } from '../../../models/indicadores/data-kind.enum';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuxiliarDataService {

  private readonly BASE_URL = environment.apiIndicadoresUrl + '/auxiliar-data';

  constructor(private http: HttpClient) { }

  getAll(): Observable<AuxiliarData[]> {
    return this.http.get<AuxiliarData[]>(this.BASE_URL);
  }

  getByIndicatorSheetAndKind(indicatorSheetId: number, kind: DataKind | string): Observable<AuxiliarData[]> {
    const k = typeof kind === 'string' ? kind : String(kind);
    return this.http.get<AuxiliarData[]>(`${this.BASE_URL}/indicator-sheet/${indicatorSheetId}/kind/${k}`);
  }

  getById(id: number): Observable<AuxiliarData> {
    return this.http.get<AuxiliarData>(`${this.BASE_URL}/${id}`);
  }

  create(data: AuxiliarData): Observable<AuxiliarData> {
    return this.http.post<AuxiliarData>(this.BASE_URL, data);
  }

  update(data: AuxiliarData): Observable<void> {
    return this.http.put<void>(this.BASE_URL, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

}
