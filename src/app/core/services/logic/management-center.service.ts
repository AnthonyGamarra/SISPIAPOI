import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ManagementCenter } from '../../../models/logic/managementCenter.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManagementCenterService {

  private readonly BASE_URL = environment.apiLogicUrl + '/management-center';
    
      constructor(private http: HttpClient) { }
    
      getAll(): Observable<ManagementCenter[]> {
        return this.http.get<ManagementCenter[]>(this.BASE_URL);
      }
    
      getById(id: number): Observable<ManagementCenter> {
        return this.http.get<ManagementCenter>(`${this.BASE_URL}/${id}`);
      }
    
      create(objective: ManagementCenter): Observable<ManagementCenter> {
        return this.http.post<ManagementCenter>(this.BASE_URL, objective);
      }
    
      update(id: number, objective: ManagementCenter): Observable<ManagementCenter> {
        return this.http.put<ManagementCenter>(`${this.BASE_URL}/${id}`, objective);
      }
    
      delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.BASE_URL}/${id}`);
      }

}
