import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OperationalActivity } from '../../../models/logic/operationalActivity.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperationalActivityService {

  private readonly BASE_URL = environment.apiLogicUrl + '/operational-activity';
  
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
    create(objective: OperationalActivity): Observable<OperationalActivity> {
      return this.http.post<OperationalActivity>(this.BASE_URL, objective);
    }

    // Actualizar existente
    update(data: OperationalActivity): Observable<void> {
      return this.http.put<void>(`${this.BASE_URL}`, data);
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

    // Obtener el código correlativo mayor por centro de costo
    getHigherCorrelativeCodeByCostCenter(idCostCenter: number): Observable<string> {
      const url = `${this.BASE_URL}/higher-correlative-code/cost-center/${idCostCenter}`;
      return this.http.get(url, { responseType: 'text' });
    }

    // Obtener el código correlativo mayor por formulación
    getHigherCorrelativeCodeByFormulation(idFormulation: number): Observable<string> {
      const url = `${this.BASE_URL}/higher-correlative-code/formulation/${idFormulation}`;
      return this.http.get(url, { responseType: 'text' });
    }


}
