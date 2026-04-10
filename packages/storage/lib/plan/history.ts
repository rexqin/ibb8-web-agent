import { createStorage } from '../base/base';
import { StorageEnum } from '../base/enums';
import type { PlanHistoryStorage, PlanRun, PlanRunStatus, PlanSession, PlanSessionMetadata, PlanStep } from './types';

const PLAN_META_KEY = 'plan_sessions_meta';
const PLAN_RUNS_KEY = 'plan_runs';

const planMetaStorage = createStorage<PlanSessionMetadata[]>(PLAN_META_KEY, [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const planRunsStorage = createStorage<PlanRun[]>(PLAN_RUNS_KEY, [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const getPlanStepsKey = (planId: string) => `plan_steps_${planId}`;

const getPlanStepsStorage = (planId: string) =>
  createStorage<PlanStep[]>(getPlanStepsKey(planId), [], {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  });

const now = () => Date.now();

export function createPlanHistoryStorage(): PlanHistoryStorage {
  return {
    async getPlanMetadatas() {
      return planMetaStorage.get();
    },

    async getPlan(planId: string) {
      const metas = await planMetaStorage.get();
      const meta = metas.find(item => item.id === planId);
      if (!meta) return null;
      const steps = await getPlanStepsStorage(planId).get();
      return {
        ...meta,
        steps: [...steps].sort((a, b) => a.order - b.order),
      };
    },

    async createPlan(title = 'New Plan') {
      const id = crypto.randomUUID();
      const timestamp = now();
      const meta: PlanSessionMetadata = {
        id,
        title,
        createdAt: timestamp,
        updatedAt: timestamp,
        stepCount: 0,
      };
      await getPlanStepsStorage(id).set([]);
      await planMetaStorage.set(prev => [...prev, meta]);
      return {
        ...meta,
        steps: [],
      };
    },

    async savePlanSteps(planId: string, steps: PlanStep[]) {
      const metas = await planMetaStorage.get();
      const meta = metas.find(item => item.id === planId);
      if (!meta) throw new Error(`Plan with ID ${planId} not found`);

      const normalizedSteps = steps
        .map((step, index) => ({
          ...step,
          order: index,
        }))
        .sort((a, b) => a.order - b.order);

      await getPlanStepsStorage(planId).set(normalizedSteps);
      const updatedMeta: PlanSessionMetadata = {
        ...meta,
        updatedAt: now(),
        stepCount: normalizedSteps.length,
      };

      await planMetaStorage.set(prev => prev.map(item => (item.id === planId ? updatedMeta : item)));

      return {
        ...updatedMeta,
        steps: normalizedSteps,
      };
    },

    async updatePlanTitle(planId: string, title: string) {
      let updatedMeta: PlanSessionMetadata | undefined;
      await planMetaStorage.set(prev =>
        prev.map(item => {
          if (item.id !== planId) return item;
          updatedMeta = {
            ...item,
            title,
            updatedAt: now(),
          };
          return updatedMeta;
        }),
      );
      if (!updatedMeta) throw new Error(`Plan with ID ${planId} not found`);
      return updatedMeta;
    },

    async deletePlan(planId: string) {
      await planMetaStorage.set(prev => prev.filter(item => item.id !== planId));
      await getPlanStepsStorage(planId).set([]);
      await planRunsStorage.set(prev => prev.filter(item => item.planId !== planId));
    },

    async getPlanRuns(planId?: string) {
      const runs = await planRunsStorage.get();
      if (!planId) {
        return [...runs].sort((a, b) => b.startedAt - a.startedAt);
      }
      return runs.filter(item => item.planId === planId).sort((a, b) => b.startedAt - a.startedAt);
    },

    async startRun(planId: string, steps: PlanStep[]) {
      const newRun: PlanRun = {
        id: crypto.randomUUID(),
        planId,
        startedAt: now(),
        status: 'running',
        stepRuns: steps
          .sort((a, b) => a.order - b.order)
          .map(step => ({
            stepId: step.id,
            contentSnapshot: step.content,
            status: 'running',
            startedAt: 0,
          })),
      };
      await planRunsStorage.set(prev => [newRun, ...prev]);
      return newRun;
    },

    async setStepRunStarted(runId: string, stepId: string, taskSessionId?: string) {
      await planRunsStorage.set(prev =>
        prev.map(run => {
          if (run.id !== runId) return run;
          return {
            ...run,
            stepRuns: run.stepRuns.map(stepRun => {
              if (stepRun.stepId !== stepId) return stepRun;
              return {
                ...stepRun,
                startedAt: stepRun.startedAt || now(),
                taskSessionId: taskSessionId ?? stepRun.taskSessionId,
              };
            }),
          };
        }),
      );
    },

    async setStepRunFinished(runId: string, stepId: string, status: PlanRunStatus) {
      await planRunsStorage.set(prev =>
        prev.map(run => {
          if (run.id !== runId) return run;
          return {
            ...run,
            stepRuns: run.stepRuns.map(stepRun => {
              if (stepRun.stepId !== stepId) return stepRun;
              return {
                ...stepRun,
                status,
                endedAt: now(),
                startedAt: stepRun.startedAt || now(),
              };
            }),
          };
        }),
      );
    },

    async finishRun(runId: string, status: PlanRunStatus) {
      await planRunsStorage.set(prev =>
        prev.map(run => {
          if (run.id !== runId) return run;
          return {
            ...run,
            status,
            endedAt: now(),
          };
        }),
      );
    },
  };
}

export const planHistoryStore = createPlanHistoryStorage();
