import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, AuthTokens } from '../../models/auth/auth.model';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  private readonly BASE_URL = 'http://10.0.2.144:8081';

  // Signals para estado de login
  tokens = signal<AuthTokens | null>(null);

  login(data: LoginRequest) {
    return this.http.post<AuthTokens>(`${this.BASE_URL}/login`, data).pipe(
      tap((res) => {
        this.tokens.set(res);
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
      })
    );
  }

  logout(data: AuthTokens) {
    return this.http.post(`${this.BASE_URL}/logout-token`, data, { responseType: 'text' }).pipe(
      tap(() => {        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        this.tokens.set(null);
        this.toastr.success('Sesión cerrada correctamente. ¡Hasta pronto!', 'Cierre de sesión');
        this.router.navigate(['/login']);
      })
    );
  }

  get accessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}
