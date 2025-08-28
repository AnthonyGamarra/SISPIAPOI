import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityDetail } from '../../../models/logic/activityDetail.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActivityDetailService {

  private readonly BASE_URL = environment.apiLogicUrl + '/activity-detail';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<ActivityDetail[]> {
      return this.http.get<ActivityDetail[]>(this.BASE_URL);
    }
  
    getById(id: number): Observable<ActivityDetail> {
      return this.http.get<ActivityDetail>(`${this.BASE_URL}/${id}`);
    }
  
    create(data: ActivityDetail): Observable<ActivityDetail> {
      return this.http.post<ActivityDetail>(this.BASE_URL, data);
    }
  
    update(data: ActivityDetail): Observable<void> {
      return this.http.put<void>(`${this.BASE_URL}`, data);
    }
  
    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
