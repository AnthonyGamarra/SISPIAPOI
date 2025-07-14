import { Component, inject } from '@angular/core';
import { Router } from '@angular/router'; // Import Router
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/authentication/auth.service'; // ajusta la ruta si es necesario

@Component({
  selector: 'app-menubar',
  standalone: true, // Importante si estás usando Angular standalone components
  imports: [
    CommonModule,
    TieredMenuModule,
    ButtonModule
  ],
  templateUrl: './menubar.component.html',
  styleUrls: ['./menubar.component.scss']
})
export class MenubarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  userMenuItems: MenuItem[] = [];
  settingsMenuItems: MenuItem[] = [];

  ngOnInit() {
    this.userMenuItems = [
      { label: 'Perfil', icon: 'pi pi-user', command: () => this.onProfile() },
      { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.onLogout() }
    ];

    this.settingsMenuItems = [
      { label: 'Configuración', icon: 'pi pi-cog', command: () => this.onSettings() },
      { label: 'Ayuda', icon: 'pi pi-question', command: () => this.onHelp() }
    ];
  }

  onProfile() {
    console.log('Ver perfil');
  }

  onLogout() {
    const accessToken = localStorage.getItem('access_token') ?? '';
    const refreshToken = localStorage.getItem('refresh_token') ?? '';
    this.authService.logout({ access_token: accessToken, refresh_token: refreshToken }).subscribe();
  }

  onSettings() {
    console.log('Configuración');
  }

  onHelp() {
    console.log('Ayuda');
  }

  goToLogin() {
    this.router.navigate(['/menu']); // Navigate to the login route
  }
}
