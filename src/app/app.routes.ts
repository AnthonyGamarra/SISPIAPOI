import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuComponent } from './pages/menu/menu.component';
import { FormulationComponent } from './pages/formulation/formulation.component';
import { EvaluacionComponent } from './pages/evaluacion/evaluacion.component';
import { ValidaComponent } from './pages/valida/valida.component';
import { AdminPlanificacionComponent } from './pages/admin-planificacion/admin-planificacion.component';

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
    path: 'admin-planificacion', // ✅ nueva ruta para el componente Formu1
    component: AdminPlanificacionComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
  },
  {
    path: 'formulation', // ✅ nueva ruta para el componente Formu1
    component: FormulationComponent,
    canActivate: [authGuard],
  },
  {
    path: 'evaluacion', // ✅ nueva ruta para el componente Formu1
    component: EvaluacionComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "UPLANEAMIENTO", "GPLANEAMIENTO"],
    },
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
