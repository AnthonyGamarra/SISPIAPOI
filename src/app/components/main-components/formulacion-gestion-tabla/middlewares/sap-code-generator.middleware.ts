import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { OperationalActivity } from '../../../../models/logic/operationalActivity.model';
import { StrategicAction } from '../../../../models/logic/strategicAction.model';
import { StrategicObjective } from '../../../../models/logic/strategicObjective.model';
// cost center info removed from SAP code logic per new requirement
import { OperationalActivityService } from '../../../../core/services/logic/operational-activity.service';
// management center code should be passed directly from the component

@Injectable({
  providedIn: 'root'
})
export class SapCodeGeneratorMiddleware {

  constructor(
    private operationalActivityService: OperationalActivityService,
    private toastr: ToastrService
  ) {}

  generateSapCodeAndCorrelativeByFormulation(
    activity: OperationalActivity,
    strategicActions: StrategicAction[],
    strategicObjectives: StrategicObjective[],
    managementCenterCodeParam?: string
  ): Observable<{ sapCode: string, correlativeCode: string }> {
    const selectedStrategicAction = strategicActions.find(
      sa => sa.idStrategicAction == activity.strategicAction?.idStrategicAction
    );
    const strategicObjectiveCode = strategicObjectives.find(
      so => so.idStrategicObjective == selectedStrategicAction?.strategicObjective?.idStrategicObjective
    )?.code || '';
    const strategicActionCode = selectedStrategicAction?.code || '';

  // cost center removed from logic; management center lookup will determine the middle segment
    const formattedObjectiveCode = String(strategicObjectiveCode).padStart(1, '0');
    const formattedActionCode = String(strategicActionCode).padStart(2, '0');

    const idFormulation = activity.formulation?.idFormulation;

    if (!idFormulation) {
      this.toastr.error('ID de Formulación es nulo para generar código SAP.', 'Error');
      return of({ sapCode: '', correlativeCode: '' });
    }

    // --- NEW LOGIC: Check if activity already has a correlativeCode ---
    // We'll still prefer an existing correlative if present, but the management center code
    // must be resolved first. For existing correlative we can build a sapCode after fetching mc.
    if (activity.correlativeCode) {
      const existingCorrelativeCode = String(activity.correlativeCode).padStart(3, '0');
      const managementCenterCode = managementCenterCodeParam || '';
      const formattedMgmtCode = String(managementCenterCode).padStart(10, '0');
      const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedMgmtCode}${existingCorrelativeCode}`;
      return of({ sapCode: sapCode, correlativeCode: existingCorrelativeCode });
    }
    // --- END NEW LOGIC ---

    // Resolve managementCenterCode from provided managementCenters and then get next correlative
  const managementCenterCode = managementCenterCodeParam || '';
  const formattedMgmtCode = String(managementCenterCode).padStart(10, '0');

    return this.operationalActivityService.getHigherCorrelativeCodeByFormulation(idFormulation).pipe(
      map(correlativeCodeStr => {
        const currentCorrelative = parseInt(correlativeCodeStr, 10);
        const nextCorrelative = (isNaN(currentCorrelative) ? 0 : currentCorrelative) + 1;
        const formattedActivityId = String(nextCorrelative).padStart(3, '0');
        const sapCode = `${formattedObjectiveCode}${formattedActionCode}${formattedMgmtCode}${formattedActivityId}`;
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
