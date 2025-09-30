import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IndicatorBehavior } from '../../../models/indicadores/indicator-behavior.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IndicatorBehaviorService {

  private readonly BASE_URL = environment.apiIndicadoresUrl + '/indicator-behavior';

  constructor(private http: HttpClient) { }

  getAll(): Observable<IndicatorBehavior[]> {
    return this.http.get<IndicatorBehavior[]>(this.BASE_URL);
  }

  getById(id: number): Observable<IndicatorBehavior> {
    return this.http.get<IndicatorBehavior>(`${this.BASE_URL}/${id}`);
  }

  create(data: IndicatorBehavior): Observable<IndicatorBehavior> {
    return this.http.post<IndicatorBehavior>(this.BASE_URL, data);
  }

  update(data: IndicatorBehavior): Observable<void> {
    return this.http.put<void>(this.BASE_URL, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

}
