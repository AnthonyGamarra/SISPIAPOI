import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CostCenter } from '../../../models/logic/costCenter.model';

@Injectable({
  providedIn: 'root'
})
export class CostCenterService {

  private readonly BASE_URL = 'http://172.21.0.1:8081/cost-center';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<CostCenter[]> {
      return this.http.get<CostCenter[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<CostCenter> {
      return this.http.get<CostCenter>(`${this.BASE_URL}/${id}`);
    }
  
    create(objective: CostCenter): Observable<CostCenter> {
      return this.http.post<CostCenter>(this.BASE_URL, objective);
    }
  
    update(id: number, objective: CostCenter): Observable<CostCenter> {
      return this.http.put<CostCenter>(`${this.BASE_URL}/${id}`, objective);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
