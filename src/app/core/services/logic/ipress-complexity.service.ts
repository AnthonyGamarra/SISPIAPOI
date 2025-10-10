import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IpressComplexity } from '../../../models/logic/ipressComplexity.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IpressComplexityService {

  private readonly BASE_URL = environment.apiLogicUrl + '/ipress-complexity';

  constructor(private http: HttpClient) { }

  getAll(): Observable<IpressComplexity[]> {
      return this.http.get<IpressComplexity[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<IpressComplexity> {
      return this.http.get<IpressComplexity>(`${this.BASE_URL}/${id}`);
    }
  
    create(ipressComplexity: IpressComplexity): Observable<IpressComplexity> {
      return this.http.post<IpressComplexity>(this.BASE_URL, ipressComplexity);
    }
  
    update(id: number, ipressComplexity: IpressComplexity): Observable<IpressComplexity> {
      return this.http.put<IpressComplexity>(`${this.BASE_URL}/${id}`, ipressComplexity);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
