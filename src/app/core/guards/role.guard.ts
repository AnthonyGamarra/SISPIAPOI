import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/authentication/auth.service'; // Adjust path if necessary
import { ToastrService } from 'ngx-toastr'; // To display messages

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const requiredRole = route.data['role'] as string; // Get the required role from route data

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']); // Not authenticated, redirect to login
    return false;
  }

  // Decode the token to get the user's role
  const accessToken = authService.accessToken;
  if (accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const userRole = payload.role as string;

      if (userRole === requiredRole) {
        return true; // User has the required role, allow access
      } else {
        toastr.warning('No tienes permiso para acceder a esta página.', 'Acceso Denegado');
        router.navigate(['/dashboard']); // Or a common unauthorized page
        return false;
      }
    } catch (e) {
      console.error('Error decoding access token for role guard:', e);
      toastr.error('Error de autenticación. Por favor, inicia sesión de nuevo.', 'Error');
      router.navigate(['/login']); // Token invalid, redirect to login
      return false;
    }
  }

  // Should not be reached if isAuthenticated() is true and accessToken is present,
  // but as a fallback:
  router.navigate(['/login']);
  return false;
};