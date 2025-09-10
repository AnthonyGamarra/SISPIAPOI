import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastrService } from 'ngx-toastr';
import { RippleModule } from 'primeng/ripple';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { TabViewModule } from 'primeng/tabview';
import { TabView } from 'primeng/tabview';
import { forkJoin, Observable } from 'rxjs';

import { User } from '../../../models/auth/user.model';
import { Role } from '../../../models/auth/role.model';
import { Dependency } from '../../../models/logic/dependency.model';
import { UserService } from '../../../core/services/authentication/user.service';
import { RoleService } from '../../../core/services/authentication/role.service';
import { DependencyService } from '../../../core/services/logic/dependency.service';



@Component({
  selector: 'app-adm-usuarios-tabla',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TagModule,
    IconFieldModule,
    InputIconModule,
    RippleModule,
    SelectButtonModule,
    TooltipModule,
    TextareaModule,
    ProgressSpinnerModule,
    ChipModule,
    TabViewModule
  ],
  templateUrl: './adm-usuarios-tabla.component.html',
  styleUrl: './adm-usuarios-tabla.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class AdmUsuariosTablaComponent implements OnInit {
  users: User[] = [];
  allUsers: User[] = [];
  loading = false;
  clonedUsers: { [s: string]: User } = {};
  editingRowKeys: { [s: string]: boolean } = {};
  newUserCounter = -1;
  showDeleteConfirmation = false;
  userToDelete: User | null = null;
  userToDeleteIndex: number | null = null;

  // Tab organization by roles
  usersByRole: { [roleId: number]: User[] } = {};
  availableRoles: Role[] = [];
  Object = Object; // Make Object available in template
  currentActiveTabRoleId: number | null = null; // Track current active tab
  currentActiveTabIndex: number = 0; // Track current active tab index
  
  showAddRoleDialog = false;
  showAddDependencyDialog = false;
  availableDependencies: Dependency[] = [];
  selectedRoleId: number | null = null;
  selectedDependencyId: number | null = null;
  userForRole: User | null = null;
  userForDependency: User | null = null;

  resettingUserId: number | null = null;

  @ViewChild('tabView') tabView!: TabView;

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private toastr: ToastrService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dependencyService: DependencyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadRoles();
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (data) => {
        this.allUsers = data;
        this.users = [...data];
        this.organizeUsersByRole();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Error al cargar los usuarios.', 'Error');
      }
    });
  }

  loadUsersKeepingActiveTab() {
    const currentTabIndex = this.currentActiveTabIndex;
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (data) => {
        this.allUsers = data;
        this.users = [...data];
        this.organizeUsersByRole();
        this.loading = false;
        // Restore the active tab after loading
        setTimeout(() => {
          this.currentActiveTabIndex = currentTabIndex;
          if (this.tabView) {
            this.tabView.activeIndex = currentTabIndex;
          }
        }, 0);
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Error al cargar los usuarios.', 'Error');
      }
    });
  }

  loadRoles() {
    this.roleService.getAll().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
      },
      error: () => {
        this.availableRoles = [];
        this.toastr.error('Error al cargar roles.', 'Error');
      }
    });
  }

  organizeUsersByRole() {
    this.usersByRole = {};
    this.users.forEach(user => {
      if (user.roles && user.roles.length > 0) {
        const roleId = user.roles[0].idRole;
        if (!this.usersByRole[roleId]) {
          this.usersByRole[roleId] = [];
        }
        this.usersByRole[roleId].push(user);
      }
    });
    
    // Set default active tab to the first available role if not set
    if (!this.currentActiveTabRoleId && this.availableRoles.length > 0) {
      this.currentActiveTabRoleId = this.availableRoles[0].idRole;
      this.currentActiveTabIndex = 0;
    }
  }

  onTabChange(event: any) {
    // Update the current active tab when user switches tabs
    this.currentActiveTabIndex = event.index;
    if (event.index >= 0 && event.index < this.availableRoles.length) {
      this.currentActiveTabRoleId = this.availableRoles[event.index].idRole;
    }
  }

  getRoleName(roleId: number): string {
    const role = this.availableRoles.find(r => r.idRole === roleId);
    return role?.name || 'Sin rol';
  }

  private loadAvailableRoles() {
    this.roleService.getAll().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
      },
      error: () => {
        this.availableRoles = [];
        this.toastr.error('Error al cargar roles.', 'Error');
      }
    });
  }

  private loadAvailableDependencies() {
    this.dependencyService.getAll().subscribe({
      next: (deps) => {
        this.availableDependencies = deps;
      },
      error: () => {
        this.availableDependencies = [];
        this.toastr.error('Error al cargar dependencias.', 'Error');
      }
    });
  }

  openAddRoleDialog(user: User) {
    this.userForRole = user;
    this.selectedRoleId = null;
    this.loadAvailableRoles();
    this.showAddRoleDialog = true;
  }

  cancelAddRole() {
    this.showAddRoleDialog = false;
    this.userForRole = null;
    this.selectedRoleId = null;
  }

  confirmAddRole() {
    if (this.userForRole && this.selectedRoleId) {
      const role = this.availableRoles.find(r => r.idRole === this.selectedRoleId);
      if (role) {
        this.userForRole.roles = [role];
        // Si es usuario nuevo, agregarlo a la lista y organizarlo por rol
        if (this.userForRole.idUser && this.userForRole.idUser < 0) {
          this.users = [...this.users, this.userForRole];
          this.organizeUsersByRole();
          this.editingRowKeys[this.userForRole.idUser as any] = true;
        } else if (this.userForRole.idUser && this.userForRole.idUser > 0) {
          // Si es existente, llama a addRole
          this.addRole(this.userForRole, role);
        }
      }
    }
    this.cancelAddRole();
  }

  openAddDependencyDialog(user: User) {
    this.userForDependency = user;
    this.selectedDependencyId = null;
    this.loadAvailableDependencies();
    this.showAddDependencyDialog = true;
  }

  cancelAddDependency() {
    this.showAddDependencyDialog = false;
    this.userForDependency = null;
    this.selectedDependencyId = null;
  }

  confirmAddDependency() {
    if (this.userForDependency && this.selectedDependencyId) {
      // Evitar duplicados también en modo edición
      if (this.userForDependency.dependencies.some(d => d.idDependency === this.selectedDependencyId)) {
        this.toastr.warning('La dependencia ya está asignada a este usuario.', 'Advertencia');
        this.cancelAddDependency();
        return;
      }
      const dep = this.availableDependencies.find(d => d.idDependency === this.selectedDependencyId);
      if (dep) {
        if (this.userForDependency.idUser && this.userForDependency.idUser < 0) {
          const rol = this.userForDependency.roles[0];
          const depLite = { idDependency: dep.idDependency ?? 0, name: dep.name };
          if (rol && rol.idRole === 3) {
            this.userForDependency.dependencies.push(depLite);
          } else if (rol && rol.idRole === 4) {
            this.userForDependency.dependencies = [depLite];
          }
        } else {
          this.addDependency(this.userForDependency, dep);
        }
      }
    }
    this.cancelAddDependency();
  }


  // Devuelve el username (parte antes de @) para el campo user
  getUserNameFromEmail(email: string): string {
    if (!email) return '';
    return email.split('@')[0].trim();
  }



  onRowEditInit(user: User) {
    this.clonedUsers[user.idUser!] = { ...user };
  }

  onRowEditSave(user: User) {
    // Generar username automáticamente desde el email antes de validar
    if (user.email?.trim()) {
      user.username = this.getUserNameFromEmail(user.email);
    }
    
    // Validar campos requeridos
    if (!this.isValidUser(user)) {
      this.toastr.error('Por favor ingrese un email válido', 'Error de validación');
      return;
    }
    
    // Al enviar, mandamos el username (parte antes de @) como 'user'
    const userPayload = { ...user, user: this.getUserNameFromEmail(user.email) };
    
    if (user.idUser && user.idUser > 0) {
      // Usuario existente - mantener el idUser para actualización
      this.userService.update(user.idUser, userPayload).subscribe({
        next: (updated) => {
          this.toastr.success('Usuario actualizado correctamente.', 'Éxito');
          const idx = this.users.findIndex(u => u.idUser === user.idUser);
          if (idx !== -1) {
            this.users[idx] = updated;
            this.organizeUsersByRole();
          }
        },
        error: () => {
          this.toastr.error('Error al actualizar el usuario.', 'Error');
          const cloned = this.clonedUsers[user.idUser!];
          if (cloned) {
            const idx = this.users.findIndex(u => u.idUser === user.idUser);
            if (idx !== -1) {
              this.users[idx] = { ...cloned };
              this.organizeUsersByRole();
            }
          }
        }
      });
    } else {
      // Usuario nuevo - eliminar idUser del payload para creación
      const { idUser, ...newUserPayload } = userPayload;
      this.userService.create(newUserPayload).subscribe({
        next: () => {
          this.toastr.success('Usuario creado correctamente.', 'Éxito');
          this.loadUsersKeepingActiveTab();
        },
        error: () => {
          this.toastr.error('Error al crear el usuario.', 'Error');
          // Eliminar el usuario nuevo que no se pudo crear
          const userIdToRemove = user.idUser;
          this.users = this.users.filter(u => u.idUser !== userIdToRemove);
          this.organizeUsersByRole();
        }
      });
    }
    delete this.editingRowKeys[user.idUser!];
    delete this.clonedUsers[user.idUser!];
  }

  onRowEditCancel(user: User, index: number) {
    if (user.idUser && user.idUser > 0) {
      // Usuario existente - restaurar datos clonados
      const cloned = this.clonedUsers[user.idUser];
      if (cloned) {
        const idx = this.users.findIndex(u => u.idUser === user.idUser);
        if (idx !== -1) {
          this.users[idx] = { ...cloned };
          // Reorganizar por roles después de restaurar
          this.organizeUsersByRole();
        }
      }
    } else {
      // Usuario nuevo - eliminar completamente
      const userIdToRemove = user.idUser;
      this.users = this.users.filter(u => u.idUser !== userIdToRemove);
      // Reorganizar por roles después de eliminar
      this.organizeUsersByRole();
      this.toastr.info('Usuario no guardado eliminado.', 'Información');
    }
    delete this.editingRowKeys[user.idUser!];
    delete this.clonedUsers[user.idUser!];
  }

  addNewUser() {
    // If no tab is selected or no roles available, don't proceed
    if (!this.currentActiveTabRoleId || this.availableRoles.length === 0) {
      this.toastr.warning('Por favor selecciona un tab de rol primero.', 'Advertencia');
      return;
    }

    // Find the role for the current active tab
    const role = this.availableRoles.find(r => r.idRole === this.currentActiveTabRoleId);
    if (!role) {
      this.toastr.error('No se pudo encontrar el rol seleccionado.', 'Error');
      return;
    }

    // Create new user with the role from current tab
    const newUser = {
      idUser: this.newUserCounter--,
      username: '',
      email: '',
      ldap: false,
      enabled: true,
      roles: [role],
      dependencies: []
    } as User;
    
    // Add to users array and reorganize by role
    this.users = [...this.users, newUser];
    this.organizeUsersByRole();
    
    // Set editing mode for the new user
    this.editingRowKeys[newUser.idUser as any] = true;
  }

  addRole(user: User, role: Role) {
    if (!user.idUser) return;
    // Si el usuario es nuevo (idUser < 0), solo modificar localmente
    if (user.idUser < 0) {
      user.roles = [role];
      return;
    }
    user.roles = [role];
    this.userService.addRole(user.idUser, role).subscribe({
      next: () => {
        this.toastr.success('Rol añadido correctamente.', 'Éxito');
        this.loadUsers();
      },
      error: () => {
        this.toastr.error('Error al añadir el rol.', 'Error');
      }
    });
  }

  removeRole(user: User, role: Role) {
    if (!user.idUser) return;
    // Si el usuario es nuevo (idUser < 0), solo modificar localmente
    if (user.idUser < 0) {
      user.roles = [];
      return;
    }
    this.userService.removeRole(user.idUser, role).subscribe({
      next: () => {
        this.toastr.success('Rol quitado correctamente.', 'Éxito');
        this.loadUsers();
      },
      error: () => {
        this.toastr.error('Error al quitar el rol.', 'Error');
      }
    });
  }

  addDependency(user: User, dependency: Dependency) {
    if (!user.idUser || !dependency.idDependency) return;
    // No permitir duplicados
    if (user.dependencies.some(d => d.idDependency === dependency.idDependency)) {
      this.toastr.warning('La dependencia ya está asignada a este usuario.', 'Advertencia');
      return;
    }
    // Si el usuario es nuevo (idUser < 0), solo modificar localmente
    if (user.idUser < 0) {
      const rol = user.roles[0];
      const depLite = { idDependency: dependency.idDependency ?? 0, name: dependency.name };
      if (rol && rol.idRole === 3) {
        user.dependencies.push(depLite);
      } else if (rol && rol.idRole === 4) {
        user.dependencies = [depLite];
      }
      return;
    }
    // Adaptar a tipo esperado por el servicio (solo id y name si es necesario)
    const dep = { idDependency: dependency.idDependency, name: dependency.name };
    this.userService.addDependency(user.idUser, dep).subscribe({
      next: () => {
        this.toastr.success('Dependencia añadida correctamente.', 'Éxito');
        this.loadUsers();
      },
      error: () => {
        this.toastr.error('Error al añadir la dependencia.', 'Error');
      }
    });
  }

  removeDependency(user: User, dependency: Dependency) {
    if (!user.idUser || !dependency.idDependency) return;
    // Si el usuario es nuevo (idUser < 0), solo modificar localmente
    if (user.idUser < 0) {
      user.dependencies = user.dependencies.filter(d => d.idDependency !== dependency.idDependency);
      return;
    }
    const dep = { idDependency: dependency.idDependency, name: dependency.name };
    this.userService.removeDependency(user.idUser, dep).subscribe({
      next: () => {
        this.toastr.success('Dependencia quitada correctamente.', 'Éxito');
        this.loadUsers();
      },
      error: () => {
        this.toastr.error('Error al quitar la dependencia.', 'Error');
      }
    });
  }

  isValidUser(user: User): boolean {
    // Solo validar email ya que username se genera automáticamente desde email
    const email = user.email?.trim();
    if (!email) return false;
    
    // Validación básica de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  eliminarUsuario(index: number, user: User) {
    if (user.idUser && user.idUser > 0) {
      this.userToDelete = user;
      this.userToDeleteIndex = index;
      this.showDeleteConfirmation = true;
    } else {
      // Usuario nuevo - eliminar directamente sin confirmación
      const userIdToRemove = user.idUser;
      this.users = this.users.filter(u => u.idUser !== userIdToRemove);
      this.organizeUsersByRole();
      this.toastr.info('Usuario no guardado eliminado.', 'Información');
    }
  }

  confirmDelete() {
    if (this.userToDelete && this.userToDelete.idUser) {
      this.userService.delete(this.userToDelete.idUser).subscribe({
        next: () => {
          // Eliminar del array principal usando filter en lugar de splice
          const userIdToRemove = this.userToDelete!.idUser;
          this.users = this.users.filter(u => u.idUser !== userIdToRemove);
          this.organizeUsersByRole();
          this.toastr.success('Usuario eliminado correctamente.', 'Éxito');
          this.cancelDelete();
        },
        error: () => {
          this.toastr.error('Error al eliminar el usuario.', 'Error');
          this.cancelDelete();
        }
      });
    }
  }

  cancelDelete() {
    this.showDeleteConfirmation = false;
    this.userToDelete = null;
    this.userToDeleteIndex = null;
  }

  // Métodos para controlar dependencias según el rol
  mostrarBotonAgregarDependencia(user: User): boolean {
    if (!user.roles || user.roles.length === 0) return false;
    const rol = user.roles[0];
    // ADMIN (1), GPLANEAMIENTO (5), GPRESUPUESTO (6) no pueden tener dependencias
    if ([1, 5, 6].includes(rol.idRole)) return false;
    // UPLANEAMIENTO (3) puede tener varias dependencias
    if (rol.idRole === 3) return true;
    // UDEPENDENCIA (4) solo una dependencia
    if (rol.idRole === 4) return user.dependencies.length < 1;
    return false;
  }

  mostrarBotonQuitarDependencia(user: User): boolean {
    if (!user.roles || user.roles.length === 0) return false;
    const rol = user.roles[0];
    // ADMIN (1), GPLANEAMIENTO (5), GPRESUPUESTO (6) no pueden tener dependencias
    if ([1, 5, 6].includes(rol.idRole)) return false;
    // UPLANEAMIENTO (3) puede tener varias dependencias
    if (rol.idRole === 3) return user.dependencies.length > 0;
    // UDEPENDENCIA (4) solo una dependencia
    if (rol.idRole === 4) return user.dependencies.length === 1;
    return false;
  }

  // Ya no se fuerza el dominio en el blur
  onEmailBlur(user: User) {
    // No hacer nada
  }

  resetPassword(user: User) {
    if (!user.idUser) return;
    this.resettingUserId = user.idUser;
    this.userService.resetPassword(user.idUser).subscribe({
      next: () => {
        this.toastr.success('La contraseña fue restablecida y enviada al correo institucional.', 'Éxito');
        this.resettingUserId = null;
      },
      error: () => {
        this.toastr.error('No se pudo restablecer la contraseña.', 'Error');
        this.resettingUserId = null;
      }
    });
  }
}
