import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Table } from 'primeng/table';
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
import { CheckboxModule } from 'primeng/checkbox';
import { Ipress } from '../../../models/logic/ipress.model';
import { IpressLevel } from '../../../models/logic/ipressLevel.model';
import { IpressComplexity } from '../../../models/logic/ipressComplexity.model';
import { Dependency } from '../../../models/logic/dependency.model';
import { IpressService } from '../../../core/services/logic/ipress.service';
import { IpressLevelService } from '../../../core/services/logic/ipress-level.service';
import { IpressComplexityService } from '../../../core/services/logic/ipress-complexity.service';
import { DependencyService } from '../../../core/services/logic/dependency.service';
@Component({
  selector: 'app-adm-maestro-ipress-tabla',
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
    CheckboxModule
  ],
  templateUrl: './adm-maestro-ipress-tabla.component.html',
  styleUrl: './adm-maestro-ipress-tabla.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class AdmMaestroIpressTablaComponent implements OnInit {
  // Table refs
  @ViewChild('ipressTable') ipressTable!: Table;
  @ViewChild('levelsTable') levelsTable!: Table;
  @ViewChild('complexitiesTable') complexitiesTable!: Table;

  // Data
  ipresses: Ipress[] = [];
  clonedRows: { [id: string]: Ipress } = {};
  editingRowKeys: { [id: string]: boolean } = {};
  loading = false;

  // Form helpers
  selectedSize: any = 'small';
  sizes = [
    { name: 'Pequeño', value: 'small' },
    { name: 'Normal', value: 'normal' },
    { name: 'Grande', value: 'large' }
  ];
  globalFilterValue = '';
  tmpIdCounter = -1;
  // pagination helpers for levels and complexities
  levelRowsPerPage = 5;
  levelFirst = 0;
  complexityRowsPerPage = 5;
  complexityFirst = 0;

  // Catalogs
  levels: IpressLevel[] = [];
  complexities: IpressComplexity[] = [];
  dependencies: Dependency[] = [];

  // Level admin helpers
  clonedLevelRows: { [id: string]: IpressLevel } = {};
  editingLevelRowKeys: { [id: string]: boolean } = {};
  showDeleteLevelConfirmation = false;
  levelToDelete: IpressLevel | null = null;

  // Complexity admin helpers
  clonedComplexityRows: { [id: string]: IpressComplexity } = {};
  editingComplexityRowKeys: { [id: string]: boolean } = {};
  showDeleteComplexityConfirmation = false;
  complexityToDelete: IpressComplexity | null = null;

  // Delete dialog
  showDeleteConfirmation = false;
  rowToDelete: Ipress | null = null;

  constructor(
    private ipressService: IpressService,
    private ipressLevelService: IpressLevelService,
    private ipressComplexityService: IpressComplexityService,
    private dependencyService: DependencyService,
    private toastr: ToastrService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll() {
    this.loading = true;
    Promise.all([
      this.loadLevels(),
      this.loadComplexities(),
      this.loadDependencies(),
      this.loadIpresses()
    ])
      .then(() => (this.loading = false))
      .catch(() => (this.loading = false));
  }

  private loadIpresses(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ipressService.getAll().subscribe({
        next: (data) => {
          this.ipresses = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          resolve();
        },
        error: (err) => {
          this.toastr.error('Error al cargar IPRESS', 'Error');
          reject(err);
        }
      });
    });
  }

  private loadLevels(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ipressLevelService.getAll().subscribe({
        next: (data) => {
          this.levels = data.filter(d => d.active !== false).sort((a, b) => a.name.localeCompare(b.name));
          resolve();
        },
        error: (err) => reject(err)
      });
    });
  }

  private loadComplexities(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ipressComplexityService.getAll().subscribe({
        next: (data) => {
          this.complexities = data.filter(d => d.active !== false).sort((a, b) => a.name.localeCompare(b.name));
          resolve();
        },
        error: (err) => reject(err)
      });
    });
  }

  private loadDependencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dependencyService.getAll().subscribe({
        next: (data) => {
          // Keep only active dependencies with dependencyType=2, social=false, excluding ids 115 and 116
          this.dependencies = data
            .filter(d => d.active !== false)
            .filter(d => (d.dependencyType?.idDependencyType === 2) && d.social === false && d.ospe === false)
            .filter(d => d.idDependency !== 115 && d.idDependency !== 116)
            .sort((a, b) => a.name.localeCompare(b.name));
          resolve();
        },
        error: (err) => reject(err)
      });
    });
  }

  // Table operations
  addNewRow() {
    const newRow: Ipress = {
      idIpress: this.tmpIdCounter--,
  code: '',
      name: '',
      active: true,
      dependency: {} as Dependency,
      ipressLevel: {} as IpressLevel,
      ipressComplexity: {} as IpressComplexity
    };
    this.ipresses = [newRow, ...this.ipresses];
    this.editingRowKeys[newRow.idIpress as any] = true;
  }

  onRowEditInit(row: Ipress) {
    if (row.idIpress != null) this.clonedRows[row.idIpress] = { ...row };
  }

  onRowEditSave(row: Ipress) {
    if (!this.isValid(row)) {
      this.toastr.error('Código (4 caracteres alfanuméricos), nombre, nivel, complejidad y dependencia son obligatorios', 'Validación');
      return;
    }

    // Build payload with nested ids preserved
    const payload: Ipress = {
      ...row,
      dependency: row.dependency?.idDependency ? { idDependency: row.dependency.idDependency, name: row.dependency.name } as any : row.dependency,
      ipressLevel: row.ipressLevel?.idIpressLevel ? { idIpressLevel: row.ipressLevel.idIpressLevel, name: row.ipressLevel.name } as any : row.ipressLevel,
      ipressComplexity: row.ipressComplexity?.idIpressComplexity ? { idIpressComplexity: row.ipressComplexity.idIpressComplexity, name: row.ipressComplexity.name } as any : row.ipressComplexity
    };

    if (row.idIpress && row.idIpress > 0) {
      this.ipressService.update(row.idIpress, payload).subscribe({
        next: (res) => {
          this.toastr.success('IPRESS actualizada', 'Éxito');
          delete this.editingRowKeys[row.idIpress as any];
          delete this.clonedRows[row.idIpress as any];
        },
        error: () => this.toastr.error('No se pudo actualizar', 'Error')
      });
    } else {
      const { idIpress, createTime, ...toCreate } = payload as any;
      this.ipressService.create(toCreate as Ipress).subscribe({
        next: (created) => {
          // Replace temp row id with backend id
          this.ipresses = this.ipresses.map(r => (r === row ? { ...created } : r));
          this.toastr.success('IPRESS creada', 'Éxito');
          if (created.idIpress) {
            delete this.editingRowKeys[row.idIpress as any];
            delete this.clonedRows[row.idIpress as any];
          }
        },
        error: () => this.toastr.error('No se pudo crear', 'Error')
      });
    }
  }

  onRowEditCancel(row: Ipress, index: number) {
    if (row.idIpress && row.idIpress > 0) {
      const original = this.clonedRows[row.idIpress];
      if (original) this.ipresses[index] = original;
    } else {
      // remove temp row
      this.ipresses = this.ipresses.filter(r => r !== row);
    }
    if (row.idIpress != null) {
      delete this.editingRowKeys[row.idIpress as any];
      delete this.clonedRows[row.idIpress as any];
    }
  }

  // Delete flow
  eliminarRow(row: Ipress) {
    if (row.idIpress && row.idIpress > 0) {
      this.rowToDelete = row;
      this.showDeleteConfirmation = true;
    } else {
      this.ipresses = this.ipresses.filter(r => r !== row);
      this.toastr.info('Fila no guardada eliminada', 'Información');
    }
  }

  confirmDelete() {
    if (!this.rowToDelete?.idIpress) return;
    const id = this.rowToDelete.idIpress;
    this.loading = true;
    this.ipressService.delete(id).subscribe({
      next: () => {
        this.ipresses = this.ipresses.filter(r => r.idIpress !== id);
        this.toastr.success('IPRESS eliminada', 'Éxito');
        this.cancelDelete();
      },
      error: () => {
        this.toastr.error('No se pudo eliminar', 'Error');
        this.cancelDelete();
      }
    });
  }

  cancelDelete() {
    this.showDeleteConfirmation = false;
    this.rowToDelete = null;
    this.loading = false;
  }

  // Select change helpers
  onLevelChange(row: Ipress, id?: number) {
    if (!id) { row.ipressLevel = {} as any; return; }
    const found = this.levels.find(l => l.idIpressLevel === id);
    if (found) row.ipressLevel = found;
  }

  onComplexityChange(row: Ipress, id?: number) {
    if (!id) { row.ipressComplexity = {} as any; return; }
    const found = this.complexities.find(c => c.idIpressComplexity === id);
    if (found) row.ipressComplexity = found;
  }

  onDependencyChange(row: Ipress, id?: number) {
    if (!id) { row.dependency = {} as any; return; }
    const found = this.dependencies.find(d => d.idDependency === id);
    if (found) row.dependency = found;
  }

  // Utilities
  isValid(row: Ipress): boolean {
    const code = (row.code || '').trim();
    const is4AlphaNum = /^[A-Za-z0-9]{4}$/.test(code);
    return !!(
      is4AlphaNum &&
      row.name?.trim() &&
      row.ipressLevel?.idIpressLevel &&
      row.ipressComplexity?.idIpressComplexity &&
      row.dependency?.idDependency
    );
  }

  clear(table: any) {
    table.clear();
    this.globalFilterValue = '';
  }

  onGlobalFilter(table: any, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  getSeverity(active?: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  getStatusText(active?: boolean): string {
    return active ? 'Activo' : 'Inactivo';
  }

  // Enforce only 4 alphanumeric characters in IPRESS code input
  onCodeInput(row: Ipress, event: Event) {
    const input = (event.target as HTMLInputElement);
    const sanitized = input.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
    row.code = sanitized;
    input.value = sanitized;
  }

  // Level admin CRUD
  addNewLevelRow() {
  const newRow: IpressLevel = { idIpressLevel: this.tmpIdCounter--, name: '', description: '', active: true } as any;
  // add at end
  this.levels = [...this.levels, newRow];
  // go to last page where the new row resides
  const lastFirst = Math.floor((this.levels.length - 1) / this.levelRowsPerPage) * this.levelRowsPerPage;
  this.levelFirst = lastFirst;
  // set edit mode for the new row
  this.editingLevelRowKeys[newRow.idIpressLevel as any] = true;
  }

  onLevelRowEditInit(row: IpressLevel) {
    if (row.idIpressLevel != null) this.clonedLevelRows[row.idIpressLevel] = { ...row };
  }

  onLevelRowEditSave(row: IpressLevel) {
    const name = (row.name || '').trim();
    const description = (row.description || '').trim();
    if (!name) {
      this.toastr.error('Ingrese nombre de nivel', 'Validación');
      return;
    }
    if (row.idIpressLevel && row.idIpressLevel > 0) {
      this.ipressLevelService.update(row.idIpressLevel, { idIpressLevel: row.idIpressLevel, name, description } as IpressLevel).subscribe({
        next: () => {
          this.toastr.success('Nivel actualizado', 'Éxito');
          delete this.editingLevelRowKeys[row.idIpressLevel as any];
          delete this.clonedLevelRows[row.idIpressLevel as any];
          // refresh catalogs and potentially ipresses to reflect new names
          this.loadLevels();
          this.loadIpresses();
        },
        error: () => this.toastr.error('No se pudo actualizar el nivel', 'Error')
      });
    } else {
      const { idIpressLevel, createTime, active, ...toCreate } = row as any;
      this.ipressLevelService.create({ name, description } as IpressLevel).subscribe({
        next: (created) => {
          this.levels = this.levels.map(r => (r === row ? { ...created } : r));
          this.toastr.success('Nivel creado', 'Éxito');
          if (created.idIpressLevel) {
            delete this.editingLevelRowKeys[row.idIpressLevel as any];
            delete this.clonedLevelRows[row.idIpressLevel as any];
          }
          this.loadLevels();
        },
        error: () => this.toastr.error('No se pudo crear el nivel', 'Error')
      });
    }
  }

  onLevelRowEditCancel(row: IpressLevel, index: number) {
    if (row.idIpressLevel && row.idIpressLevel > 0) {
      const original = this.clonedLevelRows[row.idIpressLevel];
      if (original) this.levels[index] = original;
    } else {
      this.levels = this.levels.filter(r => r !== row);
    }
    if (row.idIpressLevel != null) {
      delete this.editingLevelRowKeys[row.idIpressLevel as any];
      delete this.clonedLevelRows[row.idIpressLevel as any];
    }
  }

  eliminarLevelRow(row: IpressLevel) {
    if (row.idIpressLevel && row.idIpressLevel > 0) {
      this.levelToDelete = row;
      this.showDeleteLevelConfirmation = true;
    } else {
      this.levels = this.levels.filter(r => r !== row);
      this.toastr.info('Fila no guardada eliminada', 'Información');
    }
  }

  confirmDeleteLevel() {
    if (!this.levelToDelete?.idIpressLevel) return;
    const id = this.levelToDelete.idIpressLevel;
    this.loading = true;
    this.ipressLevelService.delete(id).subscribe({
      next: () => {
        this.levels = this.levels.filter(r => r.idIpressLevel !== id);
        this.toastr.success('Nivel eliminado', 'Éxito');
        this.cancelDeleteLevel();
        // update selects in IPRESS table
        this.loadLevels();
      },
      error: () => {
        this.toastr.error('No se pudo eliminar el nivel', 'Error');
        this.cancelDeleteLevel();
      }
    });
  }

  cancelDeleteLevel() {
    this.showDeleteLevelConfirmation = false;
    this.levelToDelete = null;
    this.loading = false;
  }

  // Complexity admin CRUD
  addNewComplexityRow() {
  const newRow: IpressComplexity = { idIpressComplexity: this.tmpIdCounter--, name: '', description: '', active: true } as any;
  // add at end
  this.complexities = [...this.complexities, newRow];
  // go to last page where the new row resides
  const lastFirst = Math.floor((this.complexities.length - 1) / this.complexityRowsPerPage) * this.complexityRowsPerPage;
  this.complexityFirst = lastFirst;
  // set edit mode for the new row
  this.editingComplexityRowKeys[newRow.idIpressComplexity as any] = true;
  }

  onComplexityRowEditInit(row: IpressComplexity) {
    if (row.idIpressComplexity != null) this.clonedComplexityRows[row.idIpressComplexity] = { ...row };
  }

  onComplexityRowEditSave(row: IpressComplexity) {
    const name = (row.name || '').trim();
    const description = (row.description || '').trim();
    if (!name) {
      this.toastr.error('Ingrese nombre de complejidad', 'Validación');
      return;
    }
    if (row.idIpressComplexity && row.idIpressComplexity > 0) {
      this.ipressComplexityService.update(row.idIpressComplexity, { idIpressComplexity: row.idIpressComplexity, name, description } as IpressComplexity).subscribe({
        next: () => {
          this.toastr.success('Complejidad actualizada', 'Éxito');
          delete this.editingComplexityRowKeys[row.idIpressComplexity as any];
          delete this.clonedComplexityRows[row.idIpressComplexity as any];
          this.loadComplexities();
          this.loadIpresses();
        },
        error: () => this.toastr.error('No se pudo actualizar la complejidad', 'Error')
      });
    } else {
      const { idIpressComplexity, createTime, active, ...toCreate } = row as any;
      this.ipressComplexityService.create({ name, description } as IpressComplexity).subscribe({
        next: (created) => {
          this.complexities = this.complexities.map(r => (r === row ? { ...created } : r));
          this.toastr.success('Complejidad creada', 'Éxito');
          if (created.idIpressComplexity) {
            delete this.editingComplexityRowKeys[row.idIpressComplexity as any];
            delete this.clonedComplexityRows[row.idIpressComplexity as any];
          }
          this.loadComplexities();
        },
        error: () => this.toastr.error('No se pudo crear la complejidad', 'Error')
      });
    }
  }

  onComplexityRowEditCancel(row: IpressComplexity, index: number) {
    if (row.idIpressComplexity && row.idIpressComplexity > 0) {
      const original = this.clonedComplexityRows[row.idIpressComplexity];
      if (original) this.complexities[index] = original;
    } else {
      this.complexities = this.complexities.filter(r => r !== row);
    }
    if (row.idIpressComplexity != null) {
      delete this.editingComplexityRowKeys[row.idIpressComplexity as any];
      delete this.clonedComplexityRows[row.idIpressComplexity as any];
    }
  }

  eliminarComplexityRow(row: IpressComplexity) {
    if (row.idIpressComplexity && row.idIpressComplexity > 0) {
      this.complexityToDelete = row;
      this.showDeleteComplexityConfirmation = true;
    } else {
      this.complexities = this.complexities.filter(r => r !== row);
      this.toastr.info('Fila no guardada eliminada', 'Información');
    }
  }

  confirmDeleteComplexity() {
    if (!this.complexityToDelete?.idIpressComplexity) return;
    const id = this.complexityToDelete.idIpressComplexity;
    this.loading = true;
    this.ipressComplexityService.delete(id).subscribe({
      next: () => {
        this.complexities = this.complexities.filter(r => r.idIpressComplexity !== id);
        this.toastr.success('Complejidad eliminada', 'Éxito');
        this.cancelDeleteComplexity();
        this.loadComplexities();
      },
      error: () => {
        this.toastr.error('No se pudo eliminar la complejidad', 'Error');
        this.cancelDeleteComplexity();
      }
    });
  }

  cancelDeleteComplexity() {
    this.showDeleteComplexityConfirmation = false;
    this.complexityToDelete = null;
    this.loading = false;
  }
}
