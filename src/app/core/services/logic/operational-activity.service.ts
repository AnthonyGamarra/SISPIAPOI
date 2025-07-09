import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OperationalActivity } from '../../../models/logic/operationalActivity.model';

@Injectable({
  providedIn: 'root'
})
export class OperationalActivityService {

  private readonly BASE_URL = 'http://10.0.29.240:8081/operational-activity';
  
    constructor(private http: HttpClient) { }
  
    // Obtener todas las actividades operativas
    getAll(): Observable<OperationalActivity[]> {
      return this.http.get<OperationalActivity[]>(`${this.BASE_URL}`);
    }

    // Obtener una por ID
    getById(id: number): Observable<OperationalActivity> {
      return this.http.get<OperationalActivity>(`${this.BASE_URL}/${id}`);
    }

    // Crear nueva
    create(data: OperationalActivity): Observable<void> {
      return this.http.post<void>(`${this.BASE_URL}`, data);
    }

    // Actualizar existente
    update(data: OperationalActivity): Observable<OperationalActivity> {
      return this.http.put<OperationalActivity>(`${this.BASE_URL}`, data);
    }

    // Eliminar por ID
    deleteById(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

    // Buscar por formulación
    searchByFormulation(formulationId: number): Observable<OperationalActivity[]> {
      const payload = {
        formulation: { idFormulation: formulationId }
      };
      return this.http.post<OperationalActivity[]>(`${this.BASE_URL}/search`, payload);
    }

}
