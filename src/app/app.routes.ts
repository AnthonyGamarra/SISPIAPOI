import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuComponent } from './pages/menu/menu.component';
import { FormulationComponent } from './pages/formulation/formulation.component';
import { ValidaComponent } from './pages/valida/valida.component';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'menu',
    component: MenuComponent,
    canActivate: [authGuard],
  },
  {
    path: 'formulation', // ✅ nueva ruta para el componente Formu1
    component: FormulationComponent,
    canActivate: [authGuard],
    // data: {
    //   roles: ['ADMIN'],
    // },
    // data: {
    //   dependencies: [11, 12, 13],
    // },
  },
  {
    path: 'valida', // ✅ nueva ruta para el componente Formu1
    component: ValidaComponent,
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'menu', pathMatch: 'full' },
  { path: '**', redirectTo: '/menu' },
];
