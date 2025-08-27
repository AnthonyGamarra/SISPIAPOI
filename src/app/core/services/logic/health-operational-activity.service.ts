import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OperationalActivity } from '../../../models/logic/operationalActivity.model';

@Injectable({
  providedIn: 'root'
})
export class HealthOperationalActivityService {

  private readonly BASE_URL = 'http://10.0.2.144:8081/health-operational-activity';
  
  constructor(private http: HttpClient) { }

  // Obtener todas las actividades operativas de salud
  getAll(): Observable<OperationalActivity[]> {
    return this.http.get<OperationalActivity[]>(`${this.BASE_URL}`);
  }

  // Obtener una por ID
  getById(id: number): Observable<OperationalActivity> {
    return this.http.get<OperationalActivity>(`${this.BASE_URL}/${id}`);
  }

  // Crear nueva
  create(activity: OperationalActivity): Observable<OperationalActivity> {
    return this.http.post<OperationalActivity>(this.BASE_URL, activity);
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

  // Métodos específicos para campos de salud

  // Buscar por código de red
  findByCodRed(codRed: string): Observable<OperationalActivity[]> {
    return this.http.get<OperationalActivity[]>(`${this.BASE_URL}/by-red/${codRed}`);
  }

  // Buscar por código de centro de sesiones
  findByCodCenSes(codCenSes: string): Observable<OperationalActivity[]> {
    return this.http.get<OperationalActivity[]>(`${this.BASE_URL}/by-centro-sesiones/${codCenSes}`);
  }

  // Buscar por nivel de atención
  findByNivelAtencion(nivelAtencion: string): Observable<OperationalActivity[]> {
    return this.http.get<OperationalActivity[]>(`${this.BASE_URL}/by-nivel-atencion/${nivelAtencion}`);
  }

  // Buscar actividades POI
  findByPoiActivities(): Observable<OperationalActivity[]> {
    return this.http.get<OperationalActivity[]>(`${this.BASE_URL}/poi-activities`);
  }

  // Buscar actividades FONAFE
  findByFonafeActivities(): Observable<OperationalActivity[]> {
    return this.http.get<OperationalActivity[]>(`${this.BASE_URL}/fonafe-activities`);
  }

  // Buscar por código de red y centro de sesiones
  findByCodRedAndCodCenSes(codRed: string, codCenSes: string): Observable<OperationalActivity[]> {
    const params = new HttpParams()
      .set('codRed', codRed)
      .set('codCenSes', codCenSes);
    
    return this.http.get<OperationalActivity[]>(`${this.BASE_URL}/by-red-and-centro`, { params });
  }

  // Buscar actividades de salud para reportes
  findHealthActivitiesForReport(
    codRed?: string, 
    nivelAtencion?: string, 
    poi?: boolean
  ): Observable<OperationalActivity[]> {
    let params = new HttpParams();
    
    if (codRed) {
      params = params.set('codRed', codRed);
    }
    if (nivelAtencion) {
      params = params.set('nivelAtencion', nivelAtencion);
    }
    if (poi !== undefined) {
      params = params.set('poi', poi.toString());
    }
    
    return this.http.get<OperationalActivity[]>(`${this.BASE_URL}/report`, { params });
  }

  // Obtener el código correlativo mayor por centro de costo
  getHigherCorrelativeCodeByCostCenter(idCostCenter: number): Observable<string> {
    const url = `${this.BASE_URL}/higher-correlative-code/cost-center/${idCostCenter}`;
    return this.http.get(url, { responseType: 'text' });
  }
}
