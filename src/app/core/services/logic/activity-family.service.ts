import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityFamily } from '../../../models/logic/activityFamily.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityFamilyService {

  private readonly BASE_URL = 'http://10.0.2.144:8081/activity-family';
  
    constructor(private http: HttpClient) { }
  
    getAll(): Observable<ActivityFamily[]> {
      return this.http.get<ActivityFamily[]>(this.BASE_URL);
    }

    getById(id: number): Observable<ActivityFamily> {
      return this.http.get<ActivityFamily>(`${this.BASE_URL}/${id}`);
    }

    create(dto: ActivityFamily): Observable<ActivityFamily> {
      return this.http.post<ActivityFamily>(this.BASE_URL, dto);
    }

    update(dto: ActivityFamily): Observable<void> {
      return this.http.put<void>(this.BASE_URL, dto);
    }

    delete(id: number): Observable<void> {
      return this.http.delete<void>(`${this.BASE_URL}/${id}`);
    }

}
