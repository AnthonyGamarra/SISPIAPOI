import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Formulation } from '../../../models/logic/formulation.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FormulationService {

  private readonly BASE_URL = environment.apiLogicUrl + '/formulation';
  
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
    create(data: Formulation): Observable<Formulation> {
      return this.http.post<Formulation>(`${this.BASE_URL}`, data);
    }

    // Actualizar formulación existente
    update(data: Formulation): Observable<Formulation> {
      return this.http.post<Formulation>(`${this.BASE_URL}`, data);
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

    // Añadir una modificación (copia con nuevo trimestre)
    addModification(idOriginalFormulation: number, newQuarter: number): Observable<Formulation> {
      return this.http.post<Formulation>(`${this.BASE_URL}/add-modification/${idOriginalFormulation}/${newQuarter}`, {});
    }

    addModificationPe(idOriginalFormulation: number, newMonth: number): Observable<Formulation> {
      return this.http.post<Formulation>(`${this.BASE_URL}/add-modificationpe/${idOriginalFormulation}/${newMonth}`, {});
    }

}
