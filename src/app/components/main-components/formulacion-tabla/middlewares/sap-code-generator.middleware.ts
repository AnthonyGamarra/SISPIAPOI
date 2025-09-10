import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';
import { StrategicAction } from '../../../../models/logic/strategicAction.model';
import { StrategicObjective } from '../../../../models/logic/strategicObjective.model';
import { CostCenter } from '../../../../models/logic/costCenter.model';
import { OperationalActivityService } from '../../../../core/services/logic/operational-activity.service';

@Injectable({
  providedIn: 'root'
})
export class SapCodeGeneratorMiddleware {

  constructor(
    private operationalActivityService: OperationalActivityService,
    private toastr: ToastrService
  ) {}

  generateSapCodeAndCorrelative(
    activity: OperationalActivity,
    strategicActions: StrategicAction[],
    strategicObjectives: StrategicObjective[],
    costCenters: CostCenter[]
  ): Observable<{ sapCode: string, correlativeCode: string }> {
    const selectedStrategicAction = strategicActions.find(
      sa => sa.idStrategicAction == activity.strategicAction?.idStrategicAction
    );
    const strategicObjectiveCode = strategicObjectives.find(
      so => so.idStrategicObjective == selectedStrategicAction?.strategicObjective?.idStrategicObjective
    )?.code || '';
    const strategicActionCode = selectedStrategicAction?.code || '';

    const selectedCostCenter = costCenters.find(
      cc => cc.idCostCenter === activity.costCenter?.idCostCenter
    );
    const costCenterCode = selectedCostCenter?.costCenterCode || '';

    const formattedObjectiveCode = String(strategicObjectiveCode).padStart(1, '0');
    const formattedActionCode = String(strategicActionCode).padStart(2, '0');
    const formattedCostCenterCode = String(costCenterCode).padStart(10, '0');

    const idCostCenter = activity.costCenter?.idCostCenter;

    if (!idCostCenter) {
      this.toastr.error('ID de Centro de Costos es nulo para generar código SAP.', 'Error');
      return of({ sapCode: '', correlativeCode: '' });
    }

    // --- NEW LOGIC: Check if activity already has a correlativeCode ---
    if (activity.correlativeCode) {
      const existingCorrelativeCode = String(activity.correlativeCode).padStart(3, '0');
      const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedCostCenterCode}${existingCorrelativeCode}`;
      return of({ sapCode: sapCode, correlativeCode: existingCorrelativeCode });
    }
    // --- END NEW LOGIC ---

    return this.operationalActivityService.getHigherCorrelativeCodeByCostCenter(idCostCenter).pipe(
      map(correlativeCodeStr => {
        const currentCorrelative = parseInt(correlativeCodeStr, 10);
        const nextCorrelative = (isNaN(currentCorrelative) ? 0 : currentCorrelative) + 1;
        const formattedActivityId = String(nextCorrelative).padStart(3, '0');

        const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedCostCenterCode}${formattedActivityId}`;

        return { sapCode: sapCode, correlativeCode: formattedActivityId };
      }),
      catchError(err => {
        this.toastr.error('Error al obtener el código correlativo superior para el código SAP.', 'Error');
        console.error('Error fetching higher correlative code:', err);
        return of({ sapCode: '', correlativeCode: '' });
      })
    );
  }

  generateSapCodeAndCorrelativeByFormulation(
    activity: OperationalActivity,
    strategicActions: StrategicAction[],
    strategicObjectives: StrategicObjective[],
    costCenters: CostCenter[]
  ): Observable<{ sapCode: string, correlativeCode: string }> {
    const selectedStrategicAction = strategicActions.find(
      sa => sa.idStrategicAction == activity.strategicAction?.idStrategicAction
    );
    const strategicObjectiveCode = strategicObjectives.find(
      so => so.idStrategicObjective == selectedStrategicAction?.strategicObjective?.idStrategicObjective
    )?.code || '';
    const strategicActionCode = selectedStrategicAction?.code || '';

    const selectedCostCenter = costCenters.find(
      cc => cc.idCostCenter === activity.costCenter?.idCostCenter
    );
    const costCenterCode = selectedCostCenter?.costCenterCode || '';

    const formattedObjectiveCode = String(strategicObjectiveCode).padStart(1, '0');
    const formattedActionCode = String(strategicActionCode).padStart(2, '0');
    const formattedCostCenterCode = String(costCenterCode).padStart(10, '0');

    const idFormulation = activity.formulation?.idFormulation;

    if (!idFormulation) {
      this.toastr.error('ID de Formulación es nulo para generar código SAP.', 'Error');
      return of({ sapCode: '', correlativeCode: '' });
    }

    // --- NEW LOGIC: Check if activity already has a correlativeCode ---
    if (activity.correlativeCode) {
      const existingCorrelativeCode = String(activity.correlativeCode).padStart(3, '0');
      const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedCostCenterCode}${existingCorrelativeCode}`;
      return of({ sapCode: sapCode, correlativeCode: existingCorrelativeCode });
    }
    // --- END NEW LOGIC ---

    return this.operationalActivityService.getHigherCorrelativeCodeByFormulation(idFormulation).pipe(
      map(correlativeCodeStr => {
        const currentCorrelative = parseInt(correlativeCodeStr, 10);
        const nextCorrelative = (isNaN(currentCorrelative) ? 0 : currentCorrelative) + 1;
        const formattedActivityId = String(nextCorrelative).padStart(3, '0');

        const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedCostCenterCode}${formattedActivityId}`;

        return { sapCode: sapCode, correlativeCode: formattedActivityId };
      }),
      catchError(err => {
        this.toastr.error('Error al obtener el código correlativo superior por formulación para el código SAP.', 'Error');
        console.error('Error fetching higher correlative code by formulation:', err);
        return of({ sapCode: '', correlativeCode: '' });
      })
    );
  }
}
