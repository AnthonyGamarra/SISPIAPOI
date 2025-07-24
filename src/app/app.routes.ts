import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuComponent } from './pages/menu/menu.component';
import { MenuFormulacionComponent } from './pages/menu-formulacion/menu-formulacion.component';
import { FormulacionCentralComponent } from './pages/formulacion-central/formulacion-central.component';
import { EvaluacionComponent } from './pages/evaluacion/evaluacion.component';
import { ValidaComponent } from './pages/valida/valida.component';
import { AdminPlanificacionComponent } from './pages/admin-planificacion/admin-planificacion.component';
import { AdminOeAeComponent } from './pages/admin-oe-ae/admin-oe-ae.component';
import { AdminMaestroGestionOcComponent } from './pages/admin-maestro-gestion-oc/admin-maestro-gestion-oc.component';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { FormulacionDesconcentradoGestionModuloComponent } from './components/modules/formulacion-desconcentrado-gestion-modulo/formulacion-desconcentrado-gestion-modulo.component';
import { MenuFormulacionDesconcentradoComponent } from './pages/menu-formulacion-desconcentrado/menu-formulacion-desconcentrado.component';

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
    path: 'admin-oe-ae', // ✅ nueva ruta para el componente Formu1
    component: AdminOeAeComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
  },
  {
    path: 'adm-maestro-gestion-oc', // ✅ nueva ruta para administrar maestros OC
    component: AdminMaestroGestionOcComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
  },
  {
    path: 'formulacion', // ✅ nueva ruta para el componente Formu1
    component: MenuFormulacionComponent,
    canActivate: [authGuard],
  },
  {
    path: 'formulacion-central', // ✅ nueva ruta para el componente Formu1
    component: FormulacionCentralComponent,
    canActivate: [authGuard],
  },
  {
    path: 'formulacion-desconcentrado', // ✅ nueva ruta para el componente Formu1
    component: MenuFormulacionDesconcentradoComponent,
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
