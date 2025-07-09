import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MeasurementType } from '../../../models/logic/measurementType.model';

@Injectable({
  providedIn: 'root'
})
export class MeasurementTypeService {

  private readonly BASE_URL = 'http://172.21.0.1:8081/measurement-type';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<MeasurementType[]> {
      return this.http.get<MeasurementType[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<MeasurementType> {
      return this.http.get<MeasurementType>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: MeasurementType): Observable<MeasurementType> {
      return this.http.post<MeasurementType>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: MeasurementType): Observable<MeasurementType> {
      return this.http.put<MeasurementType>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
