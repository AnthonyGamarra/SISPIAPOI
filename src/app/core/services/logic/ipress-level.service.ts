import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IpressLevel } from '../../../models/logic/ipressLevel.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IpressLevelService {

  private readonly BASE_URL = environment.apiLogicUrl + '/ipress-level';

  constructor(private http: HttpClient) { }

  getAll(): Observable<IpressLevel[]> {
      return this.http.get<IpressLevel[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<IpressLevel> {
      return this.http.get<IpressLevel>(`${this.BASE_URL}/${id}`);
    }
  
    create(ipressLevel: IpressLevel): Observable<IpressLevel> {
      return this.http.post<IpressLevel>(this.BASE_URL, ipressLevel);
    }
  
    update(id: number, ipressLevel: IpressLevel): Observable<IpressLevel> {
      return this.http.put<IpressLevel>(`${this.BASE_URL}/${id}`, ipressLevel);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
