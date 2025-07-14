// src/app/core/services/authentication/auth.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, AuthTokens } from '../../../models/auth/auth.model';
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

  private readonly BASE_URL = 'http://10.0.29.240:8080';

  // Signals para estado de login
  tokens = signal<AuthTokens | null>(null);

  login(data: LoginRequest) {
    return this.http.post<AuthTokens>(`${this.BASE_URL}/login`, data).pipe(
      tap((res) => {
        this.tokens.set(res);
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        // Decodificar el token y guardar las dependencias y el rol
        try {
          const payload = JSON.parse(atob(res.access_token.split('.')[1]));
          if (payload.dependencies) {
            localStorage.setItem('dependencies', JSON.stringify(payload.dependencies));
          }
          if (payload.role) { // Store the user role from the token payload
            localStorage.setItem('user_role', payload.role);
          }
        } catch (e) {
          console.error('Error decoding access token during login:', e);
        }
      })
    );
  }

  logout(data: AuthTokens) {
    return this.http.post(`${this.BASE_URL}/logout-tokens`, data, { responseType: 'text' }).pipe(
      tap(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_role'); // Clear the stored role on logout
        localStorage.removeItem('dependencies'); // Clear dependencies on logout
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

  /**
   * Decodes the access token and returns the user's role.
   * @returns The user's role as a string, or null if not found or token is invalid.
   */
  getUserRole(): string | null {
    const accessToken = this.accessToken;
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        return payload.role || null;
      } catch (e) {
        console.error('Error decoding access token to get user role:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Checks if the current user has any of the specified roles.
   * @param allowedRoles An array of roles that are permitted.
   * @returns True if the user's role is in the allowedRoles array, false otherwise.
   */
  hasRole(allowedRoles: string[]): boolean {
    const userRole = this.getUserRole();
    if (userRole) {
      return allowedRoles.includes(userRole);
    }
    return false;
  }
}