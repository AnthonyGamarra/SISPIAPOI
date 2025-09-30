import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IndicatorSheet } from '../../../models/indicadores/indicator-sheet.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IndicatorSheetService {

  private readonly BASE_URL = environment.apiIndicadoresUrl + '/indicator-sheet';

  constructor(private http: HttpClient) { }

  getAll(): Observable<IndicatorSheet[]> {
    return this.http.get<IndicatorSheet[]>(this.BASE_URL);
  }

  searchByYearDependencyModification(year: number, dependency: string, modification: number): Observable<IndicatorSheet[]> {
    return this.http.get<IndicatorSheet[]>(`${this.BASE_URL}/search/${year}/${dependency}/${modification}`);
  }

  getById(id: number): Observable<IndicatorSheet> {
    return this.http.get<IndicatorSheet>(`${this.BASE_URL}/${id}`);
  }

  create(data: IndicatorSheet): Observable<IndicatorSheet> {
    return this.http.post<IndicatorSheet>(this.BASE_URL, data);
  }

  update(data: IndicatorSheet): Observable<void> {
    return this.http.put<void>(this.BASE_URL, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

}
