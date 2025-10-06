import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityValidatorMiddleware {

  constructor(private toastr: ToastrService) {}

  validateActivity(product: OperationalActivity): boolean {
    if (!product.name || product.name.trim() === '') {
      this.toastr.error('El campo "Nombre de actividad" no puede estar vacío.', 'Error de validación');
      return false;
    }
    if (!product.measurementUnit || product.measurementUnit.trim() === '') {
      this.toastr.error('El campo "Unidad de medida" no puede estar vacío.', 'Error de validación');
      return false;
    }
    if (!product.strategicAction?.idStrategicAction || !product.strategicAction?.strategicObjective?.idStrategicObjective) {
      this.toastr.error('Debe seleccionar un Objetivo Estratégico y una Acción Estratégica.', 'Error de validación');
      return false;
    }
  // Removed validation for financialFund, managementCenter and costCenter
  // These fields were replaced by expenseConcept and are no longer required here.
    if (!product.measurementType?.idMeasurementType) {
      this.toastr.error('Debe seleccionar un Tipo de medida.', 'Error de validación');
      return false;
    }
    if (!product.priority?.idPriority) {
      this.toastr.error('Debe seleccionar una Prioridad.', 'Error de validación');
      return false;
    }
    // Validate numeric fields for goods, remuneration, services
    if (typeof product.goods !== 'number' || isNaN(product.goods)) {
      this.toastr.error('El campo "Bienes" debe ser un número válido.', 'Error de validación');
      return false;
    }
    if (typeof product.remuneration !== 'number' || isNaN(product.remuneration)) {
      this.toastr.error('El campo "Remuneraciones" debe ser un número válido.', 'Error de validación');
      return false;
    }
    if (typeof product.services !== 'number' || isNaN(product.services)) {
      this.toastr.error('El campo "Servicios" debe ser un número válido.', 'Error de validación');
      return false;
    }

    if (product.goals && product.goals.length === 4) {
      for (let i = 0; i < product.goals.length; i++) {
        const goal = product.goals[i];
        if (typeof goal.value !== 'number' || isNaN(goal.value)) {
          this.toastr.error(`La meta del trimestre ${i + 1} debe ser un número válido.`, 'Error de validación');
          return false;
        }
      }
    } else {
      this.toastr.error('Las metas de los trimestres no están completas.', 'Error de validación');
      return false;
    }

    return true;
  }
}
