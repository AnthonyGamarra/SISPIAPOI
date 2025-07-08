import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Formulation } from '../../../models/logic/formulation.model';

@Injectable({
  providedIn: 'root'
})
export class FormulationService {

  private readonly BASE_URL = 'http://10.0.29.240:8081/formulation';
  
    constructor(private http: HttpClient) { }
  
  // Obtener todas las formulaciones
    getAll(): Observable<Formulation[]> {
      return this.http.get<Formulation[]>(`${this.BASE_URL}`);
    }

    // Obtener por ID
    getById(id: number): Observable<Formulation> {
      return this.http.get<Formulation>(`${this.BASE_URL}/${id}`);
    }

    // Crear nueva formulación
    create(data: Formulation): Observable<void> {
      return this.http.post<void>(`${this.BASE_URL}`, data);
    }

    // Actualizar formulación existente
    update(data: Formulation): Observable<Formulation> {
      return this.http.put<Formulation>(`${this.BASE_URL}`, data);
    }

    // Eliminar por ID
    deleteById(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

    // Buscar por dependencia y año
    searchByDependencyAndYear(dependencyId: number, year: number): Observable<Formulation[]> {
      const requestPayload = {
        dependency: { idDependency: dependencyId },
        year: year
      };
      return this.http.post<Formulation[]>(`${this.BASE_URL}/search`, requestPayload);
    }

}
