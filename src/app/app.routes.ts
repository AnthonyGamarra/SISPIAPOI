import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuComponent } from './pages/menu/menu.component';
import { FormulationComponent } from './pages/formulation/formulation.component';
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
    path: 'formulation', // ✅ nueva ruta para el componente Formu1
    component: FormulationComponent,
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
