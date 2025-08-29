import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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
import { forkJoin, Observable } from 'rxjs';

import { User } from '../../../models/auth/user.model';
import { Role } from '../../../models/auth/role.model';
import { Dependency } from '../../../models/logic/dependency.model';
import { UserService } from '../../../core/services/authentication/user.service';
import { DependencyService } from '../../../core/services/logic/dependency.service';
import { Table } from 'primeng/table';



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
    ChipModule
  ],
  templateUrl: './adm-usuarios-tabla.component.html',
  styleUrl: './adm-usuarios-tabla.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class AdmUsuariosTablaComponent implements OnInit {
  enableUser(user: User) {
    if (!user.idUser) return;
    const updated: User = { ...user, enabled: true };
    this.userService.update(user.idUser, updated).subscribe({
      next: () => {
        this.toastr.success('Usuario dado de alta correctamente.', 'Éxito');
        this.loadUsers();
      },
      error: () => {
        this.toastr.error('Error al dar de alta el usuario.', 'Error');
      }
    });
  }
  users: User[] = [];
  allUsers: User[] = [];
  loading = false;
  clonedUsers: { [s: string]: User } = {};
  editingRowKeys: { [s: string]: boolean } = {};
  newUserCounter = -1;
  showDeleteConfirmation = false;
  userToDelete: User | null = null;
  userToDeleteIndex: number | null = null;

  showAddRoleDialog = false;
  showAddDependencyDialog = false;
  availableRoles: Role[] = [];
  availableDependencies: Dependency[] = [];
  selectedRoleId: number | null = null;
  selectedDependencyId: number | null = null;
  userForRole: User | null = null;
  userForDependency: User | null = null;

  resettingUserId: number | null = null;

  @ViewChild('userTable') userTable!: Table;

  constructor(
    private userService: UserService,
    private toastr: ToastrService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dependencyService: DependencyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (data) => {
        this.allUsers = data;
        this.users = [...data];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Error al cargar los usuarios.', 'Error');
      }
    });
  }

  private loadAvailableRoles() {
    const allRoles: Role[] = this.allUsers.flatMap(u => u.roles || []);
    this.availableRoles = allRoles.filter((r, i, arr) => arr.findIndex(rr => rr.idRole === r.idRole) === i);
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
        // Si es usuario nuevo, solo asigna localmente
        // Si es existente, llama a addRole
        if (this.userForRole.idUser && this.userForRole.idUser > 0) {
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
    // No modificar el email, solo validar
    if (!this.isValidUser(user)) {
      this.toastr.error('Por favor complete todos los campos requeridos', 'Error de validación');
      return;
    }
    // Al enviar, mandamos el username (parte antes de @) como 'user'
    const userPayload = { ...user, user: this.getUserNameFromEmail(user.email) };
    if (user.idUser && user.idUser > 0) {
      this.userService.update(user.idUser, userPayload).subscribe({
        next: (updated) => {
          this.toastr.success('Usuario actualizado correctamente.', 'Éxito');
          const idx = this.users.findIndex(u => u.idUser === user.idUser);
          if (idx !== -1) {
            this.users[idx] = updated;
            this.users = [...this.users];
          }
        },
        error: () => {
          this.toastr.error('Error al actualizar el usuario.', 'Error');
          const cloned = this.clonedUsers[user.idUser!];
          if (cloned) {
            const idx = this.users.findIndex(u => u.idUser === user.idUser);
            if (idx !== -1) {
              this.users[idx] = { ...cloned };
              this.users = [...this.users];
            }
          }
        }
      });
    } else {
      this.userService.create(userPayload).subscribe({
        next: () => {
          this.toastr.success('Usuario creado correctamente.', 'Éxito');
          this.loadUsers();
        },
        error: () => {
          this.toastr.error('Error al crear el usuario.', 'Error');
          const idx = this.users.findIndex(u => u.idUser === user.idUser);
          if (idx !== -1) {
            this.users.splice(idx, 1);
            this.users = [...this.users];
          }
        }
      });
    }
    delete this.editingRowKeys[user.idUser!];
    delete this.clonedUsers[user.idUser!];
  }

  onRowEditCancel(user: User, index: number) {
    if (user.idUser && user.idUser > 0) {
      const cloned = this.clonedUsers[user.idUser];
      if (cloned) {
        const idx = this.users.findIndex(u => u.idUser === user.idUser);
        if (idx !== -1) {
          this.users[idx] = { ...cloned };
        }
      }
    } else {
      this.users.splice(index, 1);
      this.users = [...this.users];
    }
    delete this.editingRowKeys[user.idUser!];
    delete this.clonedUsers[user.idUser!];
  }

  addNewUser() {
    // Crea el usuario vacío y permite edición directa
    const newUser = {
      idUser: this.newUserCounter--,
      username: '',
      email: '',
      ldap: false,
      enabled: true,
      roles: [],
      dependencies: []
    } as User;
    this.users = [...this.users, newUser];
    this.editingRowKeys[newUser.idUser as any] = true;
    // Forzar actualización y mover paginación
    setTimeout(() => {
      this.cdr.detectChanges();
      if (this.userTable) {
        const total = this.users.length;
        const rows = 9;
        const lastPage = Math.ceil(total / rows) - 1;
        this.userTable.first = lastPage * rows;
      }
    }, 0);
  }

  disableUser(user: User) {
    if (!user.idUser) return;
    const updated: User = { ...user, enabled: false };
    this.userService.update(user.idUser, updated).subscribe({
      next: () => {
        this.toastr.success('Usuario dado de baja correctamente.', 'Éxito');
        this.loadUsers();
      },
      error: () => {
        this.toastr.error('Error al dar de baja el usuario.', 'Error');
      }
    });
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
    return !!(user.username?.trim() && user.email?.trim());
  }

  eliminarUsuario(index: number, user: User) {
    if (user.idUser && user.idUser > 0) {
      this.userToDelete = user;
      this.userToDeleteIndex = index;
      this.showDeleteConfirmation = true;
    } else {
      this.users.splice(index, 1);
      this.users = [...this.users];
      this.toastr.info('Usuario no guardado eliminado.', 'Información');
    }
  }

  confirmDelete() {
    if (this.userToDelete && this.userToDelete.idUser) {
      this.userService.delete(this.userToDelete.idUser).subscribe({
        next: () => {
          if (this.userToDeleteIndex !== null) {
            this.users.splice(this.userToDeleteIndex, 1);
            this.users = [...this.users];
          }
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
