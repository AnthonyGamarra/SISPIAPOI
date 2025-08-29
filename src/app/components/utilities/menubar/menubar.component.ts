import { PasswordModule } from 'primeng/password';
import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router'; // Import Router and NavigationEnd
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/authentication/auth.service'; // ajusta la ruta si es necesario
import { UserService } from '../../../core/services/authentication/user.service';
import { ChangePasswordDTO } from '../../../models/auth/change-password.dto';
import { ToastrService } from 'ngx-toastr';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-menubar',
  standalone: true, // Importante si estás usando Angular standalone components
  imports: [
    CommonModule,
    TieredMenuModule,
    ButtonModule,
    DialogModule,
    FormsModule,
    PasswordModule
  ],
  templateUrl: './menubar.component.html',
  styleUrls: ['./menubar.component.scss']
})
export class MenubarComponent {
  private toastr = inject(ToastrService);
  showChangePasswordModal = false;
  newPassword = '';
  confirmPassword = '';
  changeLoading = false;
  private userService = inject(UserService);

  openChangePasswordModal() {
    this.newPassword = '';
    this.confirmPassword = '';
    this.showChangePasswordModal = true;
  }

  closeChangePasswordModal() {
    this.showChangePasswordModal = false;
    this.newPassword = '';
    this.confirmPassword = '';
    this.changeLoading = false;
  }

  changePassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.toastr.warning('Ingrese y confirme la nueva contraseña.', 'Campo requerido');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toastr.error('Las contraseñas no coinciden.', 'Error');
      return;
    }
    const accessToken = this.authService.accessToken;
    if (!accessToken) {
      this.toastr.error('No se pudo identificar el usuario.', 'Error');
      return;
    }
    let idUser: number | undefined;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      idUser = payload.idUser || payload.userId || payload.id || undefined;
    } catch {
      this.toastr.error('No se pudo identificar el usuario.', 'Error');
      return;
    }
    if (!idUser) {
      this.toastr.error('No se pudo identificar el usuario.', 'Error');
      return;
    }
    this.changeLoading = true;
    const dto: ChangePasswordDTO = { password: this.newPassword };
    this.userService.changePassword(idUser, dto).subscribe({
      next: () => {
        this.toastr.success('Contraseña cambiada correctamente.', 'Éxito');
        this.closeChangePasswordModal();
      },
      error: (err: any) => {
        this.toastr.error(err?.error || 'No se pudo cambiar la contraseña.', 'Error');
        this.changeLoading = false;
      }
    });
  }
  private authService = inject(AuthService);
  private router = inject(Router);
  userMenuItems: MenuItem[] = [];
  settingsMenuItems: MenuItem[] = [];
  showBackButton: boolean = true;
  userName: string = '';

  ngOnInit() {
    this.loadUserName();
    
    this.userMenuItems = [
      { label: 'Cambiar contraseña', icon: 'pi pi-lock', command: () => this.openChangePasswordModal() },
      { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.onLogout() }
    ];

    this.settingsMenuItems = [
      { label: 'Configuración', icon: 'pi pi-cog', command: () => this.onSettings() },
      { label: 'Ayuda', icon: 'pi pi-question', command: () => this.onHelp() }
    ];

    // Escuchar cambios de ruta para mostrar/ocultar el botón de atrás
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.showBackButton = event.url !== '/menu';
    });

    // Verificar la ruta inicial
    this.showBackButton = this.router.url !== '/menu';
  }

  private loadUserName(): void {
    const accessToken = this.authService.accessToken;
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        // Intentar obtener el nombre del usuario desde diferentes campos posibles del token
        this.userName = payload.name || payload.username || payload.sub || payload.user || 'Usuario';
      } catch (e) {
        console.error('Error decoding token to get user name:', e);
        this.userName = 'Usuario';
      }
    } else {
      this.userName = 'Usuario';
    }
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

  goBack() {
    window.history.back();
  }

  goToLogin() {
    this.router.navigate(['/menu']); // Navigate to the login route
  }
}
