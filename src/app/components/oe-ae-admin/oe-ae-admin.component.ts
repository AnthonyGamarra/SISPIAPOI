import { Component, OnInit } from '@angular/core';
import { StrategicObjective } from '../../models/logic/strategicObjective.model';
import { StrategicAction } from '../../models/logic/strategicAction.model';
import { StrategicObjectiveService } from '../../core/services/logic/strategic-objective.service';
import { StrategicActionService } from '../../core/services/logic/strategic-action.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastrService } from 'ngx-toastr';
import { ConfirmationService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';


@Component({
  selector: 'app-oe-ae-admin',
  templateUrl: './oe-ae-admin.component.html',
  styleUrls: ['./oe-ae-admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    CardModule,
    DialogModule,
    CheckboxModule,
    DropdownModule,
    CalendarModule,
    ConfirmDialogModule,
    TextareaModule
  ],
  providers: [ConfirmationService]
})
export class OeAeAdminComponent implements OnInit {
  objectives: StrategicObjective[] = [];
  displayObjectives: StrategicObjective[] = [];
  actions: StrategicAction[] = [];
  selectedObjective?: StrategicObjective;
  years: { label: string, value: number }[] = [];
  selectedYear: { label: string, value: number } | null = null;

  showObjectiveForm = false;
  editingObjective: StrategicObjective | null = null;
  objectiveForm: Partial<StrategicObjective> = {
    code: '',
    name: '',
    startYear: new Date().getFullYear()
  };

  showActionForm = false;
  editingAction: StrategicAction | null = null;
  actionForm: Partial<StrategicAction> = {
    code: '',
    name: '',
    strategicObjective: {} as StrategicObjective
  };

  showReplicateDialog = false;
  replicateYear?: number;

  constructor(
    private objectiveService: StrategicObjectiveService,
    private actionService: StrategicActionService,
    private toastr: ToastrService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadObjectives(new Date().getFullYear());
  }

  loadObjectives(setYear?: number) {
    this.objectiveService.getAll().subscribe(data => {
      this.objectives = data;
      const yearSet = new Set<number>();
      if (data && data.length > 0) {
        data.forEach(o => {
          if (o.startYear) {
            yearSet.add(Number(o.startYear));
          }
        });
      }
      const yearList = Array.from(yearSet).sort((a, b) => b - a);
      if (setYear && !yearList.includes(setYear)) {
        yearList.unshift(setYear);
      }
      this.years = yearList.map(y => ({ label: y.toString(), value: y }));
      // Selecciona el año como objeto
      const foundYear = this.years.find(y => y.value === setYear);
      if (foundYear) {
        this.selectedYear = foundYear;
      } else if (this.years.length > 0) {
        this.selectedYear = this.years[0];
      } else {
        this.selectedYear = null;
      }
      this._filterObjectives();
      this.selectDefaultObjective();
    });
  }
  
  private _filterObjectives(): void {
    // 1. Filtramos por el año seleccionado
    const yearValue = this.selectedYear ? this.selectedYear.value : null;
    this.displayObjectives = this.objectives.filter(o => Number(o.startYear) === yearValue);
    // 2. Ordenamos los objetivos por código
    this.displayObjectives.sort((a, b) => a.code.localeCompare(b.code));
    this.selectedObjective = undefined;
    this.actions = [];
  }

  private selectDefaultObjective(): void {
    const defaultObjective = this.displayObjectives.find(o => o.code === '1');
    if (defaultObjective) {
      this.onSelectObjective(defaultObjective);
    }
  }

  onSelectObjective(objective: StrategicObjective) {
    this.selectedObjective = objective;
    this.actionService.getAll().subscribe(actions => {
      // 1. Filtramos las acciones por el objetivo seleccionado
      this.actions = actions.filter(a => a.strategicObjective.idStrategicObjective === objective.idStrategicObjective);
      // 2. Ordenamos las acciones por código
      this.actions.sort((a, b) => a.code.localeCompare(b.code));
    });
  }

  onYearChange(yearObj: { label: string, value: number }) {
    this.selectedYear = yearObj;
    this._filterObjectives();
    this.selectDefaultObjective();
  }

  // --- OE ---
  openNewObjectiveForm() {
    this.editingObjective = null;
    this.objectiveForm = {
      code: '',
      name: '',
      startYear: this.selectedYear ? this.selectedYear.value : new Date().getFullYear()
    };
    this.showObjectiveForm = true;
  }

  openEditObjectiveForm(obj: StrategicObjective) {
    this.editingObjective = obj;
    this.objectiveForm = {
      code: obj.code,
      name: obj.name,
      startYear: obj.startYear
    };
    this.showObjectiveForm = true;
  }

  saveObjective() {
    const yearNum = Number(this.objectiveForm.startYear);
    // Validar código duplicado en el año
    const exists = this.objectives.some(o => Number(o.startYear) === yearNum && o.code === String(this.objectiveForm.code) && (!this.editingObjective || o.idStrategicObjective !== this.editingObjective.idStrategicObjective));
    if (exists) {
      this.toastr.error('Ya existe un OE con ese código en el año seleccionado', 'Código duplicado');
      return;
    }
    const obj: StrategicObjective = {
      ...this.editingObjective,
      code: this.objectiveForm.code!,
      name: this.objectiveForm.name!,
      startYear: yearNum,
      endYear: yearNum,
      active: true
    };
    if (this.editingObjective) {
      this.objectiveService.update(obj).subscribe({
        next: () => {
          this.loadObjectives(yearNum);
          this.showObjectiveForm = false;
          this.toastr.success('Objetivo actualizado correctamente', 'Actualizado');
        },
        error: () => {
          this.toastr.error('No se pudo actualizar el objetivo', 'Error');
        }
      });
    } else {
      this.objectiveService.create(obj).subscribe({
        next: () => {
          this.loadObjectives(yearNum);
          this.showObjectiveForm = false;
          this.toastr.success('Objetivo creado correctamente', 'Creado');
        },
        error: () => {
          this.toastr.error('No se pudo crear el objetivo', 'Error');
        }
      });
    }
  }

  deleteObjective(obj: StrategicObjective) {
    this.confirmationService.confirm({
      message: '¿Seguro que deseas eliminar este objetivo estratégico?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.objectiveService.delete(obj.idStrategicObjective!).subscribe({
          next: () => {
            this.loadObjectives(Number(obj.startYear));
            this.toastr.success('Objetivo eliminado correctamente', 'Eliminado');
          },
          error: () => {
            this.toastr.error('No se pudo eliminar el objetivo', 'Error');
          }
        });
      }
    });
  }

  // --- AE ---
  openNewActionForm() {
    if (!this.selectedObjective) return;
    this.editingAction = null;
    this.actionForm = {
      code: '',
      name: '',
      strategicObjective: this.selectedObjective
    };
    this.showActionForm = true;
  }

  openEditActionForm(ae: StrategicAction) {
    this.editingAction = ae;
    this.actionForm = {
      code: ae.code,
      name: ae.name,
      strategicObjective: ae.strategicObjective
    };
    this.showActionForm = true;
  }

  saveAction() {
    if (!this.selectedObjective) return;
    // Validar código duplicado en el OE
    const exists = this.actions.some(a => a.code === String(this.actionForm.code) && (!this.editingAction || a.idStrategicAction !== this.editingAction.idStrategicAction));
    if (exists) {
      this.toastr.error('Ya existe una AE con ese código en el OE seleccionado', 'Código duplicado');
      return;
    }
    const ae: StrategicAction = {
      ...this.editingAction,
      code: this.actionForm.code!,
      name: this.actionForm.name!,
      active: true,
      strategicObjective: this.selectedObjective
    };
    if (this.editingAction) {
      this.actionService.update(ae).subscribe({
        next: () => {
          this.onSelectObjective(this.selectedObjective!);
          this.showActionForm = false;
          this.toastr.success('Acción actualizada correctamente', 'Actualizado');
        },
        error: () => {
          this.toastr.error('No se pudo actualizar la acción', 'Error');
        }
      });
    } else {
      this.actionService.create(ae).subscribe({
        next: () => {
          this.onSelectObjective(this.selectedObjective!);
          this.showActionForm = false;
          this.toastr.success('Acción creada correctamente', 'Creada');
        },
        error: () => {
          this.toastr.error('No se pudo crear la acción', 'Error');
        }
      });
    }
  }

  deleteAction(ae: StrategicAction) {
    this.confirmationService.confirm({
      message: '¿Seguro que deseas eliminar esta acción estratégica?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.actionService.delete(ae.idStrategicAction!).subscribe({
          next: () => {
            if (this.selectedObjective) {
              this.onSelectObjective(this.selectedObjective);
            }
            this.toastr.success('Acción eliminada correctamente', 'Eliminada');
          },
          error: () => {
            this.toastr.error('No se pudo eliminar la acción', 'Error');
          }
        });
      }
    });
  }

  // --- Replicar ---
  openReplicateDialog() {
    this.replicateYear = undefined;
    this.showReplicateDialog = true;
  }

  replicateObjectivesAndActions() {
    let yearDestino: number;
    if (this.replicateYear && typeof this.replicateYear === 'object' && 'getFullYear' in this.replicateYear) {
      yearDestino = (this.replicateYear as Date).getFullYear();
    } else {
      yearDestino = Number(this.replicateYear);
    }
    if (!this.selectedYear || !yearDestino || Number(this.selectedYear.value) === yearDestino) return;
    const yearOrigen = this.selectedYear ? this.selectedYear.value : null;
    const objectivesToReplicate = this.objectives.filter(o => yearOrigen !== null && Number(o.startYear) === Number(yearOrigen));
    this.actionService.getAll().subscribe(allActions => {
      const actionsToReplicate = allActions.filter(a => objectivesToReplicate.some(o => o.idStrategicObjective === a.strategicObjective.idStrategicObjective));
      let createdCount = 0;
      objectivesToReplicate.forEach((o) => {
        const newObjective: StrategicObjective = {
          code: o.code,
          name: o.name,
          startYear: yearDestino,
          endYear: yearDestino,
          active: true
        };
        this.objectiveService.create(newObjective).subscribe(newObj => {
          const relatedActions = actionsToReplicate.filter(a => a.strategicObjective.idStrategicObjective === o.idStrategicObjective);
          let actionsCreated = 0;
          if (relatedActions.length === 0) {
            createdCount++;
            if (createdCount === objectivesToReplicate.length) {
              this.loadObjectives(yearDestino);
              this.showReplicateDialog = false;
              this.toastr.success('Objetivos y Acciones Estratégicas replicados correctamente', 'Replicado');
            }
          }
          relatedActions.forEach(a => {
            const newAction: StrategicAction = {
              code: a.code,
              name: a.name,
              active: true,
              strategicObjective: newObj
            };
            this.actionService.create(newAction).subscribe(() => {
              actionsCreated++;
              if (actionsCreated === relatedActions.length) {
                createdCount++;
                if (createdCount === objectivesToReplicate.length) {
                  this.loadObjectives(yearDestino);
                  this.showReplicateDialog = false;
                  this.toastr.success('Objetivos y Acciones Estratégicas replicados correctamente', 'Replicado');
                }
              }
            });
          });
        });
      });
    });
  }
}