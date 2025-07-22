import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FormulationType } from '../../../models/logic/formulationType.model';

@Injectable({
  providedIn: 'root'
})
export class FormulationTypeService {

  private readonly BASE_URL = 'http://10.0.2.144:8081/formulation-type';

  constructor(private http: HttpClient) { }

  getAll(): Observable<FormulationType[]> {
    return this.http.get<FormulationType[]>(this.BASE_URL);
  }

  getById(id: number): Observable<FormulationType> {
    return this.http.get<FormulationType>(`${this.BASE_URL}/${id}`);
  }

  create(type: FormulationType): Observable<FormulationType> {
    return this.http.post<FormulationType>(this.BASE_URL, type);
  }

  update(type: FormulationType): Observable<FormulationType> {
    return this.http.put<FormulationType>(this.BASE_URL, type);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }
}
