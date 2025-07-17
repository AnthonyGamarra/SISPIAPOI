import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FormulationState } from '../../../models/logic/formulationState.model';

@Injectable({
  providedIn: 'root'
})
export class FormulationStateService {

  private readonly BASE_URL = 'http://10.0.29.117:8081/formulation-state';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<FormulationState[]> {
      return this.http.get<FormulationState[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<FormulationState> {
      return this.http.get<FormulationState>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: FormulationState): Observable<FormulationState> {
      return this.http.post<FormulationState>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: FormulationState): Observable<FormulationState> {
      return this.http.put<FormulationState>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
