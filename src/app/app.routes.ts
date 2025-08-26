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
import { AdminMaestroGcspeComponent } from './pages/admin-maestro-gcspe/admin-maestro-gcspe.component';
import { AdminMaestroGcpamypcdComponent } from './pages/admin-maestro-gcpamypcd/admin-maestro-gcpamypcd.component';

import { MenuAdmComponent } from './pages/menu-adm/menu-adm.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { FormulacionDesconcentradoGestionModuloComponent } from './components/modules/formulacion-desconcentrado-gestion-modulo/formulacion-desconcentrado-gestion-modulo.component';
import { MenuFormulacionDesconcentradoComponent } from './pages/menu-formulacion-desconcentrado/menu-formulacion-desconcentrado.component';
import { ReporteF9 } from './pages/reporte-f9/reporte-f9.component';
import { FormulacionOoddSocialesComponent } from './pages/formulacion-oodd-sociales/formulacion-oodd-sociales.component';
import { AdminMaestroGcpsComponent } from './pages/admin-maestro-gcps/admin-maestro-gcps.component';

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
    path: 'formulacion', // ✅ nueva ruta para el componente Formu1
    component: MenuFormulacionComponent,
    canActivate: [authGuard],
  },
  {
    path: 'formulacion/formulacion-central', // ✅ nueva ruta para el componente Formu1
    component: FormulacionCentralComponent,
    canActivate: [authGuard],
  },
  {
    path: 'formulacion/formulacion-desconcentrado', // ✅ nueva ruta para el componente Formu1
    component: MenuFormulacionDesconcentradoComponent,
    canActivate: [authGuard],
  },
  {
    path: 'formulacion/formulacion-desconcentrado/sociales',
    component: FormulacionOoddSocialesComponent,
    canActivate: [authGuard],
  },
  {
    path: 'gestion', // ✅ nueva ruta para el componente Formu1
    component: MenuAdmComponent,
    canActivate: [authGuard],
  },  
  {
    path: 'gestion/admin-planificacion', // ✅ nueva ruta para el componente Formu1
    component: AdminPlanificacionComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
  },
  {
    path: 'gestion/admin-oe-ae', // ✅ nueva ruta para el componente Formu1
    component: AdminOeAeComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
  },
  {
    path: 'gestion/adm-maestro-gestion-ag', // ✅ nueva ruta para administrar maestros OC
    component: AdminMaestroGestionOcComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
  },
  {
    path: 'gestion/adm-maestro-gcspe',
    component: AdminMaestroGcspeComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
  },
  {
    path: 'gestion/adm-maestro-gcpamypcd',
    component: AdminMaestroGcpamypcdComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
  },
  {
    path: 'gestion/adm-maestro-gcps',
    component: AdminMaestroGcpsComponent,
    canActivate: [authGuard],
    data: {
      roles: ["ADMIN", "GPLANEAMIENTO"],
    },
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
    path: 'reporte-f9', // ✅ nueva ruta para el componente Formu1
    component: ReporteF9,
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
