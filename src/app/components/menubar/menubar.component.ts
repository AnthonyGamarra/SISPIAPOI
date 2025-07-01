import { Component } from '@angular/core';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';

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
    console.log('Cerrar sesión');
  }

  onSettings() {
    console.log('Configuración');
  }

  onHelp() {
    console.log('Ayuda');
  }
}
