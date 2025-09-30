import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Variable } from '../../../models/indicadores/variable.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VariableService {

  private readonly BASE_URL = environment.apiIndicadoresUrl + '/variable';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Variable[]> {
    return this.http.get<Variable[]>(this.BASE_URL);
  }

  getByIndicatorSheet(id: number): Observable<Variable[]> {
    return this.http.get<Variable[]>(`${this.BASE_URL}/indicator-sheet/${id}`);
  }

  getById(id: number): Observable<Variable> {
    return this.http.get<Variable>(`${this.BASE_URL}/${id}`);
  }

  create(data: Variable): Observable<Variable> {
    return this.http.post<Variable>(this.BASE_URL, data);
  }

  update(data: Variable): Observable<void> {
    return this.http.put<void>(this.BASE_URL, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

}
