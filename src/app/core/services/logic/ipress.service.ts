import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Ipress } from '../../../models/logic/ipress.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IpressService {

  private readonly BASE_URL = environment.apiLogicUrl + '/ipress';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Ipress[]> {
      return this.http.get<Ipress[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<Ipress> {
      return this.http.get<Ipress>(`${this.BASE_URL}/${id}`);
    }
  
    create(ipress: Ipress): Observable<Ipress> {
      return this.http.post<Ipress>(this.BASE_URL, ipress);
    }
  
    update(id: number, ipress: Ipress): Observable<Ipress> {
      return this.http.put<Ipress>(`${this.BASE_URL}/${id}`, ipress);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }
    
}
