export interface PlanStep {
  id: string;
  content: string;
  order: number;
}

export interface PlanSessionMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  stepCount: number;
}

export interface PlanSession extends PlanSessionMetadata {
  steps: PlanStep[];
}

export type PlanRunStatus = 'running' | 'ok' | 'fail' | 'cancel';

export interface PlanStepRun {
  stepId: string;
  contentSnapshot: string;
  status: PlanRunStatus;
  startedAt: number;
  endedAt?: number;
  taskSessionId?: string;
}

export interface PlanRun {
  id: string;
  planId: string;
  startedAt: number;
  endedAt?: number;
  status: PlanRunStatus;
  stepRuns: PlanStepRun[];
}

export interface PlanHistoryStorage {
  getPlanMetadatas: () => Promise<PlanSessionMetadata[]>;
  getPlan: (planId: string) => Promise<PlanSession | null>;
  createPlan: (title?: string) => Promise<PlanSession>;
  savePlanSteps: (planId: string, steps: PlanStep[]) => Promise<PlanSession>;
  updatePlanTitle: (planId: string, title: string) => Promise<PlanSessionMetadata>;
  deletePlan: (planId: string) => Promise<void>;

  getPlanRuns: (planId?: string) => Promise<PlanRun[]>;
  startRun: (planId: string, steps: PlanStep[]) => Promise<PlanRun>;
  setStepRunStarted: (runId: string, stepId: string, taskSessionId?: string) => Promise<void>;
  setStepRunFinished: (runId: string, stepId: string, status: PlanRunStatus) => Promise<void>;
  finishRun: (runId: string, status: PlanRunStatus) => Promise<void>;
}
