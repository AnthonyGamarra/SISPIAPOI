export interface HealthOperationalActivitySummaryDTO {
  attentionLevel: string;
  idStrategicObjective: number;
  strategicObjectiveName: string;
  idStrategicAction: number;
  strategicActionName: string;
  activityFamilyName: string;
  measurementUnit: string;
  codCenSes: string;
  desCenSes: string;
  
  // Goals by quarter
  goalQ1: number;
  goalQ2: number;
  goalQ3: number;
  goalQ4: number;
  goalTotal: number;
  
  // Budget by quarter
  budgetQ1: number;
  budgetQ2: number;
  budgetQ3: number;
  budgetQ4: number;
  budgetTotal: number;

  idDependency?: number;
}
