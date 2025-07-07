import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuComponent } from './pages/menu/menu.component';
import { Formu1Component } from './pages/formu1/formu1.component';
import { ValidaComponent } from './pages/valida/valida.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'menu',
    component: MenuComponent,
  },
  {
    path: 'formu1', // ✅ nueva ruta para el componente Formu1
    component: Formu1Component,
  },
  {
    path: 'valida', // ✅ nueva ruta para el componente Formu1
    component: ValidaComponent,
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
