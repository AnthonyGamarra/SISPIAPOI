import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Role } from '../../../models/auth/role.model';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly BASE_URL = environment.apiAuthUrl + '/roles';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Role[]> {
    return this.http.get<Role[]>(this.BASE_URL);
  }

  getById(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.BASE_URL}/${id}`);
  }

  create(role: Role): Observable<Role> {
    return this.http.post<Role>(this.BASE_URL, role);
  }

  update(id: number, role: Role): Observable<Role> {
    return this.http.put<Role>(`${this.BASE_URL}/${id}`, role);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }
}
